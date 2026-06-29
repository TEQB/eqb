"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SearchBar } from "@/components/browse/SearchBar";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onMenuClick?: () => void;
  onSidebarToggle?: () => void;
  sidebarCollapsed?: boolean;
  userName?: string;
  feedbackCount?: number;
}

export function Header({ onMenuClick, onSidebarToggle, sidebarCollapsed, userName, feedbackCount = 0 }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initial = userName?.charAt(0)?.toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-white/10 bg-primary px-3 text-primary-foreground shadow-[0_18px_45px_rgba(122,16,48,0.22)] backdrop-blur-xl lg:h-16 lg:gap-4 lg:px-4">
      {onSidebarToggle && (
        <button
          type="button"
          onClick={onSidebarToggle}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary/30 lg:inline-flex"
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>
      )}

      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary/30 lg:hidden"
        >
          <svg
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}

      <Link href="/dashboard" className="flex items-center">
        <Image src="/drklogo.png" alt="EQB logo" width={120} height={40} className="h-10 w-auto object-contain" style={{ width: "auto", height: "2.5rem" }} priority />
      </Link>

      <div className="hidden flex-1 lg:block">
        <SearchBar />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/feedback"
          className="relative inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary/30"
        >
          <span className="hidden sm:inline">Feedback</span>
          <span className="sm:hidden">Msg</span>
          {feedbackCount > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {feedbackCount > 9 ? "9+" : feedbackCount}
            </span>
          )}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/15 text-sm font-medium text-white outline-none transition-transform hover:-translate-y-0.5 hover:bg-white/20 focus-visible:ring-4 focus-visible:ring-secondary/30">
            {initial}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground shadow-[0_10px_20px_rgba(122,16,48,0.2)]">
                    {initial}
                  </span>
                  <span className="truncate text-sm font-medium text-foreground">
                    {userName || "User"}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href="/profile" className="flex items-center gap-2">
                <ProfileIcon />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2">
              <LogoutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function ProfileIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
