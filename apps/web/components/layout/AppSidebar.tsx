"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { X } from "lucide-react";

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
  User,
  LogOut,
  ChevronUp,
} from "lucide-react";

type Role = "admin" | "staff" | "resident";

type SidebarItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type AppSidebarProps = {
  role: Role;
  logoSrc?: string;
  brandSubtitle?: string;
  brandTitle?: string;
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
};

type UserProfile = {
  name: string;
  email: string;
  role: Role;
};

function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

function isActive(pathname: string, href: string) {
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  if (target === "/admin") return current === "/admin";
  if (target === "/staff") return current === "/staff";
  if (target === "/resident") return current === "/resident";

  // ✅ NEW: Highlight "My Appointments" when on feedback page
  if (target === "/resident/my-appointment") {
    return (
      current === target ||
      current.startsWith(target + "/") ||
      current === "/resident/feedback"
    );
  }

  return current === target || current.startsWith(target + "/");
}

export default function AppSidebar({
  role,
  logoSrc = "/assets/logo/barangay-bayabasLogo.png",
  brandTitle,
  brandSubtitle,
  className = "",
  isOpen = false,
  onClose = () => {},
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "Loading...",
    email: "...",
    role: role,
  });
  const [profileDetails, setProfileDetails] = useState<
    Record<string, string | null>
  >({});
  const [loadingProfile, setLoadingProfile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const computedBrandTitle = brandTitle ?? "Barangay Appointment System";
  const computedBrandSubtitle =
    brandSubtitle ??
    (role === "resident" ? "Resident" : role === "staff" ? "Staff" : "Admin");

  // Fetch user profile on mount
  useEffect(() => {
    async function fetchUserProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: userRecord } = await supabase
        .from("users")
        .select("id, email, role")
        .eq("auth_id", user.id)
        .single();

      if (!userRecord) return;

      let name = "";

      if (userRecord.role === "admin") {
        const { data } = await supabase
          .from("admins")
          .select("name")
          .eq("user_id", userRecord.id)
          .single();
        name = data?.name || "";
      } else if (userRecord.role === "staff") {
        const { data } = await supabase
          .from("staff")
          .select("name")
          .eq("user_id", userRecord.id)
          .single();
        name = data?.name || "";
      } else {
        const { data } = await supabase
          .from("residents")
          .select("name")
          .eq("user_id", userRecord.id)
          .single();
        name = data?.name || "";
      }

      setUserProfile({
        name: name || user.email?.split("@")[0] || "User",
        email: userRecord.email,
        role: userRecord.role as Role,
      });
    }

    fetchUserProfile();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileOpen]);

  // ✅ Mobile UX: lock background scroll while sidebar is open
  useEffect(() => {
    if (!isOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // ✅ Mobile UX: ESC closes sidebar
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const items = useMemo<SidebarItem[]>(() => {
    if (role === "resident") {
      return [
        { label: "Overview", href: "/resident", icon: LayoutDashboard },
        { label: "Book Appointment", href: "/resident/book-appointment", icon: Plus },
        { label: "My Appointments", href: "/resident/my-appointment", icon: FileText },
        { label: "Announcements", href: "/resident/announcement", icon: Megaphone },
      ];
    }

    if (role === "staff") {
      return [
        { label: "Overview", href: "/staff", icon: LayoutDashboard },
        { label: "Residents", href: "/staff/resident", icon: Users },
        { label: "Appointments", href: "/staff/appointment", icon: ClipboardList },
        { label: "Schedules", href: "/staff/schedule", icon: CalendarDays },
        { label: "Announcements", href: "/staff/announcement", icon: Megaphone },
        { label: "Feedback", href: "/staff/feedback", icon: MessageSquareText },
      ];
    }

    return [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Residents", href: "/admin/resident", icon: Users },
      { label: "Appointments", href: "/admin/appointment", icon: ClipboardList },
      { label: "Schedules", href: "/admin/schedule", icon: CalendarDays },
      { label: "Announcements", href: "/admin/announcement", icon: Megaphone },
      { label: "Feedback", href: "/admin/feedback", icon: MessageSquareText },
      { label: "Archive", href: "/admin/archive", icon: Archive },
    ];
  }, [role]);

  async function onLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();

    if (role === "admin" || role === "staff") {
      router.push("/admin/login");
    } else {
      router.push("/");
    }
    router.refresh();
  }

  async function openProfileModal() {
    setProfileOpen(false);
    setShowProfileModal(true);
    setLoadingProfile(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoadingProfile(false);
      return;
    }

    const { data: userRecord } = await supabase
      .from("users")
      .select("id, email, role, created_at")
      .eq("auth_id", user.id)
      .single();

    if (!userRecord) {
      setLoadingProfile(false);
      return;
    }

    let details: Record<string, string | null> = {
      Email: userRecord.email,
      Role: userRecord.role,
      "Member Since": new Date(userRecord.created_at).toLocaleDateString(),
    };

    if (userRecord.role === "admin") {
      const { data } = await supabase
        .from("admins")
        .select("name, position, contact_number")
        .eq("user_id", userRecord.id)
        .single();

      if (data) {
        details = {
          Name: data.name,
          Position: data.position,
          "Contact Number": data.contact_number,
          ...details,
        };
      }
    } else if (userRecord.role === "staff") {
      const { data } = await supabase
        .from("staff")
        .select("name, position, contact_number")
        .eq("user_id", userRecord.id)
        .single();

      if (data) {
        details = {
          Name: data.name,
          Position: data.position,
          "Contact Number": data.contact_number,
          ...details,
        };
      }
    } else {
      const { data } = await supabase
        .from("residents")
        .select("name, address, phone_number, birthdate, verification_status")
        .eq("user_id", userRecord.id)
        .single();

      if (data) {
        details = {
          Name: data.name,
          Address: data.address,
          "Phone Number": data.phone_number,
          Birthdate: data.birthdate ? new Date(data.birthdate).toLocaleDateString() : null,
          "Verification Status": data.verification_status,
          ...details,
        };
      }
    }

    setProfileDetails(details);
    setLoadingProfile(false);
  }

  return (
    <>
      {/* ✅ Mobile Overlay - Smooth fade in/out */}
      <div
        className={[
          "fixed inset-0 bg-black/50 z-30 lg:hidden",
          "transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      <aside
        className={[
          // base
          "w-[256px] shrink-0 flex-col bg-primary text-white",
          "fixed left-0 top-0 h-dvh z-50",
          "transform transition-transform duration-300 ease-out will-change-transform",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:translate-x-0",
          "flex",
          "overflow-y-auto overscroll-contain",
          className,
        ].join(" ")}
        role="navigation"
        aria-label="Sidebar"
      >
        {/* Close Button for Mobile */}
        <div className="flex lg:hidden items-center justify-end p-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Header / Brand */}
        <div className="px-6 py-6 border-b border-white/10 flex-shrink-0">
          <div className="flex flex-col items-center text-center">
            <div className="relative h-20 w-20">
              <Image
                src={logoSrc}
                alt="Barangay Logo"
                fill
                sizes="80px"
                className="object-contain"
                priority
              />
            </div>
            <div className="mt-3 text-xs text-white/70">{computedBrandSubtitle}</div>
            <div className="text-sm font-semibold leading-tight">{computedBrandTitle}</div>
          </div>
        </div>

        {/* Nav - Scrollable */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto overscroll-contain">
          <div className="px-2 pb-2 text-xs text-white/60">Menu</div>

          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  // close drawer on mobile after navigation
                  onClose();
                }}
                aria-current={active ? "page" : undefined}
                className={[
                  "rounded-md font-medium p-3 text-base transition-all duration-200",
                  "flex items-center gap-2",
                  active
                    ? "bg-white text-primary shadow-md"
                    : "text-white/90 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Profile Section with Floating Dropdown */}
        <div
          className="relative px-4 py-4 border-t border-white/10 flex-shrink-0"
          ref={dropdownRef}
        >
          {/* Floating Dropdown - Positioned ABOVE the button */}
          {profileOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 rounded-lg border border-white/20 bg-[#1a3d2e] shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* User Info Header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{userProfile.name}</p>
                    <p className="text-xs text-white/60 truncate">{userProfile.email}</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <button
                  onClick={openProfileModal}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md hover:bg-white/10 transition-colors text-white/90"
                >
                  <User className="h-4 w-4" />
                  View Profile
                </button>
              </div>

              {/* Logout */}
              <div className="p-2 border-t border-white/10">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md text-red-300 hover:bg-red-500/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}

          {/* Profile Button */}
          <div className="px-2 pb-2 text-xs text-white/60">Profile</div>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="w-full rounded-md px-3 py-3 text-left hover:bg-white/10 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium">{userProfile.name}</div>
                <div className="text-xs text-white/70 capitalize">{userProfile.role}</div>
              </div>
            </div>
            <ChevronUp
              className={`h-4 w-4 text-white/60 transition-transform duration-200 ${
                profileOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </aside>

      {/* Profile Modal */}
      {showProfileModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">My Profile</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Avatar & Role */}
            <div className="flex flex-col items-center mb-6">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <User className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">{userProfile.name}</h3>
              {(userProfile.role === "admin" || userProfile.role === "staff") && (
                <span
                  className={`mt-1 px-3 py-1 rounded-full text-sm font-medium capitalize ${
                    userProfile.role === "admin"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {userProfile.role}
                </span>
              )}
            </div>

            {/* Profile Details */}
            {loadingProfile ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(profileDetails).map(
                  ([key, value]) =>
                    value &&
                    !(userProfile.role === "resident" && key === "Role") && (
                      <div
                        key={key}
                        className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                      >
                        <span className="text-sm text-gray-500">{key}</span>
                        <span
                          className={`text-sm font-medium text-gray-900 ${
                            key === "Email" ? "" : "capitalize"
                          }`}
                        >
                          {value}
                        </span>
                      </div>
                    )
                )}
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setShowProfileModal(false)}
              className="w-full mt-6 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}