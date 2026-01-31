"use client";

// Folder: apps/web/components/layout

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CalendarDays,
  Megaphone,
  MessageSquareText,
  Archive,
  Plus,
  FileText,
} from "lucide-react";

// import { supabase } from "@/lib/supabase/client";

type Role = "admin" | "staff" | "resident";

type SidebarItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type AppSidebarProps = {
  role: Role;

  // Header
  logoSrc?: string;
  brandSubtitle?: string; // allow override
  brandTitle?: string;

  // Profile display (UI only for now)
  name?: string;
  email?: string;

  className?: string;
};

function normalizePath(path: string) {
  // Remove trailing slash except root
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

function isActive(pathname: string, href: string) {
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  // Base routes should match ONLY the exact page
  // (prevents "/resident" from matching "/resident/book-appointment", etc.)
  if (target === "/admin") return current === "/admin";
  if (target === "/staff") return current === "/staff";
  if (target === "/resident") return current === "/resident";

  // Default: exact or nested match
  return current === target || current.startsWith(target + "/");
}

export default function AppSidebar({
  role,
  logoSrc = "/assets/logo/barangay-bayabasLogo.png",
  name = "User",
  email = "user@example.com",
  brandTitle,
  brandSubtitle,
  className = "",
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);

  // Always keep this title (unless you explicitly override it)
  const computedBrandTitle = brandTitle ?? "Barangay Appointment System";

  // Subtitle per role (Admin + Staff + Resident)
  const computedBrandSubtitle =
    brandSubtitle ??
    (role === "resident" ? "Resident" : role === "staff" ? "Staff" : "Admin");

  const items = useMemo<SidebarItem[]>(() => {
    if (role === "resident") {
      return [
        { label: "Overview", href: "/resident", icon: LayoutDashboard },
        { label: "Book Appointment", href: "/resident/book-appointment", icon: Plus },
        { label: "My Appointments", href: "/resident/my-appointment", icon: FileText },
        { label: "Announcements", href: "/resident/announcement", icon: Megaphone },
        { label: "Feedback", href: "/resident/feedback", icon: MessageSquareText },
      ];
    }

    if (role === "staff") {
      // Limited access (add/remove as you create staff routes)
      return [
        { label: "Overview", href: "/staff", icon: LayoutDashboard },
        { label: "Residents", href: "/staff/resident", icon: Users },
        { label: "Appointments", href: "/staff/appointment", icon: ClipboardList },
        { label: "Schedules", href: "/staff/schedule", icon: CalendarDays },
        { label: "Announcements", href: "/staff/announcement", icon: Megaphone },
        { label: "Feedback", href: "/staff/feedback", icon: MessageSquareText },
      ];
    }

    // Admin
    const adminItems: SidebarItem[] = [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Residents", href: "/admin/resident", icon: Users },
      { label: "Appointments", href: "/admin/appointment", icon: ClipboardList },
      { label: "Schedules", href: "/admin/schedule", icon: CalendarDays },
      { label: "Announcements", href: "/admin/announcement", icon: Megaphone },
      { label: "Feedback", href: "/admin/feedback", icon: MessageSquareText },
      { label: "Archive", href: "/admin/archive", icon: Archive },
    ];

    return adminItems;
  }, [role]);

  async function onLogout() {
    // If you want Supabase logout, uncomment supabase import and use:
    // await supabase.auth.signOut();

    router.push("/");
    router.refresh();
  }

  const profileHref =
    role === "resident"
      ? "/resident/profile"
      : role === "staff"
        ? "/staff/profile"
        : "/admin/profile";

  return (
    <aside
      className={[
        "hidden lg:flex w-[256px] shrink-0 flex-col bg-[#062E24] text-white",
        "sticky top-0 h-dvh",
        className,
      ].join(" ")}
    >

      {/* Header / Brand */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex flex-col items-center text-center">
          <div className="relative h-20 w-20">
            <Image
              src={logoSrc}
              alt="Barangay Logo"
              fill
              className="object-contain"
              priority
            />
          </div>

          <div className="mt-3 text-xs text-white/70">{computedBrandSubtitle}</div>
          <div className="text-sm font-semibold leading-tight">{computedBrandTitle}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-4 py-4 space-y-2">
        <div className="px-2 pb-2 text-xs text-white/60">Menu</div>

        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "rounded-md font-medium p-3 text-base transition-colors flex items-center gap-2",
                active
                  ? "bg-white text-[#062E24]"
                  : "text-white/90 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="mt-auto px-4 py-4 border-t border-white/10">
        <div className="px-2 pb-2 text-xs text-white/60">Profile</div>

        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          className="w-full rounded-md px-3 py-3 text-left hover:bg-white/10 transition-colors"
        >
          <div className="text-sm font-medium">{name}</div>
          <div className="text-xs text-white/70">{email}</div>
          <div className="mt-2 text-xs text-white/60">Click for options</div>
        </button>

        {profileOpen && (
          <div className="mt-2 rounded-md border border-white/10 bg-white/5 p-2">
            <Link
              href={profileHref}
              className="block rounded-md px-3 py-2 text-sm hover:bg-white/10"
              onClick={() => setProfileOpen(false)}
            >
              Profile
            </Link>

            <button
              type="button"
              className="w-full text-left rounded-md px-3 py-2 text-sm hover:bg-white/10"
              onClick={onLogout}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}