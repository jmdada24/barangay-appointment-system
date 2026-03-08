"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordWithOtp } from "@/actions/forgot-password";
import AuthLeftPanel from "@/components/auth/auth-sidepanel";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter.")
      .regex(/[a-z]/, "Must contain at least one lowercase letter.")
      .regex(/[0-9]/, "Must contain at least one number."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(() => searchParams.get("email")?.trim().toLowerCase() || "", [searchParams]);
  const otp = useMemo(() => searchParams.get("otp")?.trim() || "", [searchParams]);

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    if (!email) {
      toast.error("Email is missing. Please restart the password reset process.");
      return;
    }

    if (!otp) {
      toast.error("OTP is missing. Please verify your code again.");
      return;
    }

    setLoading(true);

    const result = await resetPasswordWithOtp(email, otp, password);

    if (!result.success) {
      toast.error(result.error || "Failed to reset password.");
      setLoading(false);
      return;
    }

    toast.success("Password reset successfully.");
    setDone(true);
    setLoading(false);
  });

  return (
    <div className="h-dvh overflow-hidden lg:grid lg:grid-cols-2">
      <AuthLeftPanel />

      <div className="h-dvh overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-xl">
            {!done ? (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <Link
                    href={email ? `/verify-otp?email=${encodeURIComponent(email)}` : "/forgot-password"}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Link>
                </div>

                <h2 className="text-4xl font-semibold tracking-tight">
                  Reset Password
                </h2>
                <p className="mt-2 text-base text-muted-foreground">
                  Set a new password for your account.
                </p>

                <form onSubmit={onSubmit} className="mt-8 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium" htmlFor="password">
                      New Password <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your new password"
                      className="h-12 text-base"
                      disabled={loading}
                      {...register("password")}
                    />
                    {errors.password && (
                      <p className="text-sm text-red-600">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium" htmlFor="confirmPassword">
                      Confirm Password <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your new password"
                      className="h-12 text-base"
                      disabled={loading}
                      {...register("confirmPassword")}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <div className="rounded-md border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    <p className="font-medium mb-1">Password requirements:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>At least 8 characters</li>
                      <li>At least one uppercase letter</li>
                      <li>At least one lowercase letter</li>
                      <li>At least one number</li>
                    </ul>
                  </div>

                  <Button
                    className="w-full h-12 text-base bg-primary hover:bg-primary/90"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Updating Password...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Reset Password
                      </>
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>

                <h2 className="text-3xl font-semibold tracking-tight mb-2">
                  Password Updated
                </h2>
                <p className="text-base text-muted-foreground mb-8">
                  Your password has been reset successfully. You can now sign in using your new password.
                </p>

                <Button
                  className="w-full h-12 text-base bg-primary hover:bg-primary/90"
                  onClick={() => router.push("/resident-login")}
                >
                  Go to Sign In
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}