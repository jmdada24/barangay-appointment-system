"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import type { CreateResidentInput, UpdateResidentInput, ResidentWithUser, VerificationStatus } from "@/types/resident";

import { archiveItem } from "@/utils/archive-helper";


// ============================================
// FETCH ALL RESIDENTS
// ============================================
export async function getResidents() {
  const supabase = createAdminClient(); // Use admin client to bypass RLS

  const { data, error } = await supabase
    .from("residents")
    .select(`
      *,
      users (
        email,
        auth_id
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching residents:", error);
    return { data: null, error: error.message };
  }

  return { data: data as ResidentWithUser[], error: null };
}

// ============================================
// FETCH SINGLE RESIDENT
// ============================================
export async function getResident(id: number) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("residents")
    .select(`
      *,
      users (
        email,
        auth_id
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching resident:", error);
    return { data: null, error: error.message };
  }

  return { data: data as ResidentWithUser, error: null };
}

// ============================================
// CREATE RESIDENT (Admin/Staff creates a new resident)
// ============================================
export async function createResident(input: CreateResidentInput) {
  const supabase = createAdminClient();

  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true, // Auto-confirm since admin is creating
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      return { data: null, error: authError.message };
    }

    // 2. Create user record
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert({
        auth_id: authData.user.id,
        email: input.email,
        role: "resident",
      })
      .select()
      .single();

    if (userError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      console.error("Error creating user record:", userError);
      return { data: null, error: userError.message };
    }

    // 3. Create resident profile with must_change_password = true
    const { data: residentData, error: residentError } = await supabase
      .from("residents")
      .insert({
        user_id: userData.id,
        name: input.name,
        address: input.address || null,
        phone_number: input.phone_number || null,
        birthdate: input.birthdate || null,
        valid_id_url: input.valid_id_url || null,
        face_photo_url: input.face_photo_url,
        sex: input.sex || null,
        verification_status: "verified", // Auto-verify when admin creates
        must_change_password: true, // Force password change on first login
      })
      .select()
      .single();

    if (residentError) {
      await supabase.from("users").delete().eq("id", userData.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      console.error("Error creating resident:", residentError);
      return { data: null, error: residentError.message };
    }

    revalidatePath("/admin/resident");
    revalidatePath("/staff/resident");

    return { data: residentData, error: null };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { data: null, error: "An unexpected error occurred" };
  }
}

// ============================================
// UPDATE RESIDENT
// ============================================
export async function updateResident(
  id: number,
  input: Partial<UpdateResidentInput>
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("residents")
    .update({
      name: input.name,
      address: input.address,
      phone_number: input.phone_number,
      birthdate: input.birthdate,
      sex: input.sex,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating resident:", error);
    return { data: null, error: error.message };
  }

  revalidatePath("/admin/resident");
  revalidatePath("/staff/resident");

  return { data, error: null };
}

export async function updateResidentFacePhoto(
  residentId: number,
  facePhotoUrl: string,
  resetVerification: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      face_photo_url: facePhotoUrl,
    };

    // Reset verification status to pending if requested
    if (resetVerification) {
      updateData.verification_status = "pending";
    }

    const { error } = await supabase
      .from("residents")
      .update(updateData)
      .eq("id", residentId);

    if (error) {
      console.error("Update error:", error);
      return {
        success: false,
        error: "Failed to update resident face photo",
      };
    }

    revalidatePath("/admin/resident");
    revalidatePath("/staff/resident");

    return { success: true };
  } catch (error) {
    console.error("Update resident face photo error:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}




// ============================================
// UPDATE VERIFICATION STATUS
// ============================================
export async function updateVerificationStatus(
  id: number,
  status: "verified" | "pending" | "rejected"
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("residents")
    .update({ verification_status: status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating verification status:", error);
    return { data: null, error: error.message };
  }

  revalidatePath("/admin/resident");
  revalidatePath("/staff/resident");

  return { data, error: null };
}

// ============================================
// DELETE RESIDENT (Admin only) - TWO STAGE WITH ARCHIVE
// ============================================
export async function deleteResident(id: number) {
  const serverClient = await createClient();
  const adminClient = createAdminClient();

  // ✅ FIX: Use serverClient to get the authenticated user
  const {
    data: { user: currentUser },
  } = await serverClient.auth.getUser();

  if (!currentUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Use adminClient for database operations
    const { data: resident, error: fetchError } = await adminClient
      .from("residents")
      .select(
        `
        *,
        users (
          auth_id,
          email
        )
      `
      )
      .eq("id", id)
      .single();

    if (fetchError || !resident) {
      return {
        success: false,
        error: fetchError?.message || "Resident not found",
      };
    }

    const authId = (resident.users as { auth_id: string })?.auth_id;

    // 2. Archive the resident before deletion
    await archiveItem({
      type: "resident",
      itemId: id,
      title: resident.name,
      description: `Address: ${resident.address || "N/A"} | Phone: ${resident.phone_number || "N/A"}`,
      originalData: resident as Record<string, unknown>,
      archivedBy: currentUser.id,
    });

    // 3. Delete resident (cascades to appointments, feedback)
    const { error: residentError } = await adminClient
      .from("residents")
      .delete()
      .eq("id", id);

    if (residentError) {
      return { success: false, error: residentError.message };
    }

    // 4. Delete user record
    if (resident.user_id) {
      await adminClient.from("users").delete().eq("id", resident.user_id);
    }

    // 5. Delete auth user
    if (authId) {
      await adminClient.auth.admin.deleteUser(authId);
    }

    revalidatePath("/admin/resident");
    revalidatePath("/staff/resident");

    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting resident:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete resident",
    };
  }
}

// ============================================
// ARCHIVE RESIDENT (DEPRECATED - use deleteResident)
// ============================================
export async function archiveResident(id: number) {
  // Now just calls delete which archives first
  return deleteResident(id);
}

// ============================================
// GET RESIDENT STATS
// ============================================
export async function getResidentStats() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("residents")
    .select("verification_status");

  if (error) {
    return { total: 0, verified: 0, pending: 0, rejected: 0 };
  }

  const total = data.length;
  const verified = data.filter((r) => r.verification_status === "verified").length;
  const pending = data.filter((r) => r.verification_status === "pending").length;
  const rejected = data.filter((r) => r.verification_status === "rejected").length;

  return { total, verified, pending, rejected };
}

export async function clearPasswordChangeFlag(residentId: number) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("residents")
    .update({ must_change_password: false })
    .eq("id", residentId);

  if (error) {
    console.error("Error clearing password change flag:", error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}


export async function getCurrentResident(authId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("residents")
    .select(`
      *,
      users!inner (
        auth_id,
        email
      )
    `)
    .eq("users.auth_id", authId)
    .single();

  if (error) {
    console.error("Error fetching current resident:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}







