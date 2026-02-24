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
      console.error("Fetch appointments error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Unexpected error in getAppointments:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
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
      console.error("Fetch resident appointments error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Unexpected error in getResidentAppointments:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Create new appointment
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

    // 1. Check if appointment already exists for this slot
    const { data: existingAppointments, error: checkError } = await supabase
      .from("appointments")
      .select("id")
      .eq("resident_id", formData.residentId)
      .eq("schedule_id", formData.scheduleId)
      .eq("time_slot", formData.timeSlot)
      .in("status", ["pending", "approved"]);

    if (checkError) {
      console.error("Check appointment error:", checkError);
      return { success: false, error: checkError.message };
    }

    if (existingAppointments && existingAppointments.length > 0) {
      return {
        success: false,
        error: "You already have an appointment for this time slot",
      };
    }

    // 2. Check if slot is still available
    const { data: schedule, error: scheduleError } = await supabase
      .from("schedules")
      .select("*")
      .eq("id", formData.scheduleId)
      .single();

    if (scheduleError || !schedule) {
      console.error("Schedule fetch error:", scheduleError);
      return { success: false, error: "Schedule not found" };
    }

    const isSlotAvailable =
      formData.timeSlot === "morning"
        ? schedule.morning_booked < schedule.morning_slots
        : schedule.afternoon_booked < schedule.afternoon_slots;

    if (!isSlotAvailable) {
      return { success: false, error: "This time slot is fully booked" };
    }

    // 3. Create appointment
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
      console.error("Create appointment error:", insertError);
      return { success: false, error: insertError.message };
    }

    // 4. Update schedule booked count
    // ✅ FIX #2: Type the updateData properly
    const updateData: Record<string, number> = {
      [formData.timeSlot === "morning" ? "morning_booked" : "afternoon_booked"]:
        (formData.timeSlot === "morning" ? schedule.morning_booked : schedule.afternoon_booked) + 1,
    };

    const { error: updateError } = await supabase
      .from("schedules")
      .update(updateData)
      .eq("id", formData.scheduleId);

    if (updateError) {
      console.error("Update schedule error:", updateError);
      return {
        success: false,
        error: "Appointment created but failed to update schedule",
      };
    }

    return {
      success: true,
      data: {
        message: "Appointment created successfully",
        appointment,
      },
    };
  } catch (error) {
    console.error("Unexpected error in createAppointment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Update appointment status (approve/reject/complete)
 */
export async function updateAppointmentStatus(
  appointmentId: number,
  status: "approved" | "rejected" | "completed",
  adminRemarks?: string
): Promise<AppointmentResult> {
  try {
    const supabase = createAdminClient();

    // Get current appointment to check status
    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .single();

    if (fetchError || !appointment) {
      return { success: false, error: "Appointment not found" };
    }

    // Update appointment
    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        status,
        admin_remarks: adminRemarks || null,
      })
      .eq("id", appointmentId);

    if (updateError) {
      console.error("Update appointment error:", updateError);
      return { success: false, error: updateError.message };
    }

    return {
      success: true,
      data: { message: `Appointment ${status} successfully` },
    };
  } catch (error) {
    console.error("Unexpected error in updateAppointmentStatus:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Cancel appointment (resident can only cancel pending)
 */
export async function cancelAppointment(
  appointmentId: number,
  residentId: number
): Promise<AppointmentResult> {
  try {
    const supabase = createAdminClient();

    // 1. Get appointment
    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("*")
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

    // 2. Update appointment status
    const { error: updateError } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId);

    if (updateError) {
      console.error("Cancel appointment error:", updateError);
      return { success: false, error: updateError.message };
    }

    // 3. Decrease schedule booked count
    // ✅ FIX #3: Type the updateData properly
    const updateColumn = appointment.time_slot === "morning" ? "morning_booked" : "afternoon_booked";
    
    const { data: schedule, error: scheduleError } = await supabase
      .from("schedules")
      .select(updateColumn)
      .eq("id", appointment.schedule_id)
      .single();

    if (!scheduleError && schedule) {
      const decrementData: Record<string, number> = {
        [updateColumn]: Math.max(0, (schedule as any)[updateColumn] - 1),
      };
      
      await supabase
        .from("schedules")
        .update(decrementData)
        .eq("id", appointment.schedule_id);
    }

    return { success: true, data: { message: "Appointment cancelled" } };
  } catch (error) {
    console.error("Unexpected error in cancelAppointment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

// ============================================
// DELETE APPOINTMENT (Admin only) - TWO STAGE WITH ARCHIVE
// ============================================
export async function deleteAppointment(
  appointmentId: number
): Promise<AppointmentResult> {
  try {
    const serverClient = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user: currentUser },
    } = await serverClient.auth.getUser();

    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

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

    const residentName = (appointment.residents as { name: string })?.name || "Unknown";
    const serviceName =
      (appointment.services as { service_name: string })?.service_name ||
      "Unknown Service";
    const scheduleDate = (appointment.schedules as { date: string })?.date || "Unknown";

    await archiveItem({
      type: "appointment",
      itemId: appointmentId,
      title: `${residentName} - ${serviceName}`,
      description: `Scheduled: ${scheduleDate} | Time Slot: ${appointment.time_slot} | Status: ${appointment.status}`,
      originalData: appointment as Record<string, unknown>,
      archivedBy: currentUser.id,
    });

    const { error: deleteError } = await adminClient
      .from("appointments")
      .delete()
      .eq("id", appointmentId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    const updateColumn =
      appointment.time_slot === "morning"
        ? "morning_booked"
        : "afternoon_booked";

    const { data: schedule, error: scheduleError } = await adminClient
      .from("schedules")
      .select(updateColumn)
      .eq("id", appointment.schedule_id)
      .single();

    if (!scheduleError && schedule) {
      const decrementData: Record<string, number> = {
        [updateColumn]: Math.max(0, (schedule as any)[updateColumn] - 1),
      };
      
      await adminClient
        .from("schedules")
        .update(decrementData)
        .eq("id", appointment.schedule_id);
    }

    revalidatePath("/admin/appointments");
    revalidatePath("/staff/appointments");
    revalidatePath("/resident/appointments");

    return { success: true, data: { error: undefined } }; // ✅ FIX #1: Changed from null to undefined
  } catch (error) {
    console.error("Error deleting appointment:", error);
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

    if (error) {
      console.error("Fetch services error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error in getServices:", error);
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

    if (error) {
      console.error("Fetch schedules error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error in getAvailableSchedules:", error);
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

    if (error) {
      console.error("Fetch stats error:", error);
      return { success: false, error: error.message };
    }

    const appointments = data || [];
    const stats = {
      total: appointments.length,
      pending: appointments.filter((a: any) => a.status === "pending").length,
      approved: appointments.filter((a: any) => a.status === "approved").length,
      completed: appointments.filter((a: any) => a.status === "completed").length,
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error("Unexpected error in getAppointmentsStats:", error);
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

    if (error) {
      console.error("Fetch upcoming error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Unexpected error in getUpcomingAppointments:", error);
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

    if (error) {
      console.error("Fetch pending error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Unexpected error in getPendingAppointments:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}