"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toaster";

interface JoinSharedCourseProps {
  courseId: string;
  courseCode: string;
  programmeName: string;
  onJoined?: (courseId: string) => void;
  variant?: "banner" | "inline";
}

export function JoinSharedCourse({
  courseId,
  courseCode,
  programmeName,
  onJoined,
  variant = "banner",
}: JoinSharedCourseProps) {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<"idle" | "joined" | "requested" | "pending">("idle");

  const handleJoin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/join-shared`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add course");
      }
      if (data.message === "already_added") {
        setState("joined");
        toast.info(`${programmeName} already takes ${courseCode}`);
        onJoined?.(courseId);
      } else if (data.message === "request_pending") {
        setState("pending");
        toast.info(`Approval for ${courseCode} already requested`);
      } else if (data.message === "request_created") {
        setState("requested");
        toast.success(`Request sent — ${programmeName} needs 2 approvals to take ${courseCode}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add course");
    }
    setLoading(false);
  };

  if (state === "joined") {
    return (
      <p className="text-xs text-success-700">
        {programmeName} is linked to this course.
      </p>
    );
  }

  if (state === "requested" || state === "pending") {
    return (
      <p className="text-xs text-amber-700">
        Approval pending — waiting for your programme-mates to vote.
      </p>
    );
  }

  if (variant === "inline") {
    return (
      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          disabled={loading}
          onChange={(e) => {
            if (e.target.checked) handleJoin();
          }}
          className="rounded border-gray-400 text-primary-600 focus:ring-primary-500"
        />
        <span>
          {loading ? "Requesting..." : `${programmeName} also takes this course`}
        </span>
      </label>
    );
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
      <p className="text-sm text-blue-900">
        This is a shared course your programme is not yet linked to.
      </p>
      <button
        type="button"
        onClick={handleJoin}
        disabled={loading}
        className="mt-2 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {loading ? "Requesting..." : `${programmeName} also takes this course`}
      </button>
    </div>
  );
}
