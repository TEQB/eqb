"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileSidebar } from "@/components/admin/AdminMobileSidebar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function AdminLayoutClient({
  children,
  secret,
}: {
  children: React.ReactNode;
  secret: string;
}) {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAuthed(false); return; }
      const { data: raw } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("auth_user_id", user.id)
        .single();
      const profile = raw as unknown as { role: string; full_name: string } | null;
      if (profile?.role === "super_admin") {
        setIsAuthed(true);
        if (profile.full_name) setAdminName(profile.full_name);
      } else {
        setIsAuthed(false);
      }
    }
    check();
  }, []);

  useEffect(() => {
    if (isAuthed === false) {
      router.replace(`/admin/${secret}/login`);
    }
  }, [isAuthed, router, secret]);

  if (isAuthed === null) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <aside className="hidden w-56 shrink-0 border-r border-white/70 bg-white/65 shadow-[12px_0_30px_rgba(63,39,50,0.06)] backdrop-blur-xl md:block">
          <div className="space-y-4 p-4">
            <div className="h-10 w-32 rounded-lg bg-gray-200/70" />
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, idx) => (
                <div key={idx} className="h-9 rounded-lg bg-gray-100/80" />
              ))}
            </div>
          </div>
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/70 bg-white/80 px-4 backdrop-blur-xl">
            <div className="h-9 w-9 rounded-lg bg-gray-200/70" />
            <div className="h-6 w-28 rounded-lg bg-gray-200/70" />
            <div className="h-9 w-9 rounded-full bg-gray-200/70" />
          </header>
          <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
            <div className="space-y-4">
              <div className="h-10 w-64 rounded-xl bg-gray-200/70" />
              <div className="h-6 w-96 rounded-xl bg-gray-100/80" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="h-28 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* DESKTOP SIDEBAR */}
      <aside className={cn(
        "hidden shrink-0 border-r border-white/70 bg-white/65 shadow-[12px_0_30px_rgba(63,39,50,0.06)] backdrop-blur-xl transition-all duration-300 ease-in-out md:block overflow-y-auto",
        collapsed ? "w-16" : "w-56",
      )}>
        <AdminSidebar secret={secret} collapsed={collapsed} adminName={adminName} />
      </aside>

      {/* Mobile sidebar sheet */}
      <AdminMobileSidebar secret={secret} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="flex flex-1 flex-col h-screen overflow-hidden">

        {/* HEADER */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/70 bg-white/80 shadow-[0_16px_35px_rgba(63,39,50,0.08)] backdrop-blur-xl px-4 gap-4">
          {/* Left side: toggle + branding */}
          <div className="flex items-center gap-3">
            {/* Sidebar toggle (desktop) */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 md:hidden"
              aria-label="Open sidebar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <Image src="/logo.png" alt="EQB logo" width={80} height={24} className="h-6 w-auto object-contain" />
          </div>

          {/* Right side: notifications + admin profile */}
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </button>

            {/* Admin profile */}
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_10px_20px_rgba(122,16,48,0.18)] shrink-0">
                <Image src="/logo.png" alt="EQB logo" width={20} height={20} className="h-5 w-5 object-contain" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900 leading-tight">{adminName}</p>
                <p className="text-xs text-gray-500 leading-tight">EQB Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT — scrolls independently */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
