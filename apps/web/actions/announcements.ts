"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { archiveItem } from "@/utils/archive-helper";


export type AnnouncementResult = {
  success: boolean;
  error?: string;
  data?: unknown;
};

export type AnnouncementType = "info" | "warning" | "urgent";

/**
 * Get all announcements (for residents)
 */
export async function getAnnouncements(): Promise<AnnouncementResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch announcements error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Unexpected error in getAnnouncements:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Create announcement (admin/staff only)
 */
export async function createAnnouncement(formData: {
  title: string;
  content: string;
  type: AnnouncementType;
}): Promise<AnnouncementResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("announcements")
      .insert({
        title: formData.title,
        content: formData.content,
        type: formData.type,
      })
      .select()
      .single();

    if (error) {
      console.error("Create announcement error:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { message: "Announcement created successfully", announcement: data },
    };
  } catch (error) {
    console.error("Unexpected error in createAnnouncement:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Update announcement (admin/staff only)
 */
export async function updateAnnouncement(
  announcementId: number,
  formData: {
    title: string;
    content: string;
    type: AnnouncementType;
  }
): Promise<AnnouncementResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("announcements")
      .update({
        title: formData.title,
        content: formData.content,
        type: formData.type,
      })
      .eq("id", announcementId)
      .select()
      .single();

    if (error) {
      console.error("Update announcement error:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { message: "Announcement updated successfully", announcement: data },
    };
  } catch (error) {
    console.error("Unexpected error in updateAnnouncement:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Delete announcement (admin only) - TWO STAGE WITH ARCHIVE
 */
export async function deleteAnnouncement(
  announcementId: number
): Promise<AnnouncementResult> {
  try {
    const supabase = createAdminClient();

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Get announcement
    const { data: announcement, error: fetchError } = await supabase
      .from("announcements")
      .select("*")
      .eq("id", announcementId)
      .single();

    if (fetchError || !announcement) {
      return {
        success: false,
        error: fetchError?.message || "Announcement not found",
      };
    }

    // 2. Archive it
    await archiveItem({
      type: "announcement",
      itemId: announcementId,
      title: announcement.title,
      description: announcement.content?.substring(0, 100) || "",
      originalData: announcement as Record<string, unknown>,
      archivedBy: currentUser.id,
    });

    // 3. Delete from announcements table
    const { error: deleteError } = await supabase
      .from("announcements")
      .delete()
      .eq("id", announcementId);

    if (deleteError) {
      console.error("Delete announcement error:", deleteError);
      return { success: false, error: deleteError.message };
    }

    return { success: true, data: { message: "Announcement deleted" } };
  } catch (error) {
    console.error("Unexpected error in deleteAnnouncement:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Archive announcement (DEPRECATED - use deleteAnnouncement)
 */
export async function archiveAnnouncement(
  announcementId: number
): Promise<AnnouncementResult> {
  // Now just calls delete which archives first
  return deleteAnnouncement(announcementId);
}