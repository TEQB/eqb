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
  const [state, setState] = useState<"idle" | "left" | "requested" | "pending">("idle");

  const handleLeave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/join-shared`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to leave course");
      }
      if (data.message === "not_linked") {
        setState("left");
        toast.info(`${courseCode} is not linked to your programme`);
        onLeft?.(courseId);
      } else if (data.message === "request_pending") {
        setState("pending");
        toast.info(`Removal request for ${courseCode} already pending`);
      } else if (data.message === "request_created") {
        setState("requested");
        toast.success(`Request sent — needs 2 approvals to remove ${courseCode}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave course");
    }
    setLoading(false);
  };

  if (state === "left") {
    return (
      <p className="text-xs text-gray-400 italic">Left shared course</p>
    );
  }

  if (state === "requested" || state === "pending") {
    return (
      <p className="text-xs text-amber-600 italic">Removal pending — awaiting votes</p>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLeave}
      disabled={loading}
      className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      {loading ? "Requesting..." : `Remove ${programmeName}`}
    </button>
  );
}
