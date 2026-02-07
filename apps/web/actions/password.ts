"use server";

import { createAdminClient } from "@/utils/supabase/admin";

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
    const supabase = createAdminClient();

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error("Change password error:", error);
      return {
        success: false,
        error: error.message || "Failed to change password",
      };
    }

    return {
      success: true,
      data: { user: data.user },
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
    const supabase = createAdminClient();

    // 1. Get resident and their associated user
    const { data: resident, error: residentError } = await supabase
      .from("residents")
      .select("users:user_id(id, auth_id, email)")
      .eq("id", residentId)
      .single();

    if (residentError || !resident) {
      console.error("Resident fetch error:", residentError);
      return {
        success: false,
        error: "Resident not found",
      };
    }

    const residentUser = resident.users as unknown as {
      id: number;
      auth_id: string;
      email: string;
    };

    if (!residentUser?.auth_id) {
      console.error("Resident user auth_id not found");
      return {
        success: false,
        error: "Resident user not properly configured",
      };
    }

    // 2. Update the auth user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      residentUser.auth_id,
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

    // 3. Set must_change_password to false
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
        email: residentUser.email,
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