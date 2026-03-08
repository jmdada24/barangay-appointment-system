"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { verifyPasswordResetOtp, resendPasswordResetOtp } from "@/actions/forgot-password";
import AuthLeftPanel from "@/components/auth/auth-sidepanel";

export default function OtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = useMemo(() => searchParams.get("email")?.trim().toLowerCase() || "", [searchParams]);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  function updateOtp(index: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 1);
    const next = [...otp];
    next[index] = clean;
    setOtp(next);

    if (clean && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null;
      nextInput?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement | null;
      prevInput?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((char, i) => {
      next[i] = char;
    });
    setOtp(next);

    const focusIndex = Math.min(pasted.length, 5);
    const input = document.getElementById(`otp-${focusIndex}`) as HTMLInputElement | null;
    input?.focus();
  }

  async function handleVerify() {
    const code = otp.join("");

    if (!email) {
      toast.error("Email is missing. Please go back and try again.");
      return;
    }

    if (code.length !== 6) {
      toast.error("Enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);

    const result = await verifyPasswordResetOtp(email, code);

    if (!result.success) {
      toast.error(result.error || "Invalid verification code.");
      setLoading(false);
      return;
    }

    toast.success("Verification successful.");
    router.push(`/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(code)}`);
    setLoading(false);
  }

  async function handleResend() {
    if (!email) {
      toast.error("Email is missing. Please go back and try again.");
      return;
    }

    setResending(true);

    const result = await resendPasswordResetOtp(email);

    if (!result.success) {
      toast.error(result.error || "Failed to resend code.");
      setResending(false);
      return;
    }

    toast.success("A new verification code has been sent.");
    setResending(false);
  }

  return (
    <div className="h-dvh overflow-hidden lg:grid lg:grid-cols-2">
      <AuthLeftPanel />

      <div className="h-dvh overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-xl">
            <div className="flex items-center gap-2 mb-6">
              <Link
                href="/forgot-password"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </div>

            <div className="mb-8">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>

              <h2 className="text-4xl font-semibold tracking-tight">
                Verify OTP
              </h2>
              <p className="mt-2 text-base text-muted-foreground">
                Enter the 6-digit verification code sent to:
              </p>
              <p className="mt-1 text-sm font-medium text-foreground break-all">
                {email || "No email provided"}
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => updateOtp(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="h-14 w-12 rounded-lg border border-gray-200 text-center text-xl font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    disabled={loading || resending}
                  />
                ))}
              </div>

              <Button
                className="w-full h-12 text-base bg-primary hover:bg-primary/90"
                onClick={handleVerify}
                disabled={loading || resending}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full h-12 text-base"
                onClick={handleResend}
                disabled={loading || resending}
              >
                {resending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Resending...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Resend Code
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-6">
              Didn’t receive the code? Check your spam folder first.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}