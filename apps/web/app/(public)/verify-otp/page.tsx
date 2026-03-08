import { Suspense } from "react";
import OtpPage from "@/components/auth/otp";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <OtpPage />
    </Suspense>
  );
}