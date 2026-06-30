"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { SolutionList } from "@/components/solutions/SolutionList";
import { SolutionForm } from "@/components/solutions/SolutionForm";
import { FlagModal } from "@/components/question/FlagModal";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Solution {
  id: string;
  body: string | null;
  file_url: string | null;
  upvotes: number;
  downvotes: number;
  rating_sum: number;
  rating_count: number;
  created_at: string;
  submitted_by: string;
  author_name: string;
  user_vote: "up" | "down" | null;
  is_own: boolean;
  user_rating: number | null;
  profiles: {
    full_name: string;
    auth_user_id: string;
  } | null;
}

interface Question {
  id: string;
  course_id: string;
  year: number;
  semester: string;
  exam_type: string;
  file_url: string;
  file_url_2: string | null;
  file_type: string;
  flag_count: number;
  status: string;
  created_at: string;
  uploaded_by: string;
  level: number;
  courses: {
    code: string;
    title: string;
    department_id: string;
    scope: string;
  } | null;
}

export default function QuestionPage({
  params,
}: {
  params: { id: string };
}) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSolutionsModal, setShowSolutionsModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const [questionRes, solutionsRes] = await Promise.all([
        supabase
          .from("past_questions")
          .select(
            `
            *,
            courses(code, title, department_id, scope)
          `,
          )
          .eq("id", params.id)
          .single(),
        supabase
          .from("solutions")
          .select(
            `
            id, body, file_url, upvotes, downvotes, rating_sum, rating_count, created_at,
            submitted_by,
            profiles(full_name, auth_user_id)
          `,
          )
          .eq("question_id", params.id)
          .order("rating_sum", { ascending: false }),
      ]);

      if (questionRes.error) {
        toast.error("Question not found");
        window.location.href = "/dashboard";
        return;
      }
      const q = questionRes.data as unknown as Question;
      setQuestion(q);

      if (solutionsRes.error) {
        toast.error("Could not load solutions");
        return;
      }

      const loadedSolutions: Solution[] = (solutionsRes.data ?? []).map((s) => {
        const sol = s as unknown as Solution & { profiles: { full_name: string; auth_user_id: string } | null };
        return {
          ...sol,
          author_name: sol.profiles?.full_name || "Anonymous",
          user_vote: null,
          is_own: sol.submitted_by === user.id,
          user_rating: null,
        };
      });

      setSolutions(loadedSolutions);
      setLoading(false);

      if (q.status === "pending_review") {
        toast.info(
          "This question is under review. Solutions cannot be submitted yet.",
        );
      }
    };
    loadData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
          <p className="text-sm text-gray-400">Loading question...</p>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up rounded-2xl border border-white/70 bg-white/70 p-5 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-secondary hover:text-secondary/80 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Dashboard
        </Link>

        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {question.courses?.code ?? "—"} — {question.courses?.title ?? "—"}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              {question.level} · {question.exam_type === "mid_semester" ? "Mid Semester" : "Examination"} ·{" "}
              <Badge
                variant="outline"
                className="border-secondary/25 bg-secondary/10 text-xs text-secondary"
              >
                {question.file_type.toUpperCase()}
              </Badge>
              {question.courses?.scope !== "departmental" && (
                <Badge
                  variant="outline"
                  className="ml-1 border-blue-200 bg-blue-50 text-xs text-blue-700"
                >
                  {question.courses?.scope === "shared" ? "Shared" : "General"}
                </Badge>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FlagModal questionId={question.id} />
          </div>
        </div>
      </div>

      {/* File Viewer(s) */}
      <div className="animate-fade-in-up stagger-2 space-y-4">
        {question.file_type === "pdf" ? (
          <iframe
            src={`/api/storage/${question.file_url}`}
            className="w-full min-h-[600px] rounded-2xl border border-gray-200 bg-white"
            title={`Past question ${question.year}`}
          />
        ) : (
          <div className="rounded-2xl overflow-hidden border border-gray-200">
            <img
              src={`/api/storage/${question.file_url}`}
              alt={`Past question ${question.year} — front`}
              className="max-w-full h-auto"
            />
          </div>
        )}

        {question.file_url_2 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="mb-3 text-sm font-medium text-gray-600 flex items-center gap-2">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125m1.5 3.75v-1.5c0-.621-.504-1.125-1.125-1.125m1.5 3.75c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-9.75-6.75h1.5m-1.5 0a1.125 1.125 0 00-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m8.25 0a1.125 1.125 0 011.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125M15 8.25v-.375m0 0a1.125 1.125 0 012.25 0v.375M15 8.25a1.125 1.125 0 00-1.125 1.125v.375M15 8.25c.621 0 1.125.504 1.125 1.125v.375m-2.25 0h2.25M3.375 8.25h17.25" />
              </svg>
              Back Page
            </p>
            {question.file_type === "pdf" ? (
              <iframe
                src={`/api/storage/${question.file_url_2}`}
                className="w-full min-h-[400px] rounded-xl border border-gray-200"
                title={`Past question ${question.year} — back`}
              />
            ) : (
              <img
                src={`/api/storage/${question.file_url_2}`}
                alt={`Past question ${question.year} — back`}
                className="max-w-full h-auto rounded-xl"
              />
            )}
          </div>
        )}
      </div>

      <hr className="animate-fade-in border-white/70" />

      <div className="animate-fade-in-up stagger-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-primary">
            Community Solutions
          </h3>
          {solutions.length > 0 && (
            <button
              onClick={() => setShowSolutionsModal(true)}
              className="text-xs text-secondary hover:text-secondary/80 font-medium"
            >
              View all {solutions.length} solutions
            </button>
          )}
        </div>
        <SolutionList solutions={solutions} />
        <div className="mt-4">
          <SolutionForm questionId={params.id} />
        </div>
      </div>

      {/* Solutions Modal */}
      <Dialog open={showSolutionsModal} onOpenChange={setShowSolutionsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Solutions — {solutions.length}</DialogTitle>
          </DialogHeader>
          <SolutionList solutions={solutions} />
        </DialogContent>
      </Dialog>
    </div>
  );
}