"use client";

import dynamic from "next/dynamic";
import { useState, createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileSidebarSheet } from "@/components/layout/MobileSidebarSheet";
import { ObligationBanner } from "@/components/upload/ObligationBanner";
import { Announcements } from "@/components/announcements/Announcements";

const BottomNav = dynamic(
  () => import("@/components/layout/BottomNav").then((m) => m.BottomNav),
  { ssr: false },
);

interface StudentProfile {
  id: string;
  fullName: string;
  programmeId: string;
  currentLevel: number;
  isLocked: boolean;
  daysRemaining: number;
}

const ProfileContext = createContext<StudentProfile | null>(null);

export function useProfile() {
  return useContext(ProfileContext);
}

interface StudentLayoutClientProps {
  profile: StudentProfile;
  feedbackCount: number;
  children: React.ReactNode;
}

export function StudentLayoutClient({
  profile,
  feedbackCount,
  children,
}: StudentLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ProfileContext.Provider value={profile}>
      <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden lg:flex lg:flex-row">
        <aside className={cn(
          "hidden shrink-0 overflow-y-auto border-r border-white/70 bg-white/65 shadow-[12px_0_30px_rgba(63,39,50,0.06)] backdrop-blur-xl transition-all duration-300 ease-in-out lg:block",
          sidebarCollapsed ? "w-16" : "w-60",
        )}>
          <Sidebar
            collapsed={sidebarCollapsed}
          />
        </aside>

        <MobileSidebarSheet
          open={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
        />

        <div className="flex flex-1 flex-col lg:h-screen lg:overflow-hidden">
          <Header
            onMenuClick={() => setMobileMenuOpen(true)}
            onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            sidebarCollapsed={sidebarCollapsed}
            userName={profile.fullName}
            feedbackCount={feedbackCount}
          />

          {profile.daysRemaining <= 14 && profile.daysRemaining > 0 && (
            <ObligationBanner daysRemaining={profile.daysRemaining} />
          )}

          <main className="flex-1 overflow-y-auto p-4 pb-28 lg:p-8 lg:pb-8">
            <div className="mx-auto w-full max-w-[1040px]">
              <Announcements />
              {children}
            </div>
          </main>
        </div>

        <BottomNav />
      </div>
    </ProfileContext.Provider>
  );
}
