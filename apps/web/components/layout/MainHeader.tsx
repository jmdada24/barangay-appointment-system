"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

type MainHeaderItem = {
  lblTitle: string;
  lblSubtitle: string;
  href: string;
};

function matchPath(pathname: string, href: string) {
  if (href === "/admin" || href === "/resident" || href === "/staff") {
    return pathname === href;
  }
  // exact or nested match
  return pathname === href || pathname.startsWith(href + "/");
}

interface MainHeaderProps {
  items: MainHeaderItem[];
  onMenuClick?: () => void;
}

export default function MainHeader({ items, onMenuClick }: MainHeaderProps) {
  const pathname = usePathname();

  const current =
    items.find((it) => matchPath(pathname, it.href)) ??
    items.find((it) => it.href === "/admin") ??
    items[0];

  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
      <div className="px-4 sm:px-8 py-4 sm:py-8 flex items-center justify-between gap-4">
        {/* Menu Button + Title */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6 text-gray-700" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="text-lg sm:text-xl font-semibold truncate">
              {current.lblTitle}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground truncate">
              {current.lblSubtitle}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}