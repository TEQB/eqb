"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QuestionList } from "./QuestionList";

interface Question {
  id: string;
  year: number;
  semester: string;
  exam_type: string;
  file_type: string;
  flag_count: number;
  level: number;
  status: string;
  created_at: string | null;
}

interface LoadMoreQuestionsProps {
  initialQuestions: Question[];
  courseId: string;
  year?: string;
  semester?: string;
}

export function LoadMoreQuestions({
  initialQuestions,
  courseId,
  year,
  semester,
}: LoadMoreQuestionsProps) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [offset, setOffset] = useState(initialQuestions.length);
  const [hasMore, setHasMore] = useState(initialQuestions.length >= 20);
  const [loading, setLoading] = useState(false);
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  const fetchQuestions = useCallback(
    async (startOffset: number, replace: boolean) => {
      setLoading(true);
      const params = new URLSearchParams({
        courseId,
        offset: String(startOffset),
        limit: "20",
      });
      if (year) params.set("year", year);
      if (semester) params.set("semester", semester);

      const res = await fetch(`/api/questions/course?${params}`);
      const data = await res.json();
      if (data.questions) {
        if (replace) {
          setQuestions(data.questions);
          setOffset(data.questions.length);
          setHasMore(data.questions.length >= 20);
        } else {
          setQuestions((prev) => [...prev, ...data.questions]);
          setOffset((prev) => prev + data.questions.length);
          setHasMore(data.questions.length >= 20);
        }
      }
      setLoading(false);
    },
    [courseId, year, semester],
  );

  useEffect(() => {
    setQuestions(initialQuestions);
    setOffset(initialQuestions.length);
    setHasMore(initialQuestions.length >= 20);
  }, [initialQuestions, courseId, year, semester]);

  const loadMore = useCallback(() => {
    fetchQuestions(offsetRef.current, false);
  }, [fetchQuestions]);

  const isEmpty = questions.length === 0 && !loading;

  return (
    <div className="space-y-4">
      {isEmpty ? (
        <div className="clay-surface p-8 text-center">
          <p className="text-gray-500">
            No past questions yet. Be the first to upload!
          </p>
        </div>
      ) : (
        <QuestionList questions={questions} />
      )}
      {loading && (
        <div className="flex justify-center pt-2">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/75 px-6 py-3 text-sm text-gray-400 shadow-[0_12px_24px_rgba(63,39,50,0.06)]">
            <svg className="h-4 w-4 animate-spinner" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        </div>
      )}
      {hasMore && !loading && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            className="inline-flex items-center rounded-2xl border border-secondary/30 bg-transparent px-6 py-2 text-sm font-medium text-secondary transition-all duration-normal hover:bg-secondary/10 hover:shadow-[0_12px_24px_rgba(212,117,10,0.16)] active:scale-[0.98]"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
