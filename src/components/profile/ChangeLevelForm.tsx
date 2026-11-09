"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";

interface ChangeLevelFormProps {
  currentLevel: number;
  /** Levels available for the student's programme. */
  availableLevels: number[];
}

/**
 * Lets a student change their own current level. Only rendered when the admin
 * has enabled level change (platform_settings.level_change_enabled). The
 * update_student_level() RPC re-validates the setting + level server-side.
 */
export function ChangeLevelForm({ currentLevel, availableLevels }: ChangeLevelFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [level, setLevel] = useState(String(currentLevel));
  const [saving, setSaving] = useState(false);

  const newLevel = Number(level);
  const unchanged = !newLevel || newLevel === currentLevel;

  const handleSave = async () => {
    if (unchanged) return;
    setSaving(true);
    const { error } = await supabase.rpc("update_student_level", { p_level: newLevel });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Could not update your level");
      return;
    }
    toast.success("Level updated");
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={level} onValueChange={(v) => setLevel(v ?? "")}>
        <SelectTrigger className="h-10 w-40 rounded-xl px-4 focus-visible:ring-[#7A1030]">
          <SelectValue placeholder="Select level">
            {(value: string) => (value ? `${value} Level` : "Select level")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableLevels.map((l) => (
            <SelectItem key={l} value={String(l)}>
              {l} Level
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || unchanged}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
