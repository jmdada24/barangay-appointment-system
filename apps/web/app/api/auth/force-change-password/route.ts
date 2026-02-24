import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

type RequestBody = {
  newPassword?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const newPassword = body.newPassword?.trim();

    if (!newPassword) {
      return NextResponse.json(
        { success: false, error: "New password is required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    // Update auth password using admin client for reliability.
    const { error: updatePasswordError } = await admin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updatePasswordError) {
      return NextResponse.json(
        { success: false, error: updatePasswordError.message },
        { status: 400 }
      );
    }

    // Mark temporary-password requirement as complete.
    const { data: userRecord, error: userRecordError } = await admin
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (userRecordError || !userRecord) {
      return NextResponse.json(
        { success: false, error: "User record not found." },
        { status: 404 }
      );
    }

    const { error: residentUpdateError } = await admin
      .from("residents")
      .update({ must_change_password: false })
      .eq("user_id", userRecord.id);

    if (residentUpdateError) {
      return NextResponse.json(
        {
          success: false,
          error: "Password changed but failed to update account status.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: "Password changed successfully." },
    });
  } catch (error) {
    console.error("force-change-password API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}
