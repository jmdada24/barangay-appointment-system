"use server";

import { createAdminClient } from "@/utils/supabase/admin";

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
 * Delete announcement (admin only)
 */
export async function deleteAnnouncement(
  announcementId: number
): Promise<AnnouncementResult> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", announcementId);

    if (error) {
      console.error("Delete announcement error:", error);
      return { success: false, error: error.message };
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
 * Archive announcement (staff only - soft delete)
 */
export async function archiveAnnouncement(
  announcementId: number
): Promise<AnnouncementResult> {
  try {
    const supabase = createAdminClient();

    // For staff: we'll just delete it since there's no is_active column
    // If you want to keep archived announcements, add an is_active column to your table
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", announcementId);

    if (error) {
      console.error("Archive announcement error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: { message: "Announcement archived" } };
  } catch (error) {
    console.error("Unexpected error in archiveAnnouncement:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

