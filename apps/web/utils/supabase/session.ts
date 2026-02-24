import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isAdminRoute = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  const isStaffRoute = pathname.startsWith("/staff");
  const isResidentRoute = pathname.startsWith("/resident");
  const isAuthRoute = pathname === "/";
  
  if (!user) {
    if (isAdminRoute || isStaffRoute) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (isResidentRoute) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return supabaseResponse;
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  const role = userData?.role || "resident";

  if (isAdminRoute && role !== "admin") {
    const redirectPath = role === "staff" ? "/staff" : "/resident";
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  if (isStaffRoute && role !== "admin" && role !== "staff") {
    return NextResponse.redirect(new URL("/resident", request.url));
  }

  if (isAuthRoute || pathname === "/admin/login") {
    const redirectPath = role === "admin" ? "/admin" : role === "staff" ? "/staff" : "/resident";
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return supabaseResponse;
}