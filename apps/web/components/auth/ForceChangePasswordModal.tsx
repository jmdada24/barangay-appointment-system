"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, Eye, EyeOff, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { forceChangePassword } from "@/actions/password";

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
      .regex(/[0-9]/, "Password must contain at least one number."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

interface ForceChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentId: number;
  onSuccess: () => void;
  allowSkip?: boolean;
}

export default function ForceChangePasswordModal({
  open,
  onOpenChange,
  residentId,
  onSuccess,
  allowSkip = true,
}: ForceChangePasswordModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setLoading(true);

    try {
      const result = await forceChangePassword(residentId, values.newPassword);

      if (!result.success) {
        setError(result.error || "Failed to change password");
        setLoading(false);
        return;
      }

      reset();
      onOpenChange(false);
      
      // Small delay to ensure modal closes before redirect
      setTimeout(() => {
        onSuccess();
      }, 300);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  });

  const handleSkip = () => {
    setSkipping(true);
    onOpenChange(false);
    
    // Redirect after modal closes
    setTimeout(() => {
      router.push("/resident");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-amber-600" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            Change Your Password
          </DialogTitle>
          <DialogDescription>
            Your account was created by an administrator with a temporary password. 
            We recommend changing it to something secure that only you know.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-medium">
              New Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                className="h-12 pr-10"
                placeholder="Enter new password"
                disabled={loading || skipping}
                {...register("newPassword")}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={loading || skipping}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-sm text-red-600">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className="h-12 pr-10"
                placeholder="Confirm new password"
                disabled={loading || skipping}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={loading || skipping}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="rounded-md border border-muted bg-muted/30 px-4 py-3 text-sm">
            <p className="font-medium text-foreground mb-2">
              Password Requirements:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
              <li>At least 8 characters long</li>
              <li>At least one uppercase letter (A-Z)</li>
              <li>At least one lowercase letter (a-z)</li>
              <li>At least one number (0-9)</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              className="flex-1 h-12 bg-primary hover:bg-primary/90"
              disabled={loading || skipping}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Set New Password
                </>
              )}
            </Button>
            {allowSkip && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12"
                onClick={handleSkip}
                disabled={loading || skipping}
              >
                {skipping ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Skipping...
                  </>
                ) : (
                  "Skip for Now"
                )}
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            You can always change your password later in your account settings.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}