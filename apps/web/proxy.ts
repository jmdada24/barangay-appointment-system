import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
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
  const isVerifyOtpRoute = pathname === "/verify-otp";
  const isRegisterRoute = pathname === "/register";
  const isLoginRoute = pathname === "/";
  const isAdminLoginRoute = pathname === "/admin/login";

  if (isVerifyOtpRoute) {
    const email = request.nextUrl.searchParams.get("email");
    
    if (!email) {
      return NextResponse.redirect(new URL("/register", request.url));
    }

    if (user) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("auth_id", user.id)
        .single();

      if (userData) {
        const redirectPath = userData.role === "admin" ? "/admin" : 
                            userData.role === "staff" ? "/staff" : "/resident";
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }

    return supabaseResponse;
  }

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

  if (!userData) {
    if (isAdminRoute || isStaffRoute || isResidentRoute) {
      return NextResponse.redirect(new URL("/?error=incomplete_registration", request.url));
    }
    
    return supabaseResponse;
  }

  const role = userData.role;

  if (isAdminRoute && role !== "admin") {
    const redirectPath = role === "staff" ? "/staff" : "/resident";
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  if (isStaffRoute && role !== "admin" && role !== "staff") {
    return NextResponse.redirect(new URL("/resident", request.url));
  }

  if (isLoginRoute || isRegisterRoute || isAdminLoginRoute) {
    const redirectPath = role === "admin" ? "/admin" : role === "staff" ? "/staff" : "/resident";
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};