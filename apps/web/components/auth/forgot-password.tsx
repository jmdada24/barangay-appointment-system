"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

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
      toast.error(result.error || "Failed to send reset email");
      setLoading(false);
      return;
    }

    setSubmittedEmail(email);
    setSubmitted(true);
    toast.success("Check your email for reset instructions!");
    setLoading(false);
  });

  return (
    <div className="h-dvh overflow-hidden lg:grid lg:grid-cols-2">
      {/* LEFT PANEL */}
      <AuthLeftPanel />

      {/* RIGHT PANEL */}
      <div className="h-dvh overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-xl">
            {!submitted ? (
              <>
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
                  No worries! Enter your email and we'll send you a link to reset your
                  password.
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
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Reset Link
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
              </>
            ) : (
              /* SUCCESS STATE */
              <div className="text-center py-8">
                <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>

                <h2 className="text-3xl font-semibold tracking-tight mb-2">
                  Check Your Email
                </h2>
                <p className="text-base text-muted-foreground mb-2">
                  We've sent a password reset link to:
                </p>
                <p className="text-lg font-medium text-foreground mb-6">
                  {submittedEmail}
                </p>

                <div className="rounded-md border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-700 mb-8">
                  <p className="font-medium mb-1">💡 Tip:</p>
                  <p>
                    If you don't see the email in a few minutes, check your spam or junk folder.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    asChild
                    className="w-full h-12 text-base bg-primary hover:bg-primary/90"
                  >
                    <Link href="/resident-login">Back to Sign In</Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-12 text-base"
                    onClick={() => setSubmitted(false)}
                  >
                    Try Another Email
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-6">
                  Don't have an account?{" "}
                  <Link href="/resident-register" className="text-primary hover:underline">
                    Sign Up
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}