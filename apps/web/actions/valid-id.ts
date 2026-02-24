"use server";

import { createClient } from "@/utils/supabase/server";

export type UploadResult = {
  success: boolean;
  error?: string;
  data?: { path: string; url: string };
};

/**
 * Upload valid ID to valid-ids bucket
 */
export async function uploadValidId(
  formData: FormData
): Promise<UploadResult> {
  try {
    const file = formData.get("file") as File | null;

    if (!file) {
      return {
        success: false,
        error: "No file provided",
      };
    }

    

    // Validate file type
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      return {
        success: false,
        error: "Invalid file type. Please upload a JPEG, PNG, or WebP image.",
      };
    }

    // Validate file size (max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "File size exceeds 5MB limit.",
      };
    }

    const supabase = await createClient();

    // Generate filename with timestamp
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;


    // Upload to valid-ids bucket
    const { data, error } = await supabase.storage
      .from("valid-ids")
      .upload(filename, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      

      return {
        success: false,
        error: `Upload failed: ${error.message}`,
      };
    }


    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("valid-ids").getPublicUrl(filename);


    return {
      success: true,
      data: {
        path: data.path,
        url: publicUrl,
      },
    };
  } catch (error) {

    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred during upload.",
    };
  }
}

// Keep old functions for backward compatibility if needed
export async function uploadValidID(file: File, residentId: number) {
  const supabase = await createClient();
  const filename = `${residentId}-${Date.now()}.${file.name.split(".").pop()}`;

  const { data, error } = await supabase.storage
    .from("valid-ids")
    .upload(filename, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload valid ID: ${error.message}`);
  }

  const { data: publicData } = supabase.storage
    .from("valid-ids")
    .getPublicUrl(filename);

  return {
    filename: data.path,
    url: publicData.publicUrl,
  };
}

export async function updateResidentValidID(residentId: number, validIDUrl: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("residents")
    .update({ valid_id_url: validIDUrl, verification_status: "pending" })
    .eq("id", residentId);

  if (error) {
    throw new Error(`Failed to update resident: ${error.message}`);
  }

  return { success: true };
}