import { AlertCircle } from "lucide-react";

/**
 * Nudges open-registration students (no matric number yet) to update their
 * details once they receive their matric number and school email.
 */
export function DetailsReminderBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-secondary/30 bg-secondary/10 px-4 py-4 text-sm text-secondary">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
      <div className="flex-1">
        <p className="font-semibold text-secondary">Update your details</p>
        <p className="mt-1 text-secondary/80">
          You registered without a matric number. When you receive your matric
          number and official university email, please update them on your
          profile so your account stays linked to your record.
        </p>
      </div>
    </div>
  );
}
