"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatSession } from "@/lib/utils";

interface QuestionRowProps {
  id: string;
  year: number;
  semester: string;
  examType: string;
  fileType: string;
  solutionCount: number;
  flagCount: number;
}

export function QuestionRow({
  id,
  year,
  semester,
  examType,
  fileType,
  solutionCount,
  flagCount: _flagCount,
}: QuestionRowProps) {
  return (
    <div className="group flex items-center gap-4 rounded-3xl border border-white/70 bg-white/75 p-4 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl transition-all duration-normal hover:-translate-y-0.5 hover:border-secondary/30 hover:shadow-[0_24px_55px_rgba(63,39,50,0.14)]">
      <Link href={`/question/${id}`} className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 transition-colors duration-normal group-hover:text-secondary">
          {formatSession(year)} — {semester === "first" ? "First" : "Second"} Semester
          <span className="ml-2 text-xs font-normal text-gray-400">
            {examType === "mid_semester" ? "Mid Semester" : "Examination"}
          </span>
        </p>
        <p className="mt-0.5 text-sm text-gray-500">
          <Badge
            variant="outline"
            className="mr-2 border-secondary/25 bg-secondary/10 text-xs text-secondary"
          >
            {fileType.toUpperCase()}
          </Badge>
          {solutionCount} solution{solutionCount !== 1 ? "s" : ""}
        </p>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={`/question/${id}`}
          className="rounded-2xl border border-secondary/30 bg-transparent px-3 py-1.5 text-xs font-medium text-secondary transition-all duration-fast hover:bg-secondary/10 hover:text-primary"
        >
          View
        </Link>
      </div>
    </div>
  );
}
