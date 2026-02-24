"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import ResidentHeader from "@/components/layout/MainHeader";

type MainHeaderItem = {
  lblTitle: string;
  lblSubtitle: string;
  href: string;
};

const mainheader: MainHeaderItem[] = [
  { lblTitle: "Resident Dashboard", lblSubtitle: "Welcome to the Barangay Bayabas Online Service Portal", href: "/resident" },
  { lblTitle: "Book an Appointment", lblSubtitle: "Schedule your barangay service request", href: "/resident/book-appointment" },
  { lblTitle: "My Appointments", lblSubtitle: "View and manage your appointment requests", href: "/resident/my-appointment" },
  { lblTitle: "Schedules", lblSubtitle: "Manage available schedules", href: "/resident/schedule" },
  { lblTitle: "Announcements", lblSubtitle: "Manage public announcements and notices", href: "/resident/announcement" },
];

export default function ResidentLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-dvh overflow-hidden bg-background">
      <div className="flex h-full">
        
        {/* Sidebar */}
        <AppSidebar 
          role="resident" 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 h-dvh overflow-y-auto">
          {/* Header with menu button */}
          <ResidentHeader 
            items={mainheader}
            onMenuClick={() => setSidebarOpen(true)}
          />
            
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}