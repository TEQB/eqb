import Link from "next/link";
import { cn } from "@/lib/utils";

interface ObligationBannerProps {
  daysRemaining: number;
}

export function ObligationBanner({ daysRemaining }: ObligationBannerProps) {
  if (daysRemaining <= 0 || daysRemaining > 14) return null;

  const isDanger = daysRemaining <= 3;

  return (
    <div
      className={cn(
        "animate-fade-in-down flex items-start gap-3 border-l-4 px-4 py-3 text-sm",
        isDanger
          ? "border-danger-600 bg-danger-50 text-danger-700"
          : "border-warning-600 bg-warning-50 text-warning-700",
      )}
    >
      <svg
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          isDanger ? "text-danger-600" : "text-warning-600",
        )}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <div className="flex-1">
        <span className="font-medium">
          You have {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} to upload a
          past question
        </span>{" "}
        to maintain access.{" "}
        <Link href="/upload" className="font-medium underline transition-opacity hover:opacity-80">
          Upload now
        </Link>
      </div>
    </div>
  );
}
