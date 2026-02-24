"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { archiveItem } from "@/utils/archive-helper"; 

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
  | "Feedback"; 


/**
 * Get all feedback (admin/staff only)
 */
export async function getFeedback(): Promise<FeedbackResult> {
  try {
    // ✅ FIX: Use server client for authentication
    const serverClient = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await serverClient.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // ✅ Use admin client for data fetching
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("feedback")
      .select(
        `
        id,
        rating,
        category,
        comments,
        individual_ratings,
        appointment_id,
        submitted_at,
        residents (
          id,
          name,
          users (
            email
          )
        ),
        appointments (
          id,
          status,
          schedules (
            date
          )
        )
      `
      )
      .eq("is_archived", false)
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
 * Submit feedback (residents) - UPDATED with individual ratings
 */
export async function submitFeedback(
  residentId: number,
  formData: {
    rating: number;
    category?: FeedbackCategory;
    content: string;
    appointmentId?: number;
    individualRatings?: Record<number, number>;
  }
): Promise<FeedbackResult> {
  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("feedback")
      .insert({
        resident_id: residentId,
        rating: formData.rating,
        category: formData.category || "Feedback",
        comments: formData.content,
        appointment_id: formData.appointmentId || null,
        individual_ratings: formData.individualRatings || null,
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
 * Archive feedback (soft delete - for staff/admin)
 */
export async function archiveFeedback(feedbackId: number): Promise<FeedbackResult> {
  try {
    // ✅ FIX: Check authentication first
    const serverClient = await createClient();
    
    const { data: { user: currentUser }, error: authError } = await serverClient.auth.getUser();

    if (authError || !currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const adminClient = createAdminClient();

    // 1. Get feedback with resident info
    const { data: feedback, error: fetchError } = await adminClient
      .from("feedback")
      .select(
        `
        *,
        residents (name)
      `
      )
      .eq("id", feedbackId)
      .single();

    if (fetchError || !feedback) {
      return {
        success: false,
        error: fetchError?.message || "Feedback not found",
      };
    }

    const residentName = (feedback.residents as { name: string })?.name || "Unknown";

    // 2. Archive to archive table (before soft delete)
    await archiveItem({
      type: "feedback",
      itemId: feedbackId,
      title: `Feedback from ${residentName}`,
      description: `Rating: ${feedback.rating}/5 | Category: ${feedback.category}`,
      originalData: feedback as Record<string, unknown>,
      archivedBy: currentUser.id,
    });

    // 3. Mark as archived in feedback table (soft delete)
    const { error: updateError } = await adminClient
      .from("feedback")
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: currentUser.id,
      })
      .eq("id", feedbackId);

    if (updateError) {
      console.error("Archive feedback error:", updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true, data: { message: "Feedback archived successfully" } };
  } catch (error) {
    console.error("Unexpected error in archiveFeedback:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}


/**
 * Delete feedback (hard delete - for admin only)
 */
export async function deleteFeedback(feedbackId: number): Promise<FeedbackResult> {
  try {
    // ✅ FIX: Check authentication first
    const serverClient = await createClient();
    
    const { data: { user: currentUser }, error: authError } = await serverClient.auth.getUser();

    if (authError || !currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const adminClient = createAdminClient();

    // 1. Get feedback with resident info
    const { data: feedback, error: fetchError } = await adminClient
      .from("feedback")
      .select(
        `
        *,
        residents (name)
      `
      )
      .eq("id", feedbackId)
      .single();

    if (fetchError || !feedback) {
      return {
        success: false,
        error: fetchError?.message || "Feedback not found",
      };
    }

    const residentName = (feedback.residents as { name: string })?.name || "Unknown";

    // 2. Archive it (permanent record)
    await archiveItem({
      type: "feedback",
      itemId: feedbackId,
      title: `Feedback from ${residentName}`,
      description: `Rating: ${feedback.rating}/5 | Category: ${feedback.category} | DELETED`,
      originalData: feedback as Record<string, unknown>,
      archivedBy: currentUser.id,
    });

    // 3. Hard delete from feedback table
    const { error: deleteError } = await adminClient
      .from("feedback")
      .delete()
      .eq("id", feedbackId);

    if (deleteError) {
      console.error("Delete feedback error:", deleteError);
      return { success: false, error: deleteError.message };
    }

    return { success: true, data: { message: "Feedback deleted successfully" } };
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
 * Get feedback statistics
 */
export async function getFeedbackStats(): Promise<FeedbackResult> {
  try {
    // ✅ FIX: Check authentication first
    const serverClient = await createClient();
    
    const { data: { user }, error: authError } = await serverClient.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("feedback")
      .select("rating, category")
      .eq("is_archived", false);

    if (error) {
      return { success: false, error: error.message };
    }

    const stats = {
      totalFeedback: data?.length || 0,
      averageRating: data && data.length > 0
        ? (data.reduce((sum, f) => sum + f.rating, 0) / data.length).toFixed(2)
        : 0,
      categoryBreakdown: data?.reduce((acc: Record<string, number>, f) => {
        acc[f.category] = (acc[f.category] || 0) + 1;
        return acc;
      }, {}),
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error("Unexpected error in getFeedbackStats:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}


export async function checkFeedbackExists(
  appointmentId: number
): Promise<{ success: boolean; exists: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("feedback")
      .select("id")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    if (error) {
      return { success: false, exists: false, error: error.message };
    }

    return { success: true, exists: !!data };
  } catch (err) {
    return {
      success: false,
      exists: false,
      error: err instanceof Error ? err.message : "An error occurred",
    };
  }
}

