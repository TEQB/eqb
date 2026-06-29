import dynamic from "next/dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const PdfViewer = dynamic(
  () => import("@/components/question/PdfViewer").then((mod) => mod.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">Loading PDF viewer...</p>
      </div>
    ),
  },
);

const FlagModal = dynamic(
  () => import("@/components/question/FlagModal").then((mod) => mod.FlagModal),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        className="rounded-2xl px-3 py-1.5 text-xs font-medium text-gray-500 opacity-60"
      >
        Flag
      </button>
    ),
  },
);

const EnlargeableImage = dynamic(
  () =>
    import("@/components/question/EnlargeableImage").then((mod) => mod.EnlargeableImage),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">Loading image viewer...</p>
      </div>
    ),
  },
);

const SolutionList = dynamic(
  () => import("@/components/solutions/SolutionList").then((mod) => mod.SolutionList),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
      </div>
    ),
  },
);

const SolutionForm = dynamic(
  () => import("@/components/solutions/SolutionForm").then((mod) => mod.SolutionForm),
  {
    ssr: false,
    loading: () => (
      <div className="h-11 w-36 animate-pulse rounded-md bg-gray-100" />
    ),
  },
);

export default async function QuestionPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: rawQuestion } = await supabase
    .from("past_questions")
    .select("*, course:course_id(code, title, level, department_id)")
    .eq("id", params.id)
    .single();
  const question = rawQuestion as unknown as {
    id: string;
    year: number;
    semester: "first" | "second";
    exam_type: string;
    file_type: "pdf" | "image";
    file_url: string;
    level: number;
    status: string;
    course: { code: string; title: string; level: number; department_id: string };
  } | null;

  if (!question || question.status !== "published") {
    redirect("/dashboard");
  }

  const [rawProfile, rawSolutions] = await Promise.all([
    supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single(),
    supabase
      .from("solutions")
      .select("*, submitted_by_profile:submitted_by(full_name)")
      .eq("question_id", params.id)
      .eq("status", "published")
      .order("created_at", { ascending: false }),
  ]);
  const currentProfile = rawProfile.data as unknown as { id: string } | null;
  const currentProfileId = currentProfile?.id;

  const dbSolutions = rawSolutions.data as unknown as Array<{
    id: string;
    body: string | null;
    submitted_by: string;
    file_url: string | null;
    upvotes: number;
    downvotes: number;
    rating_sum: number;
    rating_count: number;
    submitted_by_profile: { full_name: string } | null;
    created_at: string;
  }> | null;

  const myVotes: Record<string, "up" | "down"> = {};
  const myRatings: Record<string, number> = {};
  if (currentProfileId) {
    const [voteResult, ratingResult] = await Promise.all([
      supabase
        .from("solution_votes")
        .select("solution_id, vote")
        .eq("voter_id", currentProfileId),
      supabase
        .from("solution_ratings")
        .select("solution_id, rating")
        .eq("rater_id", currentProfileId),
    ]);
    const votes = voteResult.data as unknown as Array<{
      solution_id: string;
      vote: "up" | "down";
    }> | null;
    if (votes) {
      for (const v of votes) myVotes[v.solution_id] = v.vote;
    }
    const ratings = ratingResult.data as unknown as Array<{
      solution_id: string;
      rating: number;
    }> | null;
    if (ratings) {
      for (const r of ratings) myRatings[r.solution_id] = r.rating;
    }
  }

  const solutions = (dbSolutions || []).map((s) => {
    const profile = s.submitted_by_profile as unknown as {
      full_name: string;
    } | null;
    return {
      id: s.id,
      body: s.body,
      file_url: s.file_url,
      submitted_by: s.submitted_by,
      author_name: profile?.full_name || "Anonymous",
      upvotes: s.upvotes ?? 0,
      downvotes: s.downvotes ?? 0,
      user_vote: (myVotes[s.id] ?? null) as "up" | "down" | null,
      is_own: currentProfileId === s.submitted_by,
      created_at: s.created_at,
      rating_sum: s.rating_sum ?? 0,
      rating_count: s.rating_count ?? 0,
      user_rating: (myRatings[s.id] ?? null) as number | null,
    };
  });

  const course = question.course;

  return (
    <div className="space-y-6">
      <p className="animate-fade-in-down text-sm text-gray-500">
        <Link href="/dashboard" className="transition-colors hover:text-secondary">
          Dashboard
        </Link>{" "}
        / {course.code}
      </p>

      <div className="animate-fade-in-up stagger-1 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary">
            {question.year} — {question.semester === "first" ? "First" : "Second"} Semester
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-mono">{course.code}</span> · Level{" "}
            {question.level} · {question.exam_type === "mid_semester" ? "Mid Semester" : "Examination"} ·{" "}
            <Badge
              variant="outline"
              className="border-secondary/25 bg-secondary/10 text-xs text-secondary"
            >
              {question.file_type.toUpperCase()}
            </Badge>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FlagModal questionId={question.id} />
        </div>
      </div>

      <div className="animate-fade-in-up stagger-2">
        {question.file_type === "pdf" ? (
          <PdfViewer fileUrl={question.file_url} />
        ) : (
          <EnlargeableImage
            src={`/api/storage/${question.file_url}`}
            alt={`Past question ${question.year}`}
            year={question.year}
          />
        )}
      </div>

      <hr className="animate-fade-in border-white/70" />

      <div className="animate-fade-in-up stagger-3">
        <h3 className="text-lg font-medium text-primary">
          Community Solutions
        </h3>
        <SolutionList solutions={solutions} />
        <div className="mt-4">
          <SolutionForm questionId={params.id} />
        </div>
      </div>
    </div>
  );
}
