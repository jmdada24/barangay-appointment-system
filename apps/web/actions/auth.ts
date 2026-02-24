"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type AuthResult = {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
};

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function registerResident(formData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  address: string;
  contactNumber: string;
  sex: "male" | "female";
  dob: string;
  validIdPath?: string;
}): Promise<AuthResult> {
  try {
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch (e) {
      return { success: false, error: "Server configuration error. Please contact support." };
    }

    const { data: existingUser, error: checkError } = await adminClient
      .from("users")
      .select("id")
      .eq("email", formData.email)
      .maybeSingle();

    if (checkError) {
      return { success: false, error: "Failed to check existing account." };
    }

    if (existingUser) {
      return { success: false, error: "An account with this email already exists." };
    }

    const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      return { success: false, error: "Failed to verify email availability." };
    }

    const existingAuthUser = authUsers?.users?.find((u) => u.email === formData.email);

    if (existingAuthUser) {
      if (!existingAuthUser.email_confirmed_at) {
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(existingAuthUser.id);
        if (deleteError) {
          return { success: false, error: "Failed to reset incomplete registration." };
        }
      } else {
        return { success: false, error: "An account with this email already exists." };
      }
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: false,
      user_metadata: {
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: `${formData.firstName} ${formData.lastName}`,
        address: formData.address,
        contact_number: formData.contactNumber,
        sex: formData.sex,
        dob: formData.dob,
        valid_id_path: formData.validIdPath || null,
        otp_code: otp,
        otp_expiry: otpExpiry,
      },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create user account." };
    }

    try {
      const supabase = await createClient();
      await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          shouldCreateUser: false,
        },
      });
    } catch (e) {
      
    }

    return {
      success: true,
      data: { 
        email: formData.email,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Registration failed. Please try again.",
    };
  }
}

export async function verifyOtpAndCreateProfile(
  email: string,
  otpCode: string
): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: "email",
    });

    let user = verifyData?.user;

    if (verifyError || !user) {
      const { data: authUsers } = await adminClient.auth.admin.listUsers();
      const authUser = authUsers?.users?.find((u) => u.email === email);

      if (!authUser) {
        return { success: false, error: "No registration found for this email." };
      }

      const metadata = authUser.user_metadata || {};
      const storedOtp = metadata.otp_code;
      const otpExpiry = metadata.otp_expiry;

      if (!storedOtp || storedOtp !== otpCode) {
        return { success: false, error: "Invalid verification code." };
      }

      if (otpExpiry && new Date(otpExpiry) < new Date()) {
        return { success: false, error: "Verification code has expired. Please request a new one." };
      }

      const { data: updatedUser, error: confirmError } = await adminClient.auth.admin.updateUserById(
        authUser.id,
        {
          email_confirm: true,
          user_metadata: {
            ...metadata,
            otp_code: null,
            otp_expiry: null,
            email_verified: true,
          },
        }
      );

      if (confirmError) {
        return { success: false, error: "Failed to verify email." };
      }

      user = updatedUser.user;
    }

    if (!user) {
      return { success: false, error: "Verification failed. Please try again." };
    }

    const metadata = user.user_metadata || {};

    const { data: existingUserRecord } = await adminClient
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (existingUserRecord) {
      await supabase.auth.signOut();
      return { success: true, data: { userId: existingUserRecord.id } };
    }

    const { data: newUser, error: userError } = await adminClient
      .from("users")
      .insert({
        auth_id: user.id,
        email: email,
        role: "resident",
      })
      .select("id")
      .single();

    if (userError) {
      return { success: false, error: "Failed to create user profile." };
    }

    const { error: residentError } = await adminClient.from("residents").insert({
      user_id: newUser.id,
      name: metadata.full_name || `${metadata.first_name || ""} ${metadata.last_name || ""}`.trim() || "Unknown",
      address: metadata.address || null,
      phone_number: metadata.contact_number || null,
      sex: metadata.sex || null,
      birthdate: metadata.dob || null,
      valid_id_url: metadata.valid_id_path || null,
      verification_status: "pending",
      must_change_password: false,
    });

    if (residentError) {
      await adminClient.from("users").delete().eq("id", newUser.id);
      return { success: false, error: "Failed to create resident profile." };
    }

    await supabase.auth.signOut();

    return { success: true, data: { userId: newUser.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Verification failed.",
    };
  }
}

export async function resendOtp(email: string): Promise<AuthResult> {
  if (!email) {
    return { success: false, error: "Email is required." };
  }

  try {
    const adminClient = createAdminClient();

    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const authUser = authUsers?.users?.find((u) => u.email === email);

    if (!authUser) {
      return { success: false, error: "No registration found for this email." };
    }

    if (authUser.email_confirmed_at) {
      return { success: false, error: "Email is already verified. Please login." };
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await adminClient.auth.admin.updateUserById(authUser.id, {
      user_metadata: {
        ...authUser.user_metadata,
        otp_code: otp,
        otp_expiry: otpExpiry,
      },
    });

    try {
      const supabase = await createClient();
      await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
    } catch (e) {
    }

    return { 
      success: true,
      data: { email },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to resend code.",
    };
  }
}

export async function checkVerificationStatus(email: string): Promise<AuthResult> {
  try {
    const adminClient = createAdminClient();

    const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers();

    if (listError) {
      return { success: false, error: "Failed to check status." };
    }

    const authUser = authUsers?.users?.find((u) => u.email === email);

    if (!authUser) {
      return {
        success: false,
        error: "No registration found for this email.",
        data: { status: "not_found" },
      };
    }

    if (authUser.email_confirmed_at) {
      const { data: userRecord } = await adminClient
        .from("users")
        .select("id")
        .eq("auth_id", authUser.id)
        .maybeSingle();

      return {
        success: true,
        data: { status: "verified", hasProfile: !!userRecord },
      };
    }

    return {
      success: true,
      data: { status: "pending_verification" },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to check status.",
    };
  }
}

export async function uploadValidId(formData: FormData): Promise<AuthResult> {
  try {
    const adminClient = createAdminClient();
    const file = formData.get("file") as File;

    if (!file) {
      return { success: false, error: "No file provided." };
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `valid-ids/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await adminClient.storage
      .from("documents")
      .upload(filePath, uint8Array, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    return { success: true, data: { path: filePath } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed.",
    };
  }
}