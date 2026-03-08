import { Suspense } from "react";
import ResetPasswordPage from "@/components/auth/reset-password";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPage />
    </Suspense>
  );
}