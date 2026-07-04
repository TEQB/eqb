"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toaster";

interface VoteButtonsProps {
  requestId: string;
  onVoted?: () => void;
}

export function VoteButtons({ requestId, onVoted }: VoteButtonsProps) {
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVote = async (vote: "approve" | "reject") => {
    setLoading(true);
    try {
      const res = await fetch("/api/courses/shared-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, vote }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to vote");
        return;
      }
      setVoted(true);
      if (data.resolved) {
        toast.success(data.message);
      } else {
        toast.success("Your vote has been recorded");
      }
      onVoted?.();
    } catch {
      toast.error("Failed to record vote");
    }
    setLoading(false);
  };

  if (voted) {
    return <span className="text-xs text-gray-500 italic">Vote recorded</span>;
  }

  return (
    <div className="flex gap-2 shrink-0">
      <button
        onClick={() => handleVote("approve")}
        disabled={loading}
        className="rounded-md bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "..." : "Approve"}
      </button>
      <button
        onClick={() => handleVote("reject")}
        disabled={loading}
        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
      >
        {loading ? "..." : "Reject"}
      </button>
    </div>
  );
}
