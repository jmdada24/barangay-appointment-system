"use client";

import Link from "next/link";
import { useState } from "react";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// import { supabase } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLeftPanel from "./auth-sidepanel";

const schema = z.object({
  email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type FormValues = z.infer<typeof schema>;

export default function ResidentLogin() {
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

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) return setFormError(error.message);

    window.location.href = "/dashboard";
  });


  return (
    <div className="h-dvh overflow-hidden lg:grid lg:grid-cols-2">
      {/* LEFT PANEL */}
      <AuthLeftPanel />

      {/* RIGHT PANEL */}
      <div className="h-dvh overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-xl">
            <h2 className="text-4xl font-semibold tracking-tight">Sign In</h2>
            <p className="mt-2 text-base text-muted-foreground">Use your email and password to continue.</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium" htmlFor="email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="johndoe@example.com"
                  className="h-12 text-base"
                  disabled={loading}
                  {...register("email")}
                />
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium" htmlFor="password">
                  Password <span className="text-red-500">*</span>
                </Label>

                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  className="h-12 text-base"
                  disabled={loading}
                  {...register("password")}
                />
                {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}

                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-sm text-[#062E24] hover:underline ">
                    Forgot Password?
                  </Link>
                </div>
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <Button className="w-full h-12 text-base bg-[#062E24] hover:bg-[#062E24]/90" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>

              <p className="text-center text-base text-muted-foreground">
                Don’t have an account?{" "}
                <Link href="/register" className="text-[#062E24] hover:underline font-medium">
                  Register here
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}