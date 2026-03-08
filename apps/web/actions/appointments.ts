"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { archiveItem } from "@/utils/archive-helper";
import { revalidatePath } from "next/cache";

export type AppointmentResult = {
  success: boolean;
  error?: string;
  data?: unknown;
};

/**
 * Helper: get schedule booked/slots for a specific time_slot
 */
function slotColumns(timeSlot: "morning" | "afternoon") {
  return timeSlot === "morning"
    ? { bookedCol: "morning_booked", slotsCol: "morning_slots" }
    : { bookedCol: "afternoon_booked", slotsCol: "afternoon_slots" };
}

/**
 * Helper: safely increment/decrement schedule booked count
 * - This does NOT use SQL transactions (Supabase JS limitation),
 *   but it still protects you by checking availability before update.
 * - For perfect concurrency safety, use a DB RPC (I can give you that too).
 */
async function adjustScheduleBookedCount(params: {
  supabase: ReturnType<typeof createAdminClient>;
  scheduleId: number;
  timeSlot: "morning" | "afternoon";
  delta: 1 | -1;
}) {
  const { supabase, scheduleId, timeSlot, delta } = params;
  const { bookedCol, slotsCol } = slotColumns(timeSlot);

  const { data: schedule, error: schErr } = await supabase
    .from("schedules")
    .select(`id, ${bookedCol}, ${slotsCol}`)
    .eq("id", scheduleId)
    .single();

  if (schErr || !schedule) {
    return { ok: false as const, error: "Schedule not found" };
  }

  const booked = Number((schedule as any)[bookedCol] ?? 0);
  const slots = Number((schedule as any)[slotsCol] ?? 0);

  if (delta === 1) {
    if (booked >= slots) {
      return { ok: false as const, error: "This time slot is fully booked" };
    }
    const { error: upErr } = await supabase
      .from("schedules")
      .update({ [bookedCol]: booked + 1 })
      .eq("id", scheduleId);

    if (upErr) return { ok: false as const, error: upErr.message };
    return { ok: true as const };
  }

  // delta === -1
  const nextBooked = Math.max(0, booked - 1);
  const { error: downErr } = await supabase
    .from("schedules")
    .update({ [bookedCol]: nextBooked })
    .eq("id", scheduleId);

  if (downErr) return { ok: false as const, error: downErr.message };
  return { ok: true as const };
}

/**
 * Get all appointments (for admin/staff)
 */
export async function getAppointments(): Promise<AppointmentResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        id,
        resident_id,
        service_id,
        schedule_id,
        time_slot,
        status,
        purpose,
        admin_remarks,
        created_at,
        services(service_name),
        schedules(date),
        residents(
          id,
          name,
          phone_number,
          user_id,
          users(email)
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch appointments error");
      return { success: false, error: "Failed to fetch appointment" };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Unexpected error in get Appointments");
    return {
      success: false,
      error:
        error instanceof Error ? "Failed to get appointments" : "An unexpected error occurred",
    };
  }
}

/**
 * Get resident's own appointments
 */
export async function getResidentAppointments(
  residentId: number
): Promise<AppointmentResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        id,
        service_id,
        schedule_id,
        time_slot,
        status,
        purpose,
        admin_remarks,
        created_at,
        services(service_name),
        schedules(date)
      `
      )
      .eq("resident_id", residentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch resident appointments error");
      return { success: false, error: "Failed to fetch the resident appointments" };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Unexpected error in get Resident Appointments");
    return {
      success: false,
      error:
        error instanceof Error ? "Failed to fetch " : "An unexpected error occurred",
    };
  }
}

/**
 * Create new appointment (PENDING)
 * ✅ IMPORTANT CHANGE:
 * - We DO NOT increment schedules.booked here anymore.
 * - Booked count is adjusted ONLY on approval (and reversed on un-approve/cancel/delete if needed).
 * ✅ ALSO CHANGE:
 * - Block duplicate appointment for the same schedule_id (any time_slot) if pending/approved
 */
export async function createAppointment(formData: {
  residentId: number;
  serviceId: number;
  scheduleId: number;
  timeSlot: "morning" | "afternoon";
  purpose: string;
}): Promise<AppointmentResult> {
  try {
    const supabase = createAdminClient();

    // 1) Prevent duplicate appointment on the same schedule (pending/approved)
    const { data: existing, error: checkError } = await supabase
      .from("appointments")
      .select("id, status")
      .eq("resident_id", formData.residentId)
      .eq("schedule_id", formData.scheduleId)
      .in("status", ["pending", "approved"]);

    if (checkError) {
      console.error("Check appointment error");
      return { success: false, error: checkError.message };
    }

    if (existing && existing.length > 0) {
      return {
        success: false,
        error: "You already have an appointment for this schedule.",
      };
    }

    // 2) Create appointment as PENDING
    const { data: appointment, error: insertError } = await supabase
      .from("appointments")
      .insert({
        resident_id: formData.residentId,
        service_id: formData.serviceId,
        schedule_id: formData.scheduleId,
        time_slot: formData.timeSlot,
        purpose: formData.purpose,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Create appointment error");
      return { success: false, error: insertError.message };
    }

    // ✅ No schedule booked update here

    return {
      success: true,
      data: {
        message: "Appointment created successfully",
        appointment,
      },
    };
  } catch (error) {
    console.error("Unexpected error in create Appointment");
    return {
      success: false,
      error:
        error instanceof Error ? "Failed to create an appointments" : "An unexpected error occurred",
    };
  }
}

/**
 * Update appointment status (approve/reject/complete)
 * ✅ IMPORTANT CHANGE:
 * - When status becomes APPROVED from a non-approved state => increment schedule booked
 * - When status becomes REJECTED from APPROVED => decrement schedule booked
 * - When status becomes COMPLETED from APPROVED => keep booked as-is (still occupies slot historically)
 */
export async function updateAppointmentStatus(
  appointmentId: number,
  status: "approved" | "rejected" | "completed",
  adminRemarks?: string
): Promise<AppointmentResult> {
  try {
    const supabase = createAdminClient();

    // Fetch current appointment
    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("id, schedule_id, time_slot, status")
      .eq("id", appointmentId)
      .single();

    if (fetchError || !appointment) {
      return { success: false, error: "Appointment not found" };
    }

    const prevStatus = appointment.status as string;
    const scheduleId = Number(appointment.schedule_id);
    const timeSlot = appointment.time_slot as "morning" | "afternoon";

    // If approving: ensure slot still available, then increment booked
    if (status === "approved" && prevStatus !== "approved") {
      const adj = await adjustScheduleBookedCount({
        supabase,
        scheduleId,
        timeSlot,
        delta: 1,
      });
      if (!adj.ok) {
        return { success: false, error: adj.error };
      }
    }

    // If rejecting an already approved appointment: decrement booked
    if (status === "rejected" && prevStatus === "approved") {
      await adjustScheduleBookedCount({
        supabase,
        scheduleId,
        timeSlot,
        delta: -1,
      });
    }

    // Update appointment row
    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        status,
        admin_remarks: adminRemarks || null,
      })
      .eq("id", appointmentId);

    if (updateError) {
      console.error("Update appointment error");
      return { success: false, error: updateError.message };
    }

    // Keep your revalidations (adjust to your real routes)
    revalidatePath("/admin/appointment");
    revalidatePath("/staff/appointment");
    revalidatePath("/resident/my-appointment");
    revalidatePath("/admin/schedule");
    revalidatePath("/staff/schedule");

    return {
      success: true,
      data: { message: `Appointment ${status} successfully` },
    };
  } catch (error) {
    console.error("Unexpected error in update Appointment Status ");
    return {
      success: false,
      error:
        error instanceof Error ? "Failed to Update the appointment" : "An unexpected error occurred",
    };
  }
}

/**
 * Cancel appointment (resident)
 * ✅ IMPORTANT CHANGE:
 * - If cancelling PENDING => no schedule decrement (because it was never booked)
 * - If cancelling APPROVED => decrement schedule
 */
export async function cancelAppointment(
  appointmentId: number,
  residentId: number
): Promise<AppointmentResult> {
  try {
    const supabase = createAdminClient();

    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("id, resident_id, schedule_id, time_slot, status")
      .eq("id", appointmentId)
      .eq("resident_id", residentId)
      .single();

    if (fetchError || !appointment) {
      return { success: false, error: "Appointment not found" };
    }

    if (appointment.status !== "pending") {
      return {
        success: false,
        error: "Only pending appointments can be cancelled",
      };
    }

    const { error: updateError } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId);

    if (updateError) {
      console.error("Cancel appointment error");
      return { success: false, error: updateError.message };
    }


    return { success: true, data: { message: "Appointment cancelled" } };
  } catch (error) {
    console.error("Unexpected error in cancel Appointment");
    return {
      success: false,
      error:
        error instanceof Error ? "Failed to cancel appointments" : "An unexpected error occurred",
    };
  }
}

/**
 * Delete appointment (Admin only) - archive then delete
 * ✅ IMPORTANT CHANGE:
 * - If deleted appointment was APPROVED => decrement schedule booked
 * - If pending/rejected/cancelled => do nothing
 */
export async function deleteAppointment(
  appointmentId: number
): Promise<AppointmentResult> {
  try {
    const serverClient = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user: currentUser },
    } = await serverClient.auth.getUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const { data: appointment, error: fetchError } = await adminClient
      .from("appointments")
      .select(
        `
        *,
        residents (name),
        services (service_name),
        schedules (date)
      `
      )
      .eq("id", appointmentId)
      .single();

    if (fetchError || !appointment) {
      return {
        success: false,
        error: fetchError?.message || "Appointment not found",
      };
    }

    const residentName =
      (appointment.residents as { name: string })?.name || "Unknown";
    const serviceName =
      (appointment.services as { service_name: string })?.service_name ||
      "Unknown Service";
    const scheduleDate =
      (appointment.schedules as { date: string })?.date || "Unknown";

    await archiveItem({
      type: "appointment",
      itemId: appointmentId,
      title: `${residentName} - ${serviceName}`,
      description: `Scheduled: ${scheduleDate} | Time Slot: ${appointment.time_slot} | Status: ${appointment.status}`,
      originalData: appointment as Record<string, unknown>,
      archivedBy: currentUser.id,
    });

    // If appointment is approved, decrement schedule booked BEFORE delete (so we still have slot info)
    if (appointment.status === "approved") {
      await adjustScheduleBookedCount({
        supabase: adminClient,
        scheduleId: Number(appointment.schedule_id),
        timeSlot: appointment.time_slot as "morning" | "afternoon",
        delta: -1,
      });
    }

    const { error: deleteError } = await adminClient
      .from("appointments")
      .delete()
      .eq("id", appointmentId);

    if (deleteError) return { success: false, error: deleteError.message };

    revalidatePath("/admin/appointments");
    revalidatePath("/staff/appointments");
    revalidatePath("/resident/my-appointment");
    revalidatePath("/admin/schedule");
    revalidatePath("/staff/schedule");

    return { success: true, data: { error: undefined } };
  } catch (error) {
    console.error("Error deleting appointment");
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete appointment",
    };
  }
}

/**
 * Get services for booking
 */
export async function getServices(): Promise<AppointmentResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("service_name");

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error in getting Services:");
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get available schedules
 */
export async function getAvailableSchedules(): Promise<AppointmentResult> {
  try {
    const supabase = createAdminClient();
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .gte("date", today)
      .order("date", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error in getting available schedules");
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function getAppointmentsStats(): Promise<AppointmentResult> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("appointments")
      .select("status");
    if (error) return { success: false, error: error.message };

    const appointments = data || [];
    const stats = {
      total: appointments.length,
      pending: appointments.filter((a: any) => a.status === "pending").length,
      approved: appointments.filter((a: any) => a.status === "approved").length,
      completed: appointments.filter((a: any) => a.status === "completed")
        .length,
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error("Unexpected error in getting Appointments");
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function getUpcomingAppointments(): Promise<AppointmentResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        id,
        time_slot,
        status,
        services (service_name),
        residents (name),
        schedules (date)
      `
      )
      .in("status", ["approved", "pending"])
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Unexpected error in the upcoming appointments");
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function getPendingAppointments(): Promise<AppointmentResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        id,
        time_slot,
        status,
        services (service_name),
        residents (name),
        schedules (date)
      `
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Unexpected error in fetching pending Appointments");
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}