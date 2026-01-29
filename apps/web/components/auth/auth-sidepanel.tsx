"use client";

import Image from "next/image";

type AuthLeftPanelProps = {
  logoSrc?: string;
  className?: string;
};

export default function AuthLeftPanel({
  logoSrc = "/assets/logo/barangay-bayabasLogo.png",
  className = "",
}: AuthLeftPanelProps) {
  return (
    <div className={`hidden lg:flex h-dvh flex-col items-center justify-center px-12 text-white bg-[#062E24] ${className}`}>
      <div className="mb-8">
        <div className="relative h-36 w-36">
          <Image src={logoSrc} alt="Barangay Logo" fill className="object-contain" priority />
        </div>
      </div>

      <h1 className="text-3xl font-semibold text-center leading-tight">
        Welcome to Barangay Bayabas
        <br />
        Appointment System
      </h1>

      <p className="mt-6 max-w-lg text-center text-white/80 text-sm leading-relaxed">
        This is the official online platform of Barangay Bayabas, Matina, Davao City, created to provide residents with
        convenient access to essential barangay services and information. The system serves as a centralized space for
        official announcements, community updates, and common barangay transactions.
      </p>

      <p className="mt-6 max-w-lg text-center text-white/80 text-sm leading-relaxed">
        Through this platform, residents may request important documents such as Barangay Clearance and various Barangay
        Certificates, including Certificate of Residency, Indigency, Good Moral Character, and Cohabitation. It also
        supports applications for Business Clearance or Permit for small businesses operating within the barangay.
      </p>

      <p className="mt-6 max-w-lg text-center text-white/80 text-sm leading-relaxed">
        In addition, the platform allows residents to submit Blotter Reports for incidents such as disputes, disturbances,
        or other community concerns, and provides assistance or referrals regarding Cedula (Community Tax Certificate)
        processing.
      </p>

      <p className="mt-6 max-w-lg text-center text-white/80 text-sm leading-relaxed">
        This system aims to improve efficiency, transparency, and communication between the barangay and its residents,
        helping build a safer, more organized, and connected community.
      </p>
    </div>
  );
}