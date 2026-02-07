"use server";

import { createClient } from "@/utils/supabase/server";

export async function getArchivedItems() {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("archive")
      .select("*")
      .order("archived_at", { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching archived items:", error);
    return { success: false, error: "Failed to fetch archived items" };
  }
}

export async function archiveItem(
  type: string,
  itemId: number,
  title: string,
  description: string,
  originalData: Record<string, unknown>,
  archivedBy: string
) {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("archive")
      .insert({
        type,
        item_id: itemId,
        title,
        description,
        original_data: originalData,
        archived_by: archivedBy,
        archived_at: new Date().toISOString(),
      })
      .select();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error("Error archiving item:", error);
    return { success: false, error: "Failed to archive item" };
  }
}

export async function restoreArchivedItem(archivedId: string) {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from("archive")
      .delete()
      .eq("id", archivedId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error restoring item:", error);
    return { success: false, error: "Failed to restore item" };
  }
}

export async function deleteArchivedItem(archivedId: string) {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from("archive")
      .delete()
      .eq("id", archivedId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error deleting archived item:", error);
    return { success: false, error: "Failed to delete item" };
  }
}