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
  const [joined, setJoined] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/join-shared`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add course");
      }
      setJoined(true);
      if (data.message === "already_added") {
        toast.info(`${programmeName} already takes ${courseCode}`);
      } else {
        toast.success(`${programmeName} now takes ${courseCode}`);
      }
      onJoined?.(courseId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add course");
    }
    setLoading(false);
  };

  if (joined) {
    return (
      <p className="text-xs text-success-700">
        {programmeName} is linked to this course.
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
          {loading ? "Adding..." : `${programmeName} also takes this course`}
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
        {loading ? "Adding..." : `${programmeName} also takes this course`}
      </button>
    </div>
  );
}
