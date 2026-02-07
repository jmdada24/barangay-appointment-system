import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/resident";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      
      // Get user role to redirect appropriately
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("auth_id", data.user.id)
        .single();

      if (userData) {
        const redirectPath =
          userData.role === "admin"
            ? "/admin"
            : userData.role === "staff"
              ? "/staff"
              : "/resident";
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_error`);
}