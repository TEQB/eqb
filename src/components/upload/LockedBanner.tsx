import { Lock } from "lucide-react";

interface LockedBannerProps {
  /** Optional admin-set reason for the lock (profiles.lock_reason). */
  reason?: string | null;
}

/**
 * Shown on the upload page when a locked student is redirected to
 * /upload?locked=true. Explains *why* access is restricted instead of
 * leaving them stranded on the upload page.
 */
export function LockedBanner({ reason }: LockedBannerProps) {
  const hasReason = reason && reason.trim().length > 0;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-4 text-sm text-danger-700 animate-fade-in-down">
      <Lock className="mt-0.5 h-5 w-5 shrink-0 text-danger-600" />
      <div className="flex-1">
        <p className="font-semibold text-danger-700">Your account access is restricted</p>
        <p className="mt-1 text-danger-700/90">
          {hasReason ? (
            <>
              <span className="font-medium">{reason!.trim()}</span>{" "}
              — upload a past question below to regain full access to EQB.
            </>
          ) : (
            <>
              You haven&apos;t uploaded a past question within the required period.
              Upload one below to regain full access to EQB.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
