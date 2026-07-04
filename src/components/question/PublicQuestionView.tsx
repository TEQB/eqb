"use client";

import { useEffect, useState, useCallback } from "react";
import { ImageViewer } from "@/components/question/ImageViewer";
import { formatSession } from "@/lib/utils";

interface QuestionPage {
  id: string;
  page_number: number;
  file_url: string;
  file_type: string;
}

interface Props {
  questionId: string;
  courseCode: string | null;
  courseTitle: string | null;
  year: number;
  semester: string;
  examType: string;
  level: number;
  pages: QuestionPage[];
}

export function PublicQuestionView({
  questionId,
  courseCode,
  courseTitle,
  year,
  semester,
  examType,
  level,
  pages,
}: Props) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const page = pages[currentPageIndex];

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handler = () => {
      window.location.href = `/question/${questionId}`;
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [questionId]);

  const goNext = useCallback(() => {
    setCurrentPageIndex((i) => Math.min(i + 1, pages.length - 1));
  }, [pages.length]);

  const goPrev = useCallback(() => {
    setCurrentPageIndex((i) => Math.max(i - 1, 0));
  }, []);

  const goToBack = useCallback(() => {
    window.location.href = `/question/${questionId}`;
  }, [questionId]);

  if (!page) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <header className="flex shrink-0 items-center justify-between px-4 py-3">
        <div className="min-w-0 flex-1">
          {courseCode && (
            <p className="truncate text-sm font-medium text-white/90">
              {courseCode} — {courseTitle ?? ""}
            </p>
          )}
          <p className="text-xs text-white/50">
            Level {level} · {examType === "mid_semester" ? "Mid Semester" : "Examination"} ·{" "}
            {formatSession(year)} · {semester} semester
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {pages.length > 1 && (
            <span className="text-xs text-white/50">
              {currentPageIndex + 1} / {pages.length}
            </span>
          )}
          <button
            onClick={goToBack}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
          >
            Back
          </button>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center overflow-hidden min-h-0 relative">
        {pages.length > 1 && currentPageIndex > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/25 transition-colors"
            aria-label="Previous page"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}

        {pages.length > 1 && currentPageIndex < pages.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/25 transition-colors"
            aria-label="Next page"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}

        {page.file_type === "pdf" ? (
          <iframe
            src={`/api/storage/${page.file_url}`}
            className="h-full w-full"
            title={`Page ${page.page_number}`}
          />
        ) : (
          <div className="flex items-center justify-center h-full w-full p-4">
            <ImageViewer
              src={`/api/storage/${page.file_url}`}
              alt={`Past question ${formatSession(year)} — page ${page.page_number}`}
            />
          </div>
        )}
      </div>

      {pages.length > 1 && (
        <footer className="flex shrink-0 items-center justify-center gap-1.5 px-4 py-3">
          {pages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setCurrentPageIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentPageIndex
                  ? "w-6 bg-white"
                  : "w-1.5 bg-white/30 hover:bg-white/50"
              }`}
              aria-label={`Go to page ${p.page_number}`}
            />
          ))}
        </footer>
      )}
    </div>
  );
}
