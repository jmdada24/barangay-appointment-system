"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export type ForgotPasswordResult = {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
};

/**
 * Request password reset for a resident
 */
export async function requestPasswordReset(
  email: string
): Promise<ForgotPasswordResult> {
  try {
    if (!email || !email.trim()) {
      return {
        success: false,
        error: "Email address is required.",
      };
    }

    const supabase = await createClient();

    // Send password reset email via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/reset-password`,
    });

    if (error) {
      console.error("Password reset email error:", error);
      return {
        success: false,
        error: error.message || "Failed to send reset email. Please try again.",
      };
    }

    return {
      success: true,
      data: {
        message: "Password reset link has been sent to your email. Please check your inbox.",
      },
    };
  } catch (error) {
    console.error("Unexpected error in requestPasswordReset:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Reset password with token from email
 */
export async function resetPassword(
  newPassword: string,
  token: string
): Promise<ForgotPasswordResult> {
  try {
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        error: "Password must be at least 8 characters long.",
      };
    }

    if (!token || !token.trim()) {
      return {
        success: false,
        error: "Reset token is missing. Please use the link from your email.",
      };
    }

    const supabase = await createClient();

    // Verify the token and update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error("Password update error:", error);
      return {
        success: false,
        error: error.message || "Failed to update password.",
      };
    }

    return {
      success: true,
      data: {
        message: "Password has been reset successfully. You can now log in with your new password.",
      },
    };
  } catch (error) {
    console.error("Unexpected error in resetPassword:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    };
  }
}