"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
// import { supabase } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResidentRegister() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    // const { data, error } = await supabase.auth.signUp({
    //   email,
    //   password,
    //   options: {
    //     data: {
    //       first_name: firstName,
    //       last_name: lastName,
    //       address,
    //       contact_number: contactNumber,
    //       gender,
    //       date_of_birth: dob,
    //       role: "resident",
    //     },
    //   },
    // });
    //
    // setLoading(false);
    // if (error) return setError(error.message);
    //
    // if (!data.session) {
    //   setSuccess("Registration successful. Please check your email to confirm your account.");
    //   return;
    // }
    //
    // window.location.href = "/dashboard";

    // TEMP while supabase is commented:
    setLoading(false);
    setSuccess("Form submitted (Supabase is currently commented).");
  }

  return (
    <div className="h-dvh overflow-hidden lg:grid lg:grid-cols-2">
      {/* LEFT PANEL (fixed / non-scroll) */}
      <div className="hidden lg:flex h-dvh flex-col items-center justify-center px-12 text-white bg-[#062E24]">
        <div className="mb-8">
          <div className="relative h-36 w-36">
            <Image
              src="/assets/logo/barangay-bayabasLogo.png"
              alt="Barangay Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <h1 className="text-3xl font-semibold text-center leading-tight">
          Welcome to Barangay Bayabas
          <br />
          Appointment System
        </h1>

        <p className="mt-6 max-w-lg text-center text-white/80 text-sm leading-relaxed">
          This is the official online platform of Barangay Bayabas, Matina, Davao City,
          created to provide residents with convenient access to essential barangay
          services and information. The system serves as a centralized space for official
          announcements, community updates, and common barangay transactions.
        </p>

        <p className="mt-6 max-w-lg text-center text-white/80 text-sm leading-relaxed">
          Through this platform, residents may request important documents such as
          Barangay Clearance and various Barangay Certificates, including Certificate of
          Residency, Indigency, Good Moral Character, and Cohabitation. It also supports
          applications for Business Clearance or Permit for small businesses operating
          within the barangay.
        </p>

        <p className="mt-6 max-w-lg text-center text-white/80 text-sm leading-relaxed">
          In addition, the platform allows residents to submit Blotter Reports for
          incidents such as disputes, disturbances, or other community concerns, and
          provides assistance or referrals regarding Cedula (Community Tax Certificate)
          processing.
        </p>

        <p className="mt-6 max-w-lg text-center text-white/80 text-sm leading-relaxed">
          This system aims to improve efficiency, transparency, and communication between
          the barangay and its residents, helping build a safer, more organized, and
          connected community.
        </p>
      </div>

      {/* RIGHT PANEL (the ONLY scroll container) */}
      <div className="h-dvh overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-2xl">
            <h2 className="text-4xl font-semibold tracking-tight">
              Create Resident Account
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              Register to access barangay services
            </p>

            {/* Notice box like your screenshot */}
            <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="font-medium">*</span> Required fields must be filled out correctly
            </div>

            <form onSubmit={onSubmit} className="mt-8 space-y-6">
              {/* First + Last */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-12 text-base"
                    placeholder="John"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-12 text-base"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-12 text-base"
                  placeholder="Matina, Davao City"
                  required
                />
              </div>

              {/* Email + Contact */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 text-base"
                    placeholder="johndoe@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Contact Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="h-12 text-base"
                    placeholder="09123456789"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: 09XXXXXXXXX or +639XXXXXXXXX
                  </p>
                </div>
              </div>

              {/* Password + Confirm */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 text-base"
                    placeholder="********"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="h-12 text-base"
                    placeholder="********"
                    required
                  />
                </div>
              </div>

              {/* DOB + Gender */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Date of Birth <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="h-12 text-base"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Gender <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="h-12 text-base"
                    placeholder="Select Gender"
                    required
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-700">{success}</p>}

              <Button
                className="w-full h-12 text-base bg-[#062E24] hover:bg-[#062E24]/90"
                type="submit"
                disabled={loading}
              >
                {loading ? "Creating..." : "Register Account"}
              </Button>

              <p className="text-center text-base text-muted-foreground">
                Already have an account?{" "}
                <Link href="/" className="text-[#062E24] hover:underline font-medium">
                  Sign In
                </Link>
              </p>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base"
                disabled={loading}
                onClick={() => alert("Later: Google sign-up")}
              >
                Sign in with Google
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
