"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LevelTabsProps {
  levels: number[];
  activeLevel: number;
}

export function LevelTabs({ levels, activeLevel }: LevelTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLevelChange = (level: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("level", level.toString());
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {levels.map((level) => (
        <Button
          key={level}
          onClick={() => handleLevelChange(level)}
          className={cn(
            "relative rounded-2xl px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-normal",
            activeLevel === level
              ? "bg-secondary text-white shadow-[0_14px_28px_rgba(212,117,10,0.2)]"
              : "bg-white/80 text-gray-700 hover:bg-secondary/10 hover:text-secondary",
          )}
        >
          {level} Level
        </Button>
      ))}
    </div>
  );
}
