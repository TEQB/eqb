"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";

interface Course {
  id: string;
  code: string;
  title: string;
  level: number;
  scope: "departmental" | "shared" | "general";
}

interface MobileSidebarSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generalCourses: Course[];
  programmeCourses: Course[];
  programmeName: string;
  availableLevels: number[];
  currentLevel: number;
}

export function MobileSidebarSheet({
  open,
  onOpenChange,
  generalCourses,
  programmeCourses,
  programmeName,
  availableLevels,
  currentLevel,
}: MobileSidebarSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[290px] p-0">
        <div className="pt-6">
          <Sidebar
            generalCourses={generalCourses}
            programmeCourses={programmeCourses}
            programmeName={programmeName}
            availableLevels={availableLevels}
            currentLevel={currentLevel}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
