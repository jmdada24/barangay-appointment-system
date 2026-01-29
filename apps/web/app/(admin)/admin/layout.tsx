import type { ReactNode } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import AdminMainHeader from "@/components/layout/MainHeader";

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
  return (
    <div className="h-dvh overflow-hidden bg-background">
      <div className="flex h-full">
        <AppSidebar
          role="admin"
          brandSubtitle="Admin"
          name="Administrator"
          email="admin@example.com"
          logoSrc="/assets/logo/barangay-bayabasLogo.png"
        />

        <main className="flex-1 min-w-0 h-dvh overflow-y-auto">
          <AdminMainHeader items={mainheader} />
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}