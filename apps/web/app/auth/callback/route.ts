import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  // After OAuth, send to dashboard
  return NextResponse.redirect(new URL("/dashboard", url.origin));
}
