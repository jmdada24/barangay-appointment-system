"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { restoreFromArchive } from "@/utils/archive-helper";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const serverClient = await createClient();
  const adminClient = createAdminClient();

  // ✅ FIX: Use serverClient to get the authenticated user
  const {
    data: { user },
    error: userError,
  } = await serverClient.auth.getUser();

  if (userError || !user) return { ok: false as const, error: "Unauthorized" };

  // ✅ Use adminClient to check role in database
  const { data: row, error: roleError } = await adminClient
    .from("users")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  if (roleError) return { ok: false as const, error: "Role check failed" };
  if (row?.role !== "admin") return { ok: false as const, error: "Forbidden" };

  return { ok: true as const, supabase: adminClient, user };
}

export async function getArchivedItems() {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  // ✅ FIX: Don't try to join with users table, just fetch archive data
  // We'll get the admin email from archived_by field (UUID) on the client side
  const { data, error } = await gate.supabase
    .from("archive")
    .select("*")
    .order("archived_at", { ascending: false });

  if (error) return { success: false, error: error.message };

  // ✅ FIX: Get admin details for each archived item
  const enrichedData = await Promise.all(
    (data || []).map(async (item) => {
      // Get the admin user record using archived_by (auth_id)
      const { data: adminUser } = await gate.supabase
        .from("users")
        .select("email")
        .eq("auth_id", item.archived_by)
        .single();

      return {
        ...item,
        archivedByEmail: adminUser?.email || "Unknown",
      };
    })
  );

  return { success: true, data: enrichedData };
}

/**
 * Restore an archived item back to its original table
 */
export async function restoreArchivedItem(archivedId: number) {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    // 1. Get archive record to know the type and original data
    const { data: archiveRecord, error: fetchError } = await gate.supabase
      .from("archive")
      .select("*")
      .eq("id", archivedId)
      .single();

    if (fetchError || !archiveRecord) {
      return { success: false, error: "Archive record not found" };
    }

    // 2. Restore using helper function (passes supabase client)
    await restoreFromArchive(
      archiveRecord.type,
      archiveRecord.original_data,
      gate.supabase
    );

    // 3. Remove from archive
    const { error: deleteError } = await gate.supabase
      .from("archive")
      .delete()
      .eq("id", archivedId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    // 4. Revalidate affected pages
    revalidatePath("/admin/residents");
    revalidatePath("/admin/appointments");
    revalidatePath("/admin/announcements");
    revalidatePath("/admin/feedback");
    revalidatePath("/admin/archive");

    return { success: true };
  } catch (error) {
    console.error("Error restoring archived item:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to restore item",
    };
  }
}

/**
 * Permanently delete from archive (second stage delete)
 */
export async function deleteArchivedItem(archivedId: number) {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    const { error } = await gate.supabase
      .from("archive")
      .delete()
      .eq("id", archivedId);

    if (error) return { success: false, error: error.message };

    // Revalidate archive page
    revalidatePath("/admin/archive");

    return { success: true };
  } catch (error) {
    console.error("Error deleting archived item:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete item",
    };
  }
}