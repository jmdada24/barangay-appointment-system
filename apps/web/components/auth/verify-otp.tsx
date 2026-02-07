"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { Mail, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";

import { verifyOtpAndCreateProfile, resendOtp, checkVerificationStatus } from "@/actions/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyOTP() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [invalidAccess, setInvalidAccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check if there's a valid pending registration for this email
  useEffect(() => {
    async function validateAccess() {
      if (!email) {
        setInvalidAccess(true);
        setChecking(false);
        return;
      }

      try {
        const result = await checkVerificationStatus(email);
        
        if (!result.success && result.data?.status === "not_found") {
          setInvalidAccess(true);
          setError("No pending registration found for this email. Please register first.");
        } else if (result.success && result.data?.status === "verified" && result.data?.hasProfile) {
          // Already verified and has profile, redirect to login
          router.push("/?message=already_verified");
          return;
        }
        // Status is pending_verification or verified without profile - allow access
      } catch (e) {
        console.error("Validation error:", e);
        // Allow access on error - let the actual verification handle it
      } finally {
        setChecking(false);
      }
    }

    validateAccess();
  }, [email, router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (!checking && !invalidAccess) {
      inputRefs.current[0]?.focus();
    }
  }, [checking, invalidAccess]);

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (value && !/^\d+$/.test(value)) return;

      const newOtp = [...otp];

      if (value.length > 1) {
        const digits = value.slice(0, OTP_LENGTH).split("");
        digits.forEach((digit, i) => {
          if (index + i < OTP_LENGTH) newOtp[index + i] = digit;
        });
        setOtp(newOtp);
        const lastIndex = Math.min(index + digits.length, OTP_LENGTH) - 1;
        inputRefs.current[lastIndex]?.focus();
        return;
      }

      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (!otp[index] && index > 0) {
          inputRefs.current[index - 1]?.focus();
          const newOtp = [...otp];
          newOtp[index - 1] = "";
          setOtp(newOtp);
        } else {
          const newOtp = [...otp];
          newOtp[index] = "";
          setOtp(newOtp);
        }
        e.preventDefault();
      } else if (e.key === "ArrowLeft" && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData("text").trim();
      const digits = pastedData.replace(/\D/g, "").slice(0, OTP_LENGTH);

      if (digits) {
        const newOtp = [...otp];
        digits.split("").forEach((digit, i) => {
          newOtp[i] = digit;
        });
        setOtp(newOtp);
        const focusIndex = Math.min(digits.length, OTP_LENGTH) - 1;
        inputRefs.current[focusIndex]?.focus();
      }
    },
    [otp]
  );

  const handleVerify = async () => {
    const otpCode = otp.join("");

    if (otpCode.length !== OTP_LENGTH) {
      setError("Please enter the complete verification code.");
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await verifyOtpAndCreateProfile(email, otpCode);

      if (!result.success) {
        setError(result.error || "Verification failed. Please check your code and try again.");
        setLoading(false);
        return;
      }

      setSuccess("Email verified successfully! Your account is now pending admin approval. Redirecting...");
      setTimeout(() => router.push("/"), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || !email) return;

    setError(null);
    setSuccess(null);
    setResending(true);

    try {
      const result = await resendOtp(email);

      if (!result.success) {
        setError(result.error || "Failed to resend code. Please try again.");
        setResending(false);
        return;
      }

      setSuccess("A new verification code has been sent to your email.");
      setCountdown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = email
    ? email.replace(
        /(.{2})(.*)(@.*)/,
        (_, a, b, c) => a + "*".repeat(Math.min(b.length, 5)) + c
      )
    : "your email";

  // Show loading state while checking
  if (checking) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Validating...</p>
        </div>
      </div>
    );
  }

  // Show error for invalid access
  if (invalidAccess) {
    return (
      <div className="h-dvh overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6 mx-auto">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>

            <h2 className="text-2xl font-semibold tracking-tight text-red-900">
              Invalid Access
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              {error || "You need to register first before verifying your email."}
            </p>

            <div className="mt-8 space-y-4">
              <Button
                onClick={() => router.push("/register")}
                className="w-full h-12 text-base"
              >
                Go to Registration
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="w-full h-12 text-base"
              >
                Back to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to registration
          </Link>

          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Mail className="w-8 h-8 text-primary" />
          </div>

          <h2 className="text-3xl font-semibold tracking-tight">
            Verify your email
          </h2>
          <p className="mt-2 text-base text-muted-foreground">
            We&apos;ve sent a {OTP_LENGTH}-digit verification code to{" "}
            <span className="font-medium text-foreground">{maskedEmail}</span>
          </p>

          <div className="mt-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Verification Code</Label>
              <div className="flex gap-2 sm:gap-3 justify-center">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={OTP_LENGTH}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={loading}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-semibold"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <Button
              onClick={handleVerify}
              className="w-full h-12 text-base"
              disabled={loading || otp.join("").length !== OTP_LENGTH}
            >
              {loading ? "Verifying..." : "Verify Email"}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive the code?{" "}
                {countdown > 0 ? (
                  <span>
                    Resend in <span className="font-medium">{countdown}s</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || !email}
                    className="inline-flex items-center gap-1 text-primary hover:underline font-medium disabled:opacity-50"
                  >
                    {resending && <RefreshCw className="w-3 h-3 animate-spin" />}
                    Resend code
                  </button>
                )}
              </p>
            </div>

            <div className="rounded-md border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                Can&apos;t find the email?
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct email</li>
                <li>Wait a few minutes and try resending</li>
              </ul>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-medium mb-1">What happens next?</p>
              <p className="text-xs">
                After verification, your account will be pending admin approval. 
                You&apos;ll be able to login once an administrator verifies your identity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}