"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { createClient } from "@/utils/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLeftPanel from "./auth-sidepanel";
import ForceChangePasswordModal from "./ForceChangePasswordModal";

const schema = z.object({
  email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type FormValues = z.infer<typeof schema>;

export default function ResidentLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Password change modal state
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [residentId, setResidentId] = useState<number | null>(null);

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
    setInfoMessage(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      
      // Handle email not confirmed error
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setInfoMessage("Please verify your email first. Redirecting to verification...");
        setTimeout(() => {
          router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
        }, 2000);
        return;
      }
      
      return setFormError(error.message);
    }

    // Get user role and check resident status
    const { data: userData } = await supabase
      .from("users")
      .select("id, role")
      .eq("auth_id", data.user.id)
      .single();

    // If no user record exists, account setup is incomplete
    if (!userData) {
      setLoading(false);
      await supabase.auth.signOut();
      setFormError("Your account setup is incomplete. Please contact support or try registering again.");
      return;
    }

    const role = userData.role || "resident";

    // For residents, check verification status and password change requirement
    if (role === "resident") {
      const { data: residentData } = await supabase
        .from("residents")
        .select("id, verification_status, must_change_password")
        .eq("user_id", userData.id)
        .single();

      if (residentData?.verification_status === "pending") {
        setLoading(false);
        await supabase.auth.signOut();
        setInfoMessage("Your account is pending admin verification. Please wait for approval.");
        return;
      }

      if (residentData?.verification_status === "rejected") {
        setLoading(false);
        await supabase.auth.signOut();
        setFormError("Your account has been rejected. Please contact the barangay office for assistance.");
        return;
      }

      // Check if password change is required
      if (residentData?.must_change_password) {
        setLoading(false);
        setResidentId(residentData.id);
        setShowPasswordChangeModal(true);
        return;
      }
    }

    setLoading(false);

    // Redirect based on role
    if (role === "admin") {
      window.location.href = "/admin";
    } else if (role === "staff") {
      window.location.href = "/staff";
    } else {
      window.location.href = "/resident";
    }
  });

  return (
    <>
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

                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="********"
                      className="h-12 text-base pr-10"
                      disabled={loading}
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}

                  <div className="flex justify-end">
                    <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot Password?
                    </Link>
                  </div>
                </div>

                {formError && (
                  <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}

                {infoMessage && (
                  <div className="rounded-md border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    {infoMessage}
                  </div>
                )}

                <Button className="w-full h-12 text-base bg-primary hover:bg-primary/90" type="submit" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>

                <p className="text-center text-base text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="text-primary hover:underline font-medium">
                    Register here
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      <ForceChangePasswordModal
        open={showPasswordChangeModal}
        onOpenChange={setShowPasswordChangeModal}
        residentId={residentId || 0}
        onSuccess={() => {
          setShowPasswordChangeModal(false);
          window.location.href = "/resident";
        }}
      />
    </>
  );
}