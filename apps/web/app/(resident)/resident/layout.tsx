import type { ReactNode } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import ResidentHeader from "@/components/layout/MainHeader";


type MainHeaderItem = {
  lblTitle: string,
  lblSubtitle: string,
  href: string,

};

const mainheader: MainHeaderItem[] = [
  { lblTitle: "lorem ipsum", lblSubtitle: "sample text muted foreground", href: "/resident"},
  { lblTitle: "Residents", lblSubtitle: "Manage resident information and verification", href: "/staff/resident" },
  { lblTitle: "Appointment Management", lblSubtitle: "Review and process appointment requests", href: "/staff/appointment" },
  { lblTitle: "Schedules", lblSubtitle: "Manage available schedules", href: "/staff/schedule" },
  { lblTitle: "Announcements", lblSubtitle: "Manage public announcements and notices", href: "/staff/announcement" },
  { lblTitle: "Feedback", lblSubtitle: "View and manage resident feedback", href: "/staff/feedback" },

];


export default function ResidentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="flex">
        {/* TODO: Replace hardcoded role/name/email with real session/profile data */}
        <AppSidebar role="resident" name="Resident" email="resident@example.com" />

        <main className="flex-1 min-w-0 h-dvh overflow-y-auto">
          <ResidentHeader items={mainheader} />
            
          <div className="p-6">{children}</div>
        
          
        </main>
      </div>
    </div>
  );
}