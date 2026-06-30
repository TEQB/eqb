import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { validateEnv } from "@/lib/env";
import { Toaster } from "@/components/ui/toaster";

// Fail fast at build time if env vars are missing
if (typeof window === "undefined") {
  const missing = validateEnv();
  if (missing.length > 0) {
    throw new Error(
      `FATAL: Missing required environment variables: ${missing.join(", ")}. ` +
      "Check .env.example for the full list.",
    );
  }
}

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EQB - Electronic Question Bank",
    template: "%s | EQB",
  },
  description: "EQB is the Electronic Question Bank for browsing, downloading, and uploading past examination questions.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "EQB - Electronic Question Bank",
    description: "Browse, download, and upload past examination questions on EQB.",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "EQB - Electronic Question Bank",
    description: "Browse, download, and upload past examination questions on EQB.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased [scrollbar-width:thin] selection:bg-secondary selection:text-white">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
