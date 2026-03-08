import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { SessionManager } from "@/lib/session.manager";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `${origin}/?error=${encodeURIComponent(error)}&description=${encodeURIComponent(
          error_description || ""
        )}`,
        request.url
      )
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL(`${origin}/?error=auth_error`, request.url));
  }

  try {
    const supabase = await createClient();

    const { error: exchangeError, data } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data?.user) {
      return NextResponse.redirect(
        new URL(`${origin}/?error=exchange_failed`, request.url)
      );
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("auth_id", data.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.redirect(
        new URL(`${origin}/?error=profile_not_found`, request.url)
      );
    }

    const userRole = userData.role as "admin" | "staff" | "resident";

    const { token } = await SessionManager.createSession(
      data.user.id,
      userRole,
      request
    );

    const redirectPath =
      userRole === "admin"
        ? "/admin"
        : userRole === "staff"
          ? "/staff"
          : "/resident";

    const response = NextResponse.redirect(new URL(`${origin}${redirectPath}`, request.url));

    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch {
    console.error("Auth callback error");
    return NextResponse.redirect(
      new URL(`${origin}/?error=auth_error`, request.url)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Code is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error: exchangeError, data } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication failed" },
        { status: 400 }
      );
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("auth_id", data.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 400 }
      );
    }

    const userRole = userData.role as "admin" | "staff" | "resident";
    const { token } = await SessionManager.createSession(
      data.user.id,
      userRole,
      request
    );

    const response = NextResponse.json({
      success: true,
      role: userRole,
    });

    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Auth callback POST error");
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}