"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/actions/forgot-password";
import AuthLeftPanel from "@/components/auth/auth-sidepanel";

const schema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Enter a valid email address."),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setLoading(true);

    const result = await requestPasswordReset(email);

    if (!result.success) {
      toast.error(result.error || "Failed to send verification code.");
      setLoading(false);
      return;
    }

    toast.success("Verification code sent. Please check your email.");
    router.push(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    setLoading(false);
  });

  return (
    <div className="h-dvh overflow-hidden lg:grid lg:grid-cols-2">
      <AuthLeftPanel />

      <div className="h-dvh overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-xl">
            <div className="flex items-center gap-2 mb-6">
              <Link
                href="/resident-login"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>

            <h2 className="text-4xl font-semibold tracking-tight">
              Forgot Password?
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              Enter your email address and we will send you a 6-digit verification code.
            </p>

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
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <Button
                className="w-full h-12 text-base bg-primary hover:bg-primary/90"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Verification Code
                  </>
                )}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-6">
              Remember your password?{" "}
              <Link href="/resident-login" className="text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}