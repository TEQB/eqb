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

interface PastQuestionPage {
  id: string;
  page_number: number;
  file_url: string;
  file_type: string;
}

interface Question {
  id: string;
  course_id: string;
  year: number;
  semester: string;
  exam_type: string;
  file_url: string;
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
  const [pages, setPages] = useState<PastQuestionPage[]>([]);
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

      const [questionRes, pagesRes, solutionsRes] = await Promise.all([
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
          .from("past_question_pages")
          .select("id, page_number, file_url, file_type")
          .eq("question_id", params.id)
          .order("page_number", { ascending: true }),
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

      const loadedPages = (pagesRes.data ?? []) as PastQuestionPage[];
      setPages(loadedPages);

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
        {pages.map((page) => (
          <div key={page.id} className="rounded-2xl border border-gray-200 bg-white">
            <p className="mb-3 px-4 pt-4 text-sm font-medium text-gray-600 flex items-center gap-2">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Page {page.page_number}
            </p>
            {page.file_type === "pdf" ? (
              <iframe
                src={`/api/storage/${page.file_url}`}
                className="w-full min-h-[600px] rounded-2xl border-0"
                title={`Past question ${question.year} — page ${page.page_number}`}
              />
            ) : (
              <img
                src={`/api/storage/${page.file_url}`}
                alt={`Past question ${question.year} — page ${page.page_number}`}
                className="max-w-full h-auto"
              />
            )}
          </div>
        ))}
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