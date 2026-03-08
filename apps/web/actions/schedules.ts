"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { archiveItem } from "@/utils/archive-helper";

type UserRole = "admin" | "staff";

export type ScheduleResult = {
  success: boolean;
  data?: unknown;
  error?: string | null;
};

async function requireRole(allowedRoles: UserRole[]) {
  const serverClient = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
    error: userError,
  } = await serverClient.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const { data: roleRow, error: roleError } = await adminClient
    .from("users")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  if (roleError) {
    return { ok: false as const, error: "Role check failed" };
  }

  if (!roleRow?.role || !allowedRoles.includes(roleRow.role as UserRole)) {
    return { ok: false as const, error: "Forbidden" };
  }

  return {
    ok: true as const,
    user,
    supabase: adminClient,
    role: roleRow.role as UserRole,
  };
}

function normalizeDateOnly(date: string) {
  return new Date(date).toISOString().split("T")[0];
}

async function getScheduleWithUsageCheck(
  supabase: ReturnType<typeof createAdminClient>,
  id: number
) {
  const { data: schedule, error: scheduleError } = await supabase
    .from("schedules")
    .select("*")
    .eq("id", id)
    .single();

  if (scheduleError || !schedule) {
    return {
      ok: false as const,
      error: scheduleError?.message || "Schedule not found.",
    };
  }

  const { data: relatedAppointments, error: relatedError } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("schedule_id", id);

  if (relatedError) {
    return {
      ok: false as const,
      error: relatedError.message,
    };
  }

  return {
    ok: true as const,
    schedule,
    relatedAppointments: relatedAppointments ?? [],
  };
}

export async function getSchedules(): Promise<ScheduleResult> {
  try {
    const gate = await requireRole(["admin", "staff"]);
    if (!gate.ok) {
      return { success: false, data: null, error: gate.error };
    }

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await gate.supabase
      .from("schedules")
      .select("*")
      .gte("date", today)
      .order("date", { ascending: true });

    if (error) {
      console.error("Error fetching schedules");
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data: data ?? [], error: null };
  } catch (error) {
    console.error("Unexpected error in getSchedules");
    return {
      success: false,
      data: null,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function addSchedule(
  date: string,
  morningSlots: number,
  afternoonSlots: number
): Promise<ScheduleResult> {
  try {
    const gate = await requireRole(["admin", "staff"]);
    if (!gate.ok) {
      return { success: false, data: null, error: gate.error };
    }

    const normalizedDate = normalizeDateOnly(date);

    if (morningSlots < 0 || afternoonSlots < 0) {
      return {
        success: false,
        data: null,
        error: "Slot values cannot be negative.",
      };
    }

    const { data: existingSchedule, error: existingError } = await gate.supabase
      .from("schedules")
      .select("id")
      .eq("date", normalizedDate)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing schedule");
      return { success: false, data: null, error: existingError.message };
    }

    if (existingSchedule) {
      return {
        success: false,
        data: null,
        error: "A schedule for this date already exists.",
      };
    }

    const { data, error } = await gate.supabase
      .from("schedules")
      .insert([
        {
          date: normalizedDate,
          morning_slots: morningSlots,
          afternoon_slots: afternoonSlots,
          morning_booked: 0,
          afternoon_booked: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error adding schedule");
      return { success: false, data: null, error: error.message };
    }

    revalidatePath("/admin/schedule");
    revalidatePath("/staff/schedule");
    revalidatePath("/admin/appointment");
    revalidatePath("/staff/appointment");

    return { success: true, data, error: null };
  } catch (error) {
    console.error("Unexpected error in addSchedule");
    return {
      success: false,
      data: null,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function updateSchedule(
  id: number,
  morningSlots: number,
  afternoonSlots: number
): Promise<ScheduleResult> {
  try {
    const gate = await requireRole(["admin", "staff"]);
    if (!gate.ok) {
      return { success: false, data: null, error: gate.error };
    }

    if (morningSlots < 0 || afternoonSlots < 0) {
      return {
        success: false,
        data: null,
        error: "Slot values cannot be negative.",
      };
    }

    const { data: currentSchedule, error: fetchError } = await gate.supabase
      .from("schedules")
      .select("id, morning_booked, afternoon_booked")
      .eq("id", id)
      .single();

    if (fetchError || !currentSchedule) {
      return {
        success: false,
        data: null,
        error: fetchError?.message || "Schedule not found.",
      };
    }

    const morningBooked = Number(currentSchedule.morning_booked ?? 0);
    const afternoonBooked = Number(currentSchedule.afternoon_booked ?? 0);

    if (morningSlots < morningBooked) {
      return {
        success: false,
        data: null,
        error: `Morning slots cannot be less than currently booked (${morningBooked}).`,
      };
    }

    if (afternoonSlots < afternoonBooked) {
      return {
        success: false,
        data: null,
        error: `Afternoon slots cannot be less than currently booked (${afternoonBooked}).`,
      };
    }

    const { data, error } = await gate.supabase
      .from("schedules")
      .update({
        morning_slots: morningSlots,
        afternoon_slots: afternoonSlots,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating schedule");
      return { success: false, data: null, error: error.message };
    }

    revalidatePath("/admin/schedule");
    revalidatePath("/staff/schedule");
    revalidatePath("/admin/appointment");
    revalidatePath("/staff/appointment");

    return { success: true, data, error: null };
  } catch (error) {
    console.error("Unexpected error in update schedule");
    return {
      success: false,
      data: null,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Admin hard delete
 * Still backs up the schedule into archive first.
 * Blocked if the schedule already has any related appointments.
 */
export async function deleteSchedule(id: number): Promise<ScheduleResult> {
  try {
    const gate = await requireRole(["admin"]);
    if (!gate.ok) {
      return { success: false, error: gate.error };
    }

    const check = await getScheduleWithUsageCheck(gate.supabase, id);
    if (!check.ok) {
      return { success: false, error: check.error };
    }

    const { schedule, relatedAppointments } = check;

    if (relatedAppointments.length > 0) {
      return {
        success: false,
        error:
          "Cannot delete this schedule because it already has related appointments.",
      };
    }

    await archiveItem({
      type: "schedule",
      itemId: schedule.id,
      title: `Schedule - ${schedule.date}`,
      description: `Morning: ${schedule.morning_booked}/${schedule.morning_slots}, Afternoon: ${schedule.afternoon_booked}/${schedule.afternoon_slots}`,
      originalData: schedule as Record<string, unknown>,
      archivedBy: gate.user.id,
    });

    const { error } = await gate.supabase.from("schedules").delete().eq("id", id);

    if (error) {
      console.error("Error deleting schedule");
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/schedule");
    revalidatePath("/staff/schedule");
    revalidatePath("/admin/appointment");
    revalidatePath("/staff/appointment");
    revalidatePath("/admin/archive");

    return { success: true, error: null };
  } catch (error) {
    console.error("Unexpected error in delete Schedule");
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Staff/admin archive-style remove
 * Backs up into archive table first, then removes from schedules.
 * Blocked if the schedule already has any related appointments.
 */
export async function archiveSchedule(id: number): Promise<ScheduleResult> {
  try {
    const gate = await requireRole(["admin", "staff"]);
    if (!gate.ok) {
      return { success: false, error: gate.error };
    }

    const check = await getScheduleWithUsageCheck(gate.supabase, id);
    if (!check.ok) {
      return { success: false, error: check.error };
    }

    const { schedule, relatedAppointments } = check;

    if (relatedAppointments.length > 0) {
      return {
        success: false,
        error:
          "Cannot archive this schedule because it already has related appointments.",
      };
    }

    await archiveItem({
      type: "schedule",
      itemId: schedule.id,
      title: `Schedule - ${schedule.date}`,
      description: `Morning: ${schedule.morning_booked}/${schedule.morning_slots}, Afternoon: ${schedule.afternoon_booked}/${schedule.afternoon_slots}`,
      originalData: schedule as Record<string, unknown>,
      archivedBy: gate.user.id,
    });

    const { error } = await gate.supabase.from("schedules").delete().eq("id", id);

    if (error) {
      console.error("Error archiving schedule");
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/schedule");
    revalidatePath("/staff/schedule");
    revalidatePath("/admin/appointment");
    revalidatePath("/staff/appointment");
    revalidatePath("/admin/archive");

    return {
      success: true,
      error: null,
      data: { message: "Schedule archived successfully." },
    };
  } catch (error) {
    console.error("Unexpected error in archive schedule");
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}