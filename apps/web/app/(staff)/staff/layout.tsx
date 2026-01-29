// Folder: apps/web/app/(admin)/admin

import type { ReactNode } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import StaffHeader from "@/components/layout/MainHeader";

type MainHeaderItem ={

  lblTitle: string,
  lblSubtitle: string,
  href: string,
};

const mainheader: MainHeaderItem[] =[
  { lblTitle: "Staff Dashboard", lblSubtitle: "Monitor and manage barangay services", href: "/staff" },
  { lblTitle: "Staff Dashboard", lblSubtitle: "Managing some stuff within", href: "/staff/appointment" },
  

];

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">

      <div className="flex">
        {/* TODO: Replace hardcoded role/name/email with real session/profile data */}

        <AppSidebar role="staff" name="Staff" email="staff@example.com" />


        <main className="flex-1 min-w-0 h-dvh overflow-y-auto">

          <StaffHeader items={mainheader}/>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}