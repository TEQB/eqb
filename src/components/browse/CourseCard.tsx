import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface CourseCardProps {
  id: string;
  code: string;
  title: string;
  level: number;
  scope: "departmental" | "shared" | "general";
  questionCount: number;
  solutionCount?: number;
  className?: string;
}

export function CourseCard({
  id,
  code,
  title,
  level,
  scope,
  questionCount,
  solutionCount,
  className,
}: CourseCardProps) {
  return (
    <Link
      href={`/course/${id}`}
      className={cn(
        "group block rounded-3xl border border-white/70 bg-white/75 p-6 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl transition-all duration-normal hover:-translate-y-1 hover:border-secondary/30 hover:shadow-[0_24px_55px_rgba(63,39,50,0.14)]",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <p className="font-mono text-sm font-medium text-gray-900 transition-colors duration-normal group-hover:text-secondary">{code}</p>
        {scope === "general" && (
          <Badge variant="default" className="bg-primary text-primary-foreground">
            General
          </Badge>
        )}
        {scope === "shared" && (
          <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
            Shared
          </Badge>
        )}
      </div>
      <p className="mt-1 text-base font-medium text-gray-900">{title}</p>
      <p className="mt-2 text-sm text-gray-500 transition-colors duration-normal group-hover:text-gray-700">
        Level {level} · {questionCount} question{questionCount !== 1 ? "s" : ""}
      </p>
      {solutionCount !== undefined && solutionCount > 0 && (
        <p className="text-sm text-gray-500">
          {solutionCount} solution{solutionCount !== 1 ? "s" : ""}
        </p>
      )}
    </Link>
  );
}
