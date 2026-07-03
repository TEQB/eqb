"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toaster";

interface LeaveSharedCourseProps {
  courseId: string;
  courseCode: string;
  programmeName: string;
  onLeft?: (courseId: string) => void;
}

export function LeaveSharedCourse({
  courseId,
  courseCode,
  programmeName,
  onLeft,
}: LeaveSharedCourseProps) {
  const [loading, setLoading] = useState(false);
  const [left, setLeft] = useState(false);

  const handleLeave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/join-shared`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to leave course");
      }
      setLeft(true);
      toast.success(`Left ${courseCode}`);
      onLeft?.(courseId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave course");
    }
    setLoading(false);
  };

  if (left) {
    return (
      <p className="text-xs text-gray-400 italic">Left shared course</p>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLeave}
      disabled={loading}
      className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      {loading ? "Leaving..." : `Remove ${programmeName}`}
    </button>
  );
}
