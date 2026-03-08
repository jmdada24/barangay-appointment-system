"use server";

import { createAdminClient } from "@/utils/supabase/admin";

type ArchivedItemType =
  | "appointment"
  | "resident"
  | "announcement"
  | "feedback"
  | "schedule";

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
 */
export async function restoreFromArchive(
  type: string,
  originalData: Record<string, unknown>,
  supabase: any
) {
  try {
    const adminClient = createAdminClient();

    if (type === "resident") {
      const { id, created_at, users, updated_at, ...dataToRestore } = originalData;

      let resolvedUserId = dataToRestore.user_id as number | undefined;

      // users comes from archived nested select: users(auth_id, email)
      const archivedUser = users as
        | {
            auth_id?: string;
            email?: string;
          }
        | undefined;

      // 1. Check if referenced users row still exists
      let existingUser = null;

      if (resolvedUserId) {
        const { data } = await adminClient
          .from("users")
          .select("id")
          .eq("id", resolvedUserId)
          .maybeSingle();

        existingUser = data;
      }

      // 2. If missing, try to recover by auth_id
      if (!existingUser && archivedUser?.auth_id) {
        const { data } = await adminClient
          .from("users")
          .select("id")
          .eq("auth_id", archivedUser.auth_id)
          .maybeSingle();

        existingUser = data;
      }

      // 3. If still missing, recreate users row from archive snapshot
      if (!existingUser) {
        if (!archivedUser?.email) {
          throw new Error(
            "Cannot restore resident: archived user email is missing."
          );
        }

        const { data: recreatedUser, error: createUserError } = await adminClient
          .from("users")
          .insert({
            auth_id: archivedUser.auth_id || null,
            email: archivedUser.email,
            role: "resident",
          })
          .select("id")
          .single();

        if (createUserError || !recreatedUser) {
          throw new Error(
            `Cannot restore resident: failed to recreate linked user record. ${createUserError?.message || ""}`.trim()
          );
        }

        resolvedUserId = recreatedUser.id;
      } else {
        resolvedUserId = existingUser.id;
      }

      dataToRestore.user_id = resolvedUserId;

      const { error } = await supabase.from("residents").insert([dataToRestore]);

      if (error) throw error;
    } else if (type === "appointment") {
      const { id, created_at, residents, services, schedules, ...dataToRestore } =
        originalData;
      const residentId = dataToRestore.resident_id as number;
      const serviceId = dataToRestore.service_id as number;
      const scheduleId = dataToRestore.schedule_id as number;

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
          `Cannot restore appointment: Missing required references (resident: ${
            residentExists ? "✓" : "✗"
          }, service: ${serviceExists ? "✓" : "✗"}, schedule: ${
            scheduleExists ? "✓" : "✗"
          })`
        );
      }

      const { error } = await supabase.from("appointments").insert([dataToRestore]);

      if (error) throw error;
    } else if (type === "announcement") {
      const { id, created_at, posted_date, updated_at, ...dataToRestore } =
        originalData;

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
    } else if (type === "schedule") {
      const { id, created_at, ...dataToRestore } = originalData;

      const { error } = await supabase.from("schedules").insert([dataToRestore]);

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
  const { id, created_at, residents, services, schedules, ...dataToRestore } =
    originalData;

  const { error } = await supabase.from("appointments").insert([dataToRestore]);

  if (error) throw new Error(`Failed to restore appointment: ${error.message}`);
}

async function restoreAnnouncement(
  originalData: Record<string, unknown>,
  supabase: any
) {
  const { id, created_at, posted_date, updated_at, ...dataToRestore } =
    originalData;

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