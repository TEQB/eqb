"use client";

import { useEffect, useRef } from "react";
import { AdminSidebar } from "./AdminSidebar";

export function AdminMobileSidebar({
  secret,
  open,
  onClose,
}: {
  secret: string;
  open: boolean;
  onClose: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="fixed inset-0 bg-black/35 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="fixed left-0 top-0 h-full w-64 border-r border-white/70 bg-white/80 shadow-[0_24px_60px_rgba(63,39,50,0.18)] backdrop-blur-xl"
      >
        <AdminSidebar secret={secret} onClose={onClose} />
      </div>
    </div>
  );
}
