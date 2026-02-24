"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type AuthResult = {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
};

/**
 * Change password for currently authenticated resident
 */
export async function changePassword(
  newPassword: string
): Promise<AuthResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error("Change password error:", error);
      return {
        success: false,
        error: error.message || "Failed to change password",
      };
    }

    // If this is a resident account, mark temp-password flow as completed.
    const { data: userRecord } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (userRecord?.id) {
      await supabase
        .from("residents")
        .update({ must_change_password: false })
        .eq("user_id", userRecord.id);
    }

    return {
      success: true,
      data: { message: "Password changed successfully" },
    };
  } catch (error) {
    console.error("Unexpected error in changePassword:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Force change password for a resident (admin operation)
 * This is called when an admin-created resident needs to set their password
 */
export async function forceChangePassword(
  residentId: number,
  newPassword: string
): Promise<AuthResult> {
  try {
    if (!residentId || residentId <= 0) {
      return {
        success: false,
        error: "Invalid resident account. Please sign in again.",
      };
    }

    const supabase = createAdminClient();

    // 1. Get resident first to get user_id
    const { data: resident, error: residentError } = await supabase
      .from("residents")
      .select("user_id")
      .eq("id", residentId)
      .single();

    if (residentError || !resident) {
      console.error("Resident fetch error:", residentError);
      return {
        success: false,
        error: "Resident not found",
      };
    }

    // 2. Get the user record to get auth_id
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("auth_id, email")
      .eq("id", resident.user_id)
      .single();

    if (userError || !userRecord) {
      console.error("User fetch error:", userError);
      return {
        success: false,
        error: "User not found",
      };
    }

    if (!userRecord.auth_id) {
      console.error("Auth ID not found");
      return {
        success: false,
        error: "User auth ID not configured",
      };
    }

    // 3. Update the auth user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userRecord.auth_id,
      {
        password: newPassword,
      }
    );

    if (updateError) {
      console.error("Password update error:", updateError);
      return {
        success: false,
        error: updateError.message || "Failed to update password",
      };
    }

    // 4. Set must_change_password to false
    const { error: updateResidentError } = await supabase
      .from("residents")
      .update({ must_change_password: false })
      .eq("id", residentId);

    if (updateResidentError) {
      console.error("Resident update error:", updateResidentError);
      return {
        success: false,
        error: "Password changed but failed to update resident status",
      };
    }

    return {
      success: true,
      data: {
        message: "Password changed successfully",
      },
    };
  } catch (error) {
    console.error("Unexpected error in forceChangePassword:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
