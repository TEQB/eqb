"use client";

import Link from "next/link";
import { useState } from "react";

export function AdminMobileNav({ secret }: { secret: string }) {
  const [open, setOpen] = useState(false);

  const links = [
    { href: `/admin/${secret}/dashboard`, label: "Dashboard" },
    { href: `/admin/${secret}/admins`, label: "Admins" },
    { href: `/admin/${secret}/data`, label: "Data" },
    { href: `/admin/${secret}/questions`, label: "Questions" },
    { href: `/admin/${secret}/students`, label: "Students" },
    { href: `/admin/${secret}/settings`, label: "Settings" },
    { href: `/admin/${secret}/feedback`, label: "Feedback" },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 md:hidden"
        aria-label="Toggle navigation"
      >
        <svg
          className="h-5 w-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {open ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 border-b border-white/60 bg-white/85 shadow-[0_18px_45px_rgba(63,39,50,0.12)] backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-4 pb-3 pt-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-3 py-2 text-sm text-gray-600 hover:bg-secondary/10 hover:text-secondary"
              >
                {link.label}
              </Link>
            ))}
            <form action="/auth/signout" method="post" className="px-3 pt-1">
              <button
                type="submit"
                className="text-sm text-secondary hover:text-primary"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
