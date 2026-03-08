import { supabase } from "@/lib/supabase/client";

export type PasswordResult = {
  success: boolean;
  error?: string;
};

function isStrongPassword(pw: string) {
  if (pw.length < 8) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  return true;
}

/**
 * Resident changes temporary password after login.
 * Secure mobile version:
 * 1) Update Supabase Auth password using the current logged-in session
 * 2) Attempt to set residents.must_change_password = false using normal authenticated access
 *
 * IMPORTANT:
 * - No service role key is used here
 * - No admin client is created in the mobile app
 */
export async function forceChangePasswordMobile(newPassword: string): Promise<PasswordResult> {
  try {
    const pw = newPassword.trim();

    if (!isStrongPassword(pw)) {
      return {
        success: false,
        error:
          "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.",
      };
    }

    const { data: userRes, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userRes?.user) {
      return { success: false, error: "Not authenticated. Please sign in again." };
    }

    const authUser = userRes.user;

    const { error: pwErr } = await supabase.auth.updateUser({ password: pw });

    if (pwErr) {
      return {
        success: false,
        error: pwErr.message || "Failed to change password.",
      };
    }

    const { data: userRow, error: userRowErr } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", authUser.id)
      .single();

    if (userRowErr || !userRow?.id) {
      return {
        success: false,
        error: "Password changed, but failed to load account information.",
      };
    }

    const { error: residentErr } = await supabase
      .from("residents")
      .update({ must_change_password: false })
      .eq("user_id", userRow.id);

    if (residentErr) {
      return {
        success: false,
        error:
          "Password changed, but failed to update account status. Please contact support.",
      };
    }

    return { success: true };
  } catch (e: any) {
    return {
      success: false,
      error: e?.message ?? "Something went wrong.",
    };
  }
}