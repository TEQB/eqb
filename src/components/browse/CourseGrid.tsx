import { CourseCard } from "./CourseCard";
import { SkeletonCard } from "@/components/ui/skeleton";

interface Course {
  id: string;
  code: string;
  title: string;
  level: number;
  scope: "departmental" | "shared" | "general";
  questionCount?: number;
  solutionCount?: number;
}

interface CourseGridProps {
  courses: Course[];
  emptyMessage?: string;
  loading?: boolean;
}

export function CourseGrid({ courses, emptyMessage, loading }: CourseGridProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-fade-in-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <SkeletonCard />
          </div>
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="clay-surface animate-fade-in p-8 text-center">
        <p className="text-gray-500">
          {emptyMessage || "No courses found."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course, idx) => (
        <div
          key={course.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${idx * 80}ms` }}
        >
          <CourseCard
            id={course.id}
            code={course.code}
            title={course.title}
            level={course.level}
            scope={course.scope}
            questionCount={course.questionCount ?? 0}
            solutionCount={course.solutionCount}
          />
        </div>
      ))}
    </div>
  );
}
