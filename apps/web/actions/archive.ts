"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { restoreFromArchive } from "@/utils/archive-helper";

async function requireAdmin() {
  const serverClient = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
    error: userError,
  } = await serverClient.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const { data: row, error: roleError } = await adminClient
    .from("users")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  if (roleError) {
    return { ok: false as const, error: "Role check failed" };
  }

  if (row?.role !== "admin") {
    return { ok: false as const, error: "Forbidden" };
  }

  return { ok: true as const, supabase: adminClient, user };
}

export async function getArchivedItems() {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const { data, error } = await gate.supabase
    .from("archive")
    .select("*")
    .order("archived_at", { ascending: false });

  if (error) return { success: false, error: error.message };

  const archivedByIds = Array.from(
    new Set((data ?? []).map((item) => item.archived_by).filter(Boolean))
  );

  let adminMap = new Map<string, string>();

  if (archivedByIds.length > 0) {
    const { data: adminUsers } = await gate.supabase
      .from("users")
      .select("auth_id, email")
      .in("auth_id", archivedByIds);

    adminMap = new Map(
      (adminUsers ?? []).map((u) => [String(u.auth_id), u.email ?? "Unknown"])
    );
  }

  const enrichedData = (data ?? []).map((item) => ({
    ...item,
    archivedByEmail: adminMap.get(String(item.archived_by)) ?? "Unknown",
  }));

  return { success: true, data: enrichedData };
}

/**
 * Restore an archived item back to its original table.
 */
export async function restoreArchivedItem(archivedId: number) {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    const { data: archiveRecord, error: fetchError } = await gate.supabase
      .from("archive")
      .select("*")
      .eq("id", archivedId)
      .single();

    if (fetchError || !archiveRecord) {
      return { success: false, error: "Archive record not found" };
    }

    await restoreFromArchive(
      archiveRecord.type,
      archiveRecord.original_data,
      gate.supabase
    );

    const { error: deleteError } = await gate.supabase
      .from("archive")
      .delete()
      .eq("id", archivedId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    // Revalidate all admin pages that can be affected
    revalidatePath("/admin/resident");
    revalidatePath("/admin/appointment");
    revalidatePath("/admin/announcement");
    revalidatePath("/admin/feedback");
    revalidatePath("/admin/schedule");
    revalidatePath("/admin/archive");

    return { success: true };
  } catch (error) {
    console.error("Error restoring archived item");
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to restore item",
    };
  }
}

/**
 * Permanently delete from archive only.
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

    revalidatePath("/admin/archive");

    return { success: true };
  } catch (error) {
    console.error("Error deleting archived item");
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete item",
    };
  }
}