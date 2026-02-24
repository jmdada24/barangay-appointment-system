"use server";

import { createAdminClient } from "@/utils/supabase/admin";

type ArchivedItemType = "appointment" | "resident" | "announcement" | "feedback";

interface ArchiveItemParams {
  type: ArchivedItemType;
  itemId: number;
  title: string;
  description: string;
  originalData: Record<string, unknown>;
  archivedBy: string;
}

export async function archiveItem(params: ArchiveItemParams) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("archive").insert({
    type: params.type,
    item_id: params.itemId,
    title: params.title,
    description: params.description,
    original_data: params.originalData,
    archived_by: params.archivedBy,
    archived_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to archive ${params.type}: ${error.message}`);
  }

  return { success: true };
}

/**
 * Restore an item from archive back to original table
 * ✅ FIXED: Check foreign keys exist before restoring
 */
export async function restoreFromArchive(
  type: string,
  originalData: Record<string, unknown>,
  supabase: any
) {
  try {
    const adminClient = createAdminClient();

    if (type === "resident") {
      // ✅ Check if user_id exists before restoring
      const { id, created_at, users, updated_at, ...dataToRestore } = originalData;
      const userId = dataToRestore.user_id as number;

      // Check if user exists
      const { data: userExists } = await adminClient
        .from("users")
        .select("id")
        .eq("id", userId)
        .single();

      if (!userExists) {
        throw new Error(
          `Cannot restore resident: User (ID: ${userId}) no longer exists. Please recreate the user account first.`
        );
      }

      const { error } = await supabase.from("residents").insert([dataToRestore]);

      if (error) throw error;
    } else if (type === "appointment") {
      const { id, created_at, residents, services, schedules, ...dataToRestore } = originalData;
      const residentId = dataToRestore.resident_id as number;
      const serviceId = dataToRestore.service_id as number;
      const scheduleId = dataToRestore.schedule_id as number;

      // ✅ Check all foreign keys exist
      const { data: residentExists } = await adminClient
        .from("residents")
        .select("id")
        .eq("id", residentId)
        .single();

      const { data: serviceExists } = await adminClient
        .from("services")
        .select("id")
        .eq("id", serviceId)
        .single();

      const { data: scheduleExists } = await adminClient
        .from("schedules")
        .select("id")
        .eq("id", scheduleId)
        .single();

      if (!residentExists || !serviceExists || !scheduleExists) {
        throw new Error(
          `Cannot restore appointment: Missing required references (resident: ${residentExists ? "✓" : "✗"}, service: ${serviceExists ? "✓" : "✗"}, schedule: ${scheduleExists ? "✓" : "✗"})`
        );
      }

      const { error } = await supabase.from("appointments").insert([dataToRestore]);

      if (error) throw error;
    } else if (type === "announcement") {
      const { id, created_at, posted_date, updated_at, ...dataToRestore } = originalData;

      const { error } = await supabase.from("announcements").insert([dataToRestore]);

      if (error) throw error;
    } else if (type === "feedback") {
      const {
        id,
        created_at,
        residents,
        appointments,
        submitted_at,
        is_archived,
        archived_at,
        archived_by,
        ...dataToRestore
      } = originalData;
      const residentId = dataToRestore.resident_id as number;
      const appointmentId = dataToRestore.appointment_id as number | null;

      // ✅ Check resident exists
      const { data: residentExists } = await adminClient
        .from("residents")
        .select("id")
        .eq("id", residentId)
        .single();

      if (!residentExists) {
        throw new Error(
          `Cannot restore feedback: Resident (ID: ${residentId}) no longer exists.`
        );
      }

      // Check appointment if specified
      if (appointmentId) {
        const { data: appointmentExists } = await adminClient
          .from("appointments")
          .select("id")
          .eq("id", appointmentId)
          .single();

        if (!appointmentExists) {
          console.warn(
            `Warning: Appointment (ID: ${appointmentId}) no longer exists. Feedback will be restored without appointment reference.`
          );
          dataToRestore.appointment_id = null;
        }
      }

      const { error } = await supabase.from("feedback").insert([dataToRestore]);

      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error(`Error restoring ${type}:`, error);
    throw error;
  }
}

// ============================================
// RESTORE HELPERS (deprecated - kept for reference)
// ============================================

async function restoreResident(
  originalData: Record<string, unknown>,
  supabase: any
) {
  const { id, created_at, users, updated_at, ...dataToRestore } = originalData;

  const { error } = await supabase.from("residents").insert([dataToRestore]);

  if (error) throw new Error(`Failed to restore resident: ${error.message}`);
}

async function restoreAppointment(
  originalData: Record<string, unknown>,
  supabase: any
) {
  const { id, created_at, residents, services, schedules, ...dataToRestore } = originalData;

  const { error } = await supabase.from("appointments").insert([dataToRestore]);

  if (error) throw new Error(`Failed to restore appointment: ${error.message}`);
}

async function restoreAnnouncement(
  originalData: Record<string, unknown>,
  supabase: any
) {
  const { id, created_at, posted_date, updated_at, ...dataToRestore } = originalData;

  const { error } = await supabase.from("announcements").insert([dataToRestore]);

  if (error) throw new Error(`Failed to restore announcement: ${error.message}`);
}

async function restoreFeedback(
  originalData: Record<string, unknown>,
  supabase: any
) {
  const {
    id,
    created_at,
    residents,
    appointments,
    submitted_at,
    is_archived,
    archived_at,
    archived_by,
    ...dataToRestore
  } = originalData;

  const { error } = await supabase.from("feedback").insert([dataToRestore]);

  if (error) throw new Error(`Failed to restore feedback: ${error.message}`);
}