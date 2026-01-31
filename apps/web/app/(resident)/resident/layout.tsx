import type { ReactNode } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import ResidentHeader from "@/components/layout/MainHeader";


type MainHeaderItem = {
  lblTitle: string,
  lblSubtitle: string,
  href: string,

};

const mainheader: MainHeaderItem[] = [
  { lblTitle: "Resident Dashboard", lblSubtitle: "Welcome to the Barangay Bayabas Online Service Portal", href: "/resident"},
  { lblTitle: "Book an Appointment", lblSubtitle: "Schedule your barangay service request", href: "/resident/book-appointment" },
  { lblTitle: "My Appointments", lblSubtitle: "View and manage your appointment requests", href: "/resident/my-appointment" },
  { lblTitle: "Schedules", lblSubtitle: "Manage available schedules", href: "/resident/schedule" },
  { lblTitle: "Announcements", lblSubtitle: "Manage public announcements and notices", href: "/resident/announcement" },
  { lblTitle: "Feedback", lblSubtitle: "View and manage resident feedback", href: "/resident/feedback" },

];


export default function ResidentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh overflow-hidden bg-background">
      <div className="flex h-full">
        {/* TODO: Replace hardcoded role/name/email with real session/profile data */}
        <AppSidebar role="resident" name="Resident" brandSubtitle="Resident" email="resident@example.com" />

        <main className="flex-1 min-w-0 h-dvh overflow-y-auto">
          <ResidentHeader items={mainheader} />
            
          <div className="p-6">{children}</div>
        
          
        </main>
      </div>
    </div>
  );
}