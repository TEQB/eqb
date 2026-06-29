"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

const links = [
  { href: "#home", label: "Home" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#browse", label: "Browse" },
];

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-transparent transition-all duration-300",
        scrolled
          ? "border-white/70 bg-white/80 shadow-[0_16px_35px_rgba(63,39,50,0.08)] backdrop-blur-xl"
          : "bg-white/55 backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 py-3 lg:px-8">
        <Link href="#home" className="flex items-center">
          <Image
            src="/logo.png"
            alt="EQB logo"
            width={160}
            height={48}
            className="h-12 w-auto object-contain"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-secondary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex rounded-full border border-primary bg-transparent px-4 py-2.5 text-sm font-medium text-primary transition-all hover:-translate-y-0.5 hover:border-secondary hover:text-secondary sm:px-5"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-[0_14px_28px_rgba(122,16,48,0.18)] transition-all hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-[0_18px_34px_rgba(122,16,48,0.22)]"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
