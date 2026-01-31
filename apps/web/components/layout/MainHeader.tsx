"use client";

// Folder: apps/web/components/layout

import { usePathname } from "next/navigation";

type MainHeaderItem = {
  lblTitle: string;
  lblSubtitle: string;
  href: string; // base path to match (e.g. "/admin/appointments")
};

function matchPath(pathname: string, href: string) {
  // Prevent "/admin" from matching all admin subroutes
if (href === "/admin" || href === "/resident" || href ==='/staff') {
    return pathname === href;
  }
  // exact or nested match
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminMainHeader({ items }: { items: MainHeaderItem[] }) {
  const pathname = usePathname();

  const current =
    items.find((it) => matchPath(pathname, it.href)) ??
    items.find((it) => it.href === "/admin") ??
    items[0];

  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
      <div className="px-8 py-8">
        <div className="text-xl font-semibold">{current.lblTitle}</div>
        <div className="text-sm text-muted-foreground">{current.lblSubtitle}</div>
      </div>
    </div>
  );
}