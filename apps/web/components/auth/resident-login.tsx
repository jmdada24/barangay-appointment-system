"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
// import { supabase } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function ResidentLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);

        if (error) return setError(error.message);

        // After login, go to resident dashboard
        window.location.href = "/dashboard";
    }


    async function onGoogle() {
        setError(null);
        setLoading(true);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        setLoading(false);
        if (error) setError(error.message);
    }



    return (
        <div className="h-dvh overflow-hidden lg:grid lg:grid-cols-2">
            {/* LEFT PANEL */}
            <div className="hidden lg:flex h-dvh flex-col items-center justify-center px-12 text-white bg-[#062E24]">
                <div className="mb-8">
                    {/* Put your logo in /public/logo.png */}
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
                    This is the official online platform of Barangay Bayabas, Matina, Davao City, created to provide residents with convenient access to essential barangay services and information. The system serves as a centralized space for official announcements, community updates, and common barangay transactions.
                </p>

                <p className="mt-6 max-w-lg text-center text-white/80 text-sm leading-relaxed">
                    Through this platform, residents may request important documents such as Barangay Clearance and various Barangay Certificates, including Certificate of Residency, Indigency, Good Moral Character, and Cohabitation. It also supports applications for Business Clearance or Permit for small businesses operating within the barangay.
                </p>

                <p className="mt-6 max-w-lg text-center text-white/80 text-sm leading-relaxed">
                    In addition, the platform allows residents to submit Blotter Reports for incidents such as disputes, disturbances, or other community concerns, and provides assistance or referrals regarding Cedula (Community Tax Certificate) processing.
                </p>

                <p className="mt-6 max-w-lg text-center text-white/80 text-sm leading-relaxed">
                    This system aims to improve efficiency, transparency, and communication between the barangay and its residents, helping build a safer, more organized, and connected community.
                </p>
            </div>

            {/* RIGHT PANEL */}
            <div className="h-dvh overflow-y-auto">

                <div className="flex min-h-full items-center justify-center p-6 lg:p-12">
                    <div className="w-full max-w-xl">
                        <h2 className="text-4xl font-semibold tracking-tight">Sign In</h2>
                        <p className="mt-2 text-base text-muted-foreground">
                            Use your email and password to continue.
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
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-12 text-base"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium" htmlFor="password">
                                    Password <span className="text-red-500">*</span>
                                </Label>



                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="********"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-12 text-base"
                                    required
                                />

                                <div className="flex justify-end">
                                    <Link
                                        href="/forgot-password"
                                        className="text-sm text-muted-foreground hover:underline"
                                    >
                                        Forgot Password?
                                    </Link>
                                </div>
                            </div>



                            {error && <p className="text-sm text-red-600">{error}</p>}

                            <Button
                                className="w-full h-12 text-base bg-[#062E24] hover:bg-[#062E24]/90"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? "Signing in..." : "Sign In"}
                            </Button>

                            <div className="flex items-center gap-4">
                                <Separator className="flex-1" />
                                <span className="text-sm text-muted-foreground">OR</span>
                                <Separator className="flex-1" />
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-12 text-base"
                                onClick={onGoogle}
                                disabled={loading}
                            >
                                Sign in with Google
                            </Button>

                            <p className="text-center text-base text-muted-foreground">
                                Don’t have an account?{" "}
                                <Link href="/register" className="text-[#062E24] hover:underline font-medium">
                                    Register here
                                </Link>
                            </p>
                        </form>
                    </div>
                </div>
            </div>

        </div>


    );
}
