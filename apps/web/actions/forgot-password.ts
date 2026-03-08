"use server";

import crypto from "node:crypto";
import nodemailer from "nodemailer";

import { createAdminClient } from "@/utils/supabase/admin";

export type ForgotPasswordResult = {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
};

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOTP(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function isStrongPassword(pw: string) {
  if (pw.length < 8) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  return true;
}

function createMailer() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP environment variables are missing.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

async function sendPasswordResetOtpEmail(email: string, otp: string) {
  const transporter = createMailer();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to: email,
    subject: "Password Reset Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 8px;">Password Reset Request</h2>
        <p style="margin: 0 0 16px;">
          We received a request to reset your password.
        </p>

        <p style="margin: 0 0 8px;">Your 6-digit verification code is:</p>

        <div style="
          display: inline-block;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 8px;
          background: #f3f4f6;
          padding: 12px 18px;
          border-radius: 10px;
          margin: 8px 0 16px;
        ">
          ${otp}
        </div>

        <p style="margin: 0 0 8px;">
          This code will expire in ${OTP_EXPIRY_MINUTES} minutes.
        </p>

        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          If you did not request this, you can ignore this email.
        </p>
      </div>
    `,
  });
}

async function findUserForPasswordReset(email: string) {
  const adminClient = createAdminClient();

  const { data: userRow, error: userRowError } = await adminClient
    .from("users")
    .select("id, auth_id, email, role")
    .eq("email", email)
    .maybeSingle();

  if (userRowError) {
    throw new Error(userRowError.message);
  }

  if (!userRow?.auth_id) {
    return null;
  }

  return userRow;
}

async function clearExistingActiveOtps(email: string) {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("password_reset_otps")
    .update({ used: true })
    .eq("email", email)
    .eq("used", false);

  if (error) {
    throw new Error(error.message);
  }
}

export async function requestPasswordReset(email: string): Promise<ForgotPasswordResult> {
  try {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      return {
        success: false,
        error: "Email address is required.",
      };
    }

    const userRow = await findUserForPasswordReset(cleanEmail);

    if (!userRow) {
      return {
        success: true,
        data: {
          email: cleanEmail,
          message: "If an account exists for this email, a verification code has been sent.",
        },
      };
    }

    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = addMinutes(new Date(), OTP_EXPIRY_MINUTES).toISOString();

    await clearExistingActiveOtps(cleanEmail);

    const adminClient = createAdminClient();

    const { error: insertError } = await adminClient
      .from("password_reset_otps")
      .insert({
        email: cleanEmail,
        otp_hash: otpHash,
        expires_at: expiresAt,
        verified: false,
        used: false,
      });

    if (insertError) {
      console.error("Insert password reset OTP error");
      return {
        success: false,
        error: insertError.message || "Failed to generate verification code.",
      };
    }

    try {
      await sendPasswordResetOtpEmail(cleanEmail, otp);
    } catch (mailError) {
      console.error("Send OTP email error");

      await adminClient
        .from("password_reset_otps")
        .update({ used: true })
        .eq("email", cleanEmail)
        .eq("used", false);

      return {
        success: false,
        error: "Failed to send verification code. Please try again.",
      };
    }

    return {
      success: true,
      data: {
        email: cleanEmail,
        message: "A verification code has been sent to your email.",
      },
    };
  } catch (error) {
    console.error("Unexpected error in Request PasswordReset");
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again.",
    };
  }
}

export async function verifyPasswordResetOtp(
  email: string,
  otp: string
): Promise<ForgotPasswordResult> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanEmail) {
      return {
        success: false,
        error: "Email is required.",
      };
    }

    if (!cleanOtp || cleanOtp.length !== OTP_LENGTH) {
      return {
        success: false,
        error: "Enter a valid 6-digit verification code.",
      };
    }

    const adminClient = createAdminClient();

    const { data: otpRow, error: otpError } = await adminClient
      .from("password_reset_otps")
      .select("id, email, otp_hash, expires_at, verified, used, created_at")
      .eq("email", cleanEmail)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      console.error("Verify OTP fetch error");
      return {
        success: false,
        error: otpError.message || "Failed to verify code.",
      };
    }

    if (!otpRow) {
      return {
        success: false,
        error: "No active verification code found. Please request a new one.",
      };
    }

    if (new Date(otpRow.expires_at) < new Date()) {
      return {
        success: false,
        error: "Verification code has expired. Please request a new one.",
      };
    }

    const submittedHash = hashOTP(cleanOtp);

    if (submittedHash !== otpRow.otp_hash) {
      return {
        success: false,
        error: "Invalid verification code.",
      };
    }

    const { error: updateError } = await adminClient
      .from("password_reset_otps")
      .update({ verified: true })
      .eq("id", otpRow.id);

    if (updateError) {
      console.error("Verify OTP update error");
      return {
        success: false,
        error: updateError.message || "Failed to verify code.",
      };
    }

    return {
      success: true,
      data: {
        email: cleanEmail,
        otp: cleanOtp,
        message: "Verification successful.",
      },
    };
  } catch (error) {
    console.error("Unexpected error in Verify Password Reset Otp");
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    };
  }
}

export async function resendPasswordResetOtp(email: string): Promise<ForgotPasswordResult> {
  try {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      return {
        success: false,
        error: "Email is required.",
      };
    }

    return await requestPasswordReset(cleanEmail);
  } catch (error) {
    console.error("Unexpected error in resend Password Reset Otp");
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to resend verification code.",
    };
  }
}

export async function resetPasswordWithOtp(
  email: string,
  otp: string,
  newPassword: string
): Promise<ForgotPasswordResult> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();
    const password = newPassword.trim();

    if (!cleanEmail) {
      return {
        success: false,
        error: "Email is required.",
      };
    }

    if (!cleanOtp || cleanOtp.length !== OTP_LENGTH) {
      return {
        success: false,
        error: "A valid 6-digit OTP is required.",
      };
    }

    if (!isStrongPassword(password)) {
      return {
        success: false,
        error:
          "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.",
      };
    }

    const adminClient = createAdminClient();

    const userRow = await findUserForPasswordReset(cleanEmail);

    if (!userRow?.auth_id) {
      return {
        success: false,
        error: "Account not found.",
      };
    }

    const { data: otpRow, error: otpError } = await adminClient
      .from("password_reset_otps")
      .select("id, email, otp_hash, expires_at, verified, used, created_at")
      .eq("email", cleanEmail)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      console.error("Reset password OTP fetch error:");
      return {
        success: false,
        error: otpError.message || "Failed to validate verification session.",
      };
    }

    if (!otpRow) {
      return {
        success: false,
        error: "No verified reset request found. Please request a new code.",
      };
    }

    if (new Date(otpRow.expires_at) < new Date()) {
      return {
        success: false,
        error: "Verification session has expired. Please request a new code.",
      };
    }

    if (!otpRow.verified) {
      return {
        success: false,
        error: "Please verify your OTP first.",
      };
    }

    const submittedHash = hashOTP(cleanOtp);

    if (submittedHash !== otpRow.otp_hash) {
      return {
        success: false,
        error: "Invalid verification code.",
      };
    }

    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(
      userRow.auth_id,
      {
        password,
      }
    );

    if (updateAuthError) {
      console.error("Admin password reset error");
      return {
        success: false,
        error: updateAuthError.message || "Failed to reset password.",
      };
    }

    const { error: otpUsedError } = await adminClient
      .from("password_reset_otps")
      .update({
        used: true,
      })
      .eq("id", otpRow.id);

    if (otpUsedError) {
      console.error("Mark OTP used error");
    }

    const { data: appUser } = await adminClient
      .from("users")
      .select("id")
      .eq("auth_id", userRow.auth_id)
      .maybeSingle();

    if (appUser?.id) {
      await adminClient
        .from("residents")
        .update({ must_change_password: false })
        .eq("user_id", appUser.id);
    }

    return {
      success: true,
      data: {
        email: cleanEmail,
        message: "Password has been reset successfully.",
      },
    };
  } catch (error) {
    console.error("Unexpected error in reset Password With Otp");
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    };
  }
}