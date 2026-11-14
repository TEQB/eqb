"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { formatSession } from "@/lib/utils";

interface QuestionFiltersProps {
  year?: string;
  semester?: string;
}

export function QuestionFilters({ year, semester }: QuestionFiltersProps) {
  const router = useRouter();

  const currentYear = year || "";
  const currentSemester = semester || "";

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(window.location.search);
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`?${params.toString()}`);
    },
    [router],
  );

  const years = Array.from(
    { length: new Date().getFullYear() - 2018 + 1 },
    (_, i) => (2018 + i).toString(),
  ).reverse();

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
      <select
        value={currentYear}
        onChange={(e) => updateFilter("year", e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100 sm:w-auto"
      >
        <option value="">All sessions</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {formatSession(Number(y))}
          </option>
        ))}
      </select>

      <select
        value={currentSemester}
        onChange={(e) => updateFilter("semester", e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100 sm:w-auto"
      >
        <option value="">Both semesters</option>
        <option value="first">First</option>
        <option value="second">Second</option>
      </select>
    </div>
  );
}
