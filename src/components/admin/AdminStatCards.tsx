interface StatCard {
  label: string;
  value: number;
  color?: "default" | "success" | "danger" | "warning";
}

export function AdminStatCards({ cards }: { cards: StatCard[] }) {
  const colorMap = {
    default: "text-gray-900",
    success: "text-success-600",
    danger: "text-danger-600",
    warning: "text-warning-600",
  };

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{card.label}</p>
          <p className={`mt-1 text-2xl font-bold ${colorMap[card.color || "default"]}`}>
            {card.value.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
