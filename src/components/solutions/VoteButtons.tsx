"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface VoteButtonsProps {
  solutionId: string;
  upvotes: number;
  downvotes: number;
  userVote: "up" | "down" | null;
  isOwn: boolean;
}

export function VoteButtons({
  solutionId,
  upvotes: initialUpvotes,
  downvotes: initialDownvotes,
  userVote: initialUserVote,
  isOwn,
}: VoteButtonsProps) {
  const supabase = createClient();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [error, setError] = useState("");

  const handleVote = async (vote: "up" | "down") => {
    if (isOwn) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    const profile = rawProfile as unknown as { id: string } | null;
    if (!profile) return;

    // Optimistic update
    if (userVote === vote) return;
    if (userVote === "up") setUpvotes((p) => p - 1);
    if (userVote === "down") setDownvotes((p) => p - 1);
    setUpvotes((p) => p + (vote === "up" ? 1 : 0));
    setDownvotes((p) => p + (vote === "down" ? 1 : 0));
    setUserVote(vote);

    const { error: insertError } = await supabase.from("solution_votes").insert({
      solution_id: solutionId,
      voter_id: profile.id,
      vote,
    } as never);

    if (insertError) {
      // Revert
      setUpvotes(initialUpvotes);
      setDownvotes(initialDownvotes);
      setUserVote(initialUserVote);
      if (insertError.code === "23505") {
        setError("Already voted");
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => handleVote("up")}
        disabled={isOwn}
        title={isOwn ? "Can't vote on your own solution" : "Upvote"}
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all duration-fast active:scale-90",
          userVote === "up"
            ? "bg-success-50 text-success-600"
            : "text-gray-500 hover:bg-gray-100",
          isOwn && "cursor-not-allowed opacity-50",
        )}
      >
        <svg className={cn("h-3.5 w-3.5 transition-transform", userVote === "up" && "scale-110")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
        {upvotes}
      </button>
      <button
        type="button"
        onClick={() => handleVote("down")}
        disabled={isOwn}
        title={isOwn ? "Can't vote on your own solution" : "Downvote"}
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all duration-fast active:scale-90",
          userVote === "down"
            ? "bg-danger-50 text-danger-600"
            : "text-gray-500 hover:bg-gray-100",
          isOwn && "cursor-not-allowed opacity-50",
        )}
      >
        <svg className={cn("h-3.5 w-3.5 transition-transform", userVote === "down" && "scale-110")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
        {downvotes}
      </button>
      {error && <span className="text-xs text-gray-400 animate-fade-in">{error}</span>}
    </div>
  );
}
