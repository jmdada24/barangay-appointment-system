"use client";

import Image from "next/image";
import { useState } from "react";
// import { supabase } from "@/lib/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function AuthLanding() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) setError(error.message);
    else {
      // later: redirect to dashboard
      // window.location.href = "/dashboard";
    }
  }

  async function onGoogle() {
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) setError(error.message);
  }

  return (

    <div className="min-h-screen grid lg:grid-cols-2">
      {/* LEFT */}
      <div className="hidden lg:flex flex-col items-center justify-center px-12 bg-emerald-950 text-white">
        {/* Logo placeholder (swap with your logo file in /public later) */}
        <div className="mb-8">
          {/* If you already have logo, put it in apps/web/public/logo.png and use it */}
          {/* <Image src="/logo.png" alt="Barangay Logo" width={140} height={140} /> */}
          <div className="h-36 w-36 rounded-full bg-white/10 flex items-center justify-center text-sm">
            Logo
          </div>
        </div>


        <h1 className="text-3xl font-semibold text-center leading-tight">
          Welcome to Barangay Bayabas
          <br />
          Appointment System
        </h1>

        <p className="mt-6 max-w-lg text-center text-white/80 text-sm leading-relaxed">
          This is the official online platform for Barangay Bayabas, Matina,
          Davao City — providing convenient access to essential barangay services,
          announcements, and common transactions.
        </p>

        <p className="mt-6 max-w-lg text-center text-white/80 text-sm leading-relaxed">
          Request Barangay Clearance, Certificates (Residency, Indigency, Good
          Moral, Cohabitation), Business Permit, Blotter Reports, and Cedula
          assistance.
        </p>

        <p className="mt-6 max-w-lg text-center text-white/80 text-sm leading-relaxed">
          Please log in to access available barangay services.
        </p>
      </div>



      {/* RIGHT-Side */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <p className="text-sm text-muted-foreground">
              Use your email and password to continue.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={onSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="johndoe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">OR</span>
                <Separator className="flex-1" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onGoogle}
                disabled={loading}
              >
                Sign in with Google
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don’t have an account?{" "}
                <a href="/register" className="text-emerald-700 hover:underline">
                  Register here
                </a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>



  );
}
