import { QuestionRow } from "./QuestionRow";
import { Reveal } from "@/components/ui/Reveal";

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

interface QuestionListProps {
  questions: Question[];
  emptyMessage?: string;
}

export function QuestionList({ questions, emptyMessage }: QuestionListProps) {
  if (questions.length === 0) {
    return (
      <div className="clay-surface animate-fade-in p-8 text-center">
        <p className="text-gray-500">{emptyMessage || "No questions found."}</p>
      </div>
    );
  }

  const groupedByYear: Record<number, Question[]> = {};
  questions.forEach((q) => {
    if (!groupedByYear[q.year]) groupedByYear[q.year] = [];
    groupedByYear[q.year].push(q);
  });

  return (
    <div className="space-y-4">
      {Object.entries(groupedByYear)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([year, yearQuestions]) => (
          <Reveal key={year} animation="fade-in-up" threshold={0.05}>
            <h3 className="mb-2 text-sm font-medium text-gray-500">{year}</h3>
            <div className="space-y-2">
              {yearQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <QuestionRow
                    id={q.id}
                    year={q.year}
                    semester={q.semester}
                    examType={q.exam_type}
                    fileType={q.file_type}
                    solutionCount={0}
                    flagCount={q.flag_count}
                  />
                </div>
              ))}
            </div>
          </Reveal>
        ))}
    </div>
  );
}
