interface AnalyticsCardsProps {
  totalQuestions: number;
  totalStudents: number;
  uploadsToday: number;
  suspendedCount: number;
}

export function AnalyticsCards({
  totalQuestions,
  totalStudents,
  uploadsToday,
  suspendedCount,
}: AnalyticsCardsProps) {
  const cards = [
    { label: "Total Questions", value: totalQuestions, color: "text-gray-900" },
    { label: "Total Students", value: totalStudents, color: "text-gray-900" },
    { label: "Uploads Today", value: uploadsToday, color: "text-gray-900" },
    { label: "Suspended", value: suspendedCount, color: "text-danger-600" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-gray-200 bg-white p-4"
        >
          <p className="text-xs font-medium uppercase text-gray-500">
            {card.label}
          </p>
          <p className={`mt-1 text-2xl font-bold ${card.color}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
