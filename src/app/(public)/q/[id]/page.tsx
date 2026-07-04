import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { PublicQuestionView } from "@/components/question/PublicQuestionView";

interface QuestionPage {
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
  level: number;
  courses: {
    code: string;
    title: string;
  } | null;
}

export default async function PublicQuestionPage({
  params,
}: {
  params: { id: string };
}) {
  const service = createServiceClient();

  const [questionRes, pagesRes] = await Promise.all([
    service
      .from("past_questions")
      .select("id, course_id, year, semester, exam_type, file_url, file_type, level, courses:course_id!inner(code, title)")
      .eq("id", params.id)
      .eq("status", "published")
      .single(),
    service
      .from("past_question_pages")
      .select("id, page_number, file_url, file_type")
      .eq("question_id", params.id)
      .order("page_number", { ascending: true }),
  ]);

  if (questionRes.error || !questionRes.data) {
    redirect("/");
  }

  const question = questionRes.data as unknown as Question;
  const pages = (pagesRes.data ?? []) as QuestionPage[];

  if (pages.length === 0) {
    const firstPage: QuestionPage = {
      id: question.id,
      page_number: 1,
      file_url: question.file_url,
      file_type: question.file_type,
    };
    pages.push(firstPage);
  }

  return (
    <PublicQuestionView
      questionId={question.id}
      courseCode={question.courses?.code ?? null}
      courseTitle={question.courses?.title ?? null}
      year={question.year}
      semester={question.semester}
      examType={question.exam_type}
      level={question.level}
      pages={pages}
    />
  );
}
