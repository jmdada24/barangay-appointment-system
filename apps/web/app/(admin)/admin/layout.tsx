"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import AdminMainHeader from "@/components/layout/MainHeader";
import IdleLogout from "@/components/auth/IdleLogout";

type MainHeaderItem = {
  lblTitle: string;
  lblSubtitle: string;
  href: string;
};

const mainheader: MainHeaderItem[] = [
  { lblTitle: "Admin Dashboard", lblSubtitle: "Monitor and manage barangay services", href: "/admin" },
  { lblTitle: "Residents", lblSubtitle: "Manage resident information and verification", href: "/admin/resident" },
  { lblTitle: "Appointment Management", lblSubtitle: "Review and process appointment requests", href: "/admin/appointment" },
  { lblTitle: "Schedules", lblSubtitle: "Manage available schedules", href: "/admin/schedule" },
  { lblTitle: "Announcements", lblSubtitle: "Manage public announcements and notices", href: "/admin/announcement" },
  { lblTitle: "Feedback", lblSubtitle: "View and manage resident feedback", href: "/admin/feedback" },
  { lblTitle: "Archive", lblSubtitle: "Review archived records and activity history", href: "/admin/archive" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-dvh overflow-hidden bg-background">
      <IdleLogout idleMs={30 * 60 * 1000} />
      
      <div className="flex h-full">
        {/* Sidebar */}
        <AppSidebar
          role="admin"
          brandSubtitle="Admin"
          logoSrc="/assets/logo/barangay-bayabasLogo.png"
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 h-dvh overflow-y-auto">
          {/* Header with menu button */}
          <AdminMainHeader
            items={mainheader}
            onMenuClick={() => setSidebarOpen(true)}
          />

          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
