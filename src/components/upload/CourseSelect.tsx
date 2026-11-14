"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CourseOption {
  id: string;
  code: string;
  title: string;
  level: number;
  scope: string;
  programme_id?: string;
}

interface CourseGroup {
  key: string;
  label: string;
  items: CourseOption[];
}

const SCOPE_LABELS: Record<string, string> = {
  departmental: "Programme-specific",
  shared: "Shared",
  general: "General",
};

function courseMatches(course: CourseOption, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    course.code,
    course.title,
    SCOPE_LABELS[course.scope] ?? course.scope,
    `${course.level} level`,
  ].some((value) => value.toLowerCase().includes(q));
}

export function CourseSelect({
  value,
  onChange,
  courses,
  joinableCourses = [],
  disabled = false,
}: {
  value: string;
  onChange: (courseId: string) => void;
  courses: CourseOption[];
  joinableCourses?: CourseOption[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const groups = useMemo<CourseGroup[]>(
    () => [
      {
        key: "programme",
        label: "Programme-specific",
        items: courses.filter((course) => course.scope === "departmental"),
      },
      {
        key: "shared",
        label: "Shared",
        items: courses.filter((course) => course.scope === "shared"),
      },
      {
        key: "general",
        label: "General",
        items: courses.filter((course) => course.scope === "general"),
      },
      ...(joinableCourses.length > 0
        ? [
            {
              key: "joinable",
              label: "Shared courses you can join",
              items: joinableCourses,
            },
          ]
        : []),
    ],
    [courses, joinableCourses],
  );

  const selectedCourse = useMemo(
    () => groups.flatMap((group) => group.items).find((course) => course.id === value) ?? null,
    [groups, value],
  );

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((course) => courseMatches(course, query)),
        }))
        .filter((group) => group.items.length > 0),
    [groups, query],
  );

  const totalCourses = courses.length + joinableCourses.length;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    searchRef.current?.focus();

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const chooseCourse = (courseId: string) => {
    onChange(courseId);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-left text-base transition-colors",
          "focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100",
          "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
        )}
      >
        <span className="min-w-0">
          {selectedCourse ? (
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono font-medium text-gray-900">{selectedCourse.code}</span>
              <span className="truncate text-gray-600">{selectedCourse.title}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                {SCOPE_LABELS[selectedCourse.scope] ?? selectedCourse.scope}
              </span>
            </span>
          ) : (
            <span className="text-gray-400">Select course</span>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-gray-400 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[60] mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_20px_45px_rgba(63,39,50,0.16)]">
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by code, title, or level..."
                aria-label="Search courses"
                className="block w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5" role="listbox" aria-label="Courses">
            {visibleGroups.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-gray-500">
                {totalCourses === 0
                  ? "No courses are available for your programme and level yet."
                  : "No courses match your search."}
              </p>
            ) : (
              visibleGroups.map((group) => (
                <div key={group.key} className="mb-1 last:mb-0">
                  <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                    {group.label}
                  </p>
                  {group.items.map((course) => {
                    const isSelected = course.id === value;
                    const isJoinable = group.key === "joinable";
                    return (
                      <button
                        key={course.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => chooseCourse(course.id)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-primary/5",
                          isSelected && "bg-primary/10",
                        )}
                      >
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-gray-900">
                            <span className="font-mono">{course.code}</span> — {course.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-gray-500">
                            {course.level} Level
                            {isJoinable ? " · join required" : ""}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500">
            {totalCourses} course{totalCourses === 1 ? "" : "s"} available
          </div>
        </div>
      )}
    </div>
  );
}
