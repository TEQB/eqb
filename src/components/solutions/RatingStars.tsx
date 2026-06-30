"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

interface RatingStarsProps {
  solutionId: string;
  ratingCount: number;
  ratingSum: number;
  initialUserRating: number | null;
  isOwn: boolean;
  onRated?: () => void;
}

export function RatingStars({
  solutionId,
  ratingCount,
  ratingSum,
  initialUserRating,
  isOwn,
  onRated,
}: RatingStarsProps) {
  const supabase = createClient();
  const [hover, setHover] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(initialUserRating);
  const [sum, setSum] = useState(ratingSum);
  const [count, setCount] = useState(ratingCount);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setUserRating(initialUserRating);
    setSum(ratingSum);
    setCount(ratingCount);
  }, [initialUserRating, ratingSum, ratingCount]);

  const average = count > 0 ? sum / count : 0;
  const display =
    hover > 0
      ? hover
      : userRating && !submitting
        ? userRating
        : Math.round(average);

  const submit = async (rating: number) => {
    if (isOwn || submitting) return;
    setSubmitting(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sign in to rate");
      toast.warning("Sign in to rate this solution");
      setSubmitting(false);
      return;
    }

    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    const profile = rawProfile as unknown as { id: string } | null;
    if (!profile) {
      setError("Profile not found");
      toast.error("Profile not found — try signing out and back in");
      setSubmitting(false);
      return;
    }

    // Upsert preserves existing rating while updating the count math on the server.
    const { error: upsertError } = await supabase
      .from("solution_ratings")
      .upsert(
        {
          solution_id: solutionId,
          rater_id: profile.id,
          rating,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "solution_id,rater_id" },
      );

    if (upsertError) {
      setError("Failed to save rating");
      toast.error("Failed to save rating");
      setSubmitting(false);
      return;
    }

    // Optimistic local update so the user sees their rating take effect immediately.
    setUserRating(rating);
    if (initialUserRating == null) {
      setSum((p) => p + rating);
      setCount((p) => p + 1);
    } else {
      setSum((p) => p + (rating - initialUserRating));
    }
    setSubmitting(false);
    toast.success(
      initialUserRating == null
        ? `Rated ${rating} star${rating > 1 ? "s" : ""}`
        : `Updated rating to ${rating} star${rating > 1 ? "s" : ""}`,
    );
    onRated?.();
  };

  if (isOwn) {
    return (
      <RatingReadOnly
        average={average}
        count={count}
        hint="You can't rate your own solution"
      />
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        className="inline-flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= display;
          return (
            <button
              key={star}
              type="button"
              aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
              disabled={submitting}
              onMouseEnter={() => setHover(star)}
              onClick={() => submit(star)}
              className={cn(
                "transition-transform active:scale-90",
                submitting && "cursor-wait opacity-60",
                !submitting && "hover:scale-110",
              )}
            >
              <svg
                className={cn(
                  "h-5 w-5 transition-colors",
                  filled
                    ? userRating
                      ? "fill-secondary stroke-secondary"
                      : "fill-secondary-300 stroke-secondary-300"
                    : "fill-transparent stroke-gray-300",
                )}
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            </button>
          );
        })}
        <span className="ml-2 text-xs font-medium text-gray-600">
          {count === 0
            ? "Be the first to rate"
            : `${average.toFixed(1)} · ${count} rating${count !== 1 ? "s" : ""}`}
        </span>
      </div>
      {userRating != null && (
        <p className="text-[11px] text-gray-400">You rated {userRating}/5</p>
      )}
      {error && <p className="text-[11px] text-danger-500">{error}</p>}
    </div>
  );
}

function RatingReadOnly({
  average,
  count,
  hint,
}: {
  average: number;
  count: number;
  hint?: string;
}) {
  const rounded = Math.round(average);
  return (
    <div className="flex flex-col gap-1">
      <div className="inline-flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= rounded && count > 0;
          return (
            <svg
              key={star}
              className={cn(
                "h-5 w-5",
                filled
                  ? "fill-secondary-300 stroke-secondary-300"
                  : "fill-transparent stroke-gray-200",
              )}
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          );
        })}
        <span className="ml-2 text-xs font-medium text-gray-500">
          {count === 0 ? "No ratings yet" : `${average.toFixed(1)} · ${count}`}
        </span>
      </div>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}
