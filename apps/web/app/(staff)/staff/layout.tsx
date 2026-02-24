"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import MainHeader from "@/components/layout/MainHeader";

type MainHeaderItem = {
  lblTitle: string;
  lblSubtitle: string;
  href: string;
};

const mainheader: MainHeaderItem[] = [
  { lblTitle: "Staff Dashboard", lblSubtitle: "Monitor and manage barangay services", href: "/staff" },
  { lblTitle: "Appointments", lblSubtitle: "Manage appointment requests", href: "/staff/appointment" },
  { lblTitle: "Residents", lblSubtitle: "View resident information", href: "/staff/resident" },
  { lblTitle: "Schedules", lblSubtitle: "Manage available schedules", href: "/staff/schedule" },
  { lblTitle: "Announcements", lblSubtitle: "Manage public announcements", href: "/staff/announcement" },
  { lblTitle: "Feedback", lblSubtitle: "View resident feedback", href: "/staff/feedback" },
];

export default function StaffLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-dvh overflow-hidden bg-background">
      <div className="flex h-full">
        {/* Sidebar */}
        <AppSidebar
          role="staff"
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 h-dvh overflow-y-auto">
          {/* Header with menu button */}
          <MainHeader
            items={mainheader}
            onMenuClick={() => setSidebarOpen(true)}
          />

          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
