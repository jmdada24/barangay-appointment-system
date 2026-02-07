"use server";

import { createAdminClient } from "@/utils/supabase/admin";

export type FeedbackResult = {
  success: boolean;
  error?: string;
  data?: unknown;
};

export type FeedbackCategory =
  | "General Feedback"
  | "Service Quality"
  | "Staff Assistance"
  | "Facility Condition"
  | "Appointment Process"
  | "Suggestions"
  | "Complaints"
  | "Others";

/**
 * Get all feedback (admin/staff only)
 */
export async function getFeedback(): Promise<FeedbackResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("feedback")
      .select(
        `
        id,
        rating,
        category,
        comments,
        submitted_at,
        residents (
          id,
          name,
          users (
            email
          )
        )
      `
      )
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Fetch feedback error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Unexpected error in getFeedback:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Submit feedback (residents)
 */
export async function submitFeedback(
  residentId: number,
  formData: {
    rating: number;
    category: FeedbackCategory;
    content: string;
  }
): Promise<FeedbackResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("feedback")
      .insert({
        resident_id: residentId,
        rating: formData.rating,
        category: formData.category,
        comments: formData.content,
      })
      .select()
      .single();

    if (error) {
      console.error("Submit feedback error:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { message: "Feedback submitted successfully", feedback: data },
    };
  } catch (error) {
    console.error("Unexpected error in submitFeedback:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Delete feedback (admin only)
 */
export async function deleteFeedback(feedbackId: number): Promise<FeedbackResult> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("feedback")
      .delete()
      .eq("id", feedbackId);

    if (error) {
      console.error("Delete feedback error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: { message: "Feedback deleted" } };
  } catch (error) {
    console.error("Unexpected error in deleteFeedback:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Archive feedback (staff only)
 */
export async function archiveFeedback(feedbackId: number): Promise<FeedbackResult> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("feedback")
      .delete()
      .eq("id", feedbackId);

    if (error) {
      console.error("Archive feedback error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: { message: "Feedback archived" } };
  } catch (error) {
    console.error("Unexpected error in archiveFeedback:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}