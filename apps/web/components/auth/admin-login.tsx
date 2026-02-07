"use client";

import Image from "next/image";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { createClient } from "@/utils/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type FormValues = z.infer<typeof schema>;

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setFormError(error.message);
      setLoading(false);
      return;
    }

    // Verify user is admin or staff
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("auth_id", data.user.id)
      .single();

    if (userError || !userData) {
      setFormError("User profile not found.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // Only allow admin and staff
    if (userData.role !== "admin" && userData.role !== "staff") {
      setFormError("Access denied. This login is for admin and staff only.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // Redirect based on role
    if (userData.role === "admin") {
      window.location.href = "/admin";
    } else {
      window.location.href = "/staff";
    }



    
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center justify-center text-center">
          <div className="relative h-20">
            <Image src="/assets/logo/barangay-bayabasLogo.png" alt="Barangay Logo" fill className="object-contain" priority />
          </div>
          <CardTitle className="text-2xl text-primary">Admin Login</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="admin@example.com"
                disabled={loading}
                {...register("email")}
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="********"
                disabled={loading}
                {...register("password")}
              />
              {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
            </div>

            {formError && (
              <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <Button className="w-full bg-primary hover:bg-primary/90" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}