"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FlagModalProps {
  questionId: string;
}

const reasons = [
  { value: "wrong_course", label: "Wrong course" },
  { value: "poor_quality", label: "Poor quality" },
  { value: "duplicate", label: "Duplicate" },
  { value: "inappropriate", label: "Inappropriate" },
] as const;

export function FlagModal({ questionId }: FlagModalProps) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!selected) return;
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    const profile = rawProfile as unknown as { id: string } | null;

    if (!profile) return;

    const { error: insertError } = await supabase.from("flags").insert({
      question_id: questionId,
      flagged_by: profile.id,
      reason: selected as "wrong_course" | "poor_quality" | "duplicate" | "inappropriate",
    } as never);

    if (insertError) {
      if (insertError.code === "23505") {
        setError("You've already flagged this question");
        toast.warning("You've already flagged this question");
      } else {
        setError("Something went wrong. Please try again.");
        toast.error("Could not submit report. Please try again.");
      }
      return;
    }

    toast.success("Report submitted — thanks for keeping EQB clean");
    setMessage("Thanks for reporting");
    setTimeout(() => {
      setOpen(false);
      setMessage("");
      setSelected("");
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex items-center gap-1.5 rounded-2xl border border-white/70 bg-white/75 px-3 py-1.5 text-xs font-medium text-gray-500 transition-all duration-normal hover:-translate-y-0.5 hover:border-secondary/40 hover:bg-secondary/10 hover:text-secondary hover:shadow-[0_12px_24px_rgba(212,117,10,0.16)] active:scale-[0.97]"
        aria-label="Flag this question"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3v18M5 4v15c1.5-2 4-3 6.5-3 3 0 4.5 1.5 7.5 1.5V4c-3 0-4.5 1.5-7.5 1.5C9 5.5 6.5 4 5 4z"
          />
        </svg>
        Flag
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this question</DialogTitle>
        </DialogHeader>

        {message ? (
          <p className="text-sm text-success-600">{message}</p>
        ) : (
          <div className="space-y-3">
            {reasons.map((r) => (
              <label
                key={r.value}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/70 bg-white/70 p-3 text-sm transition-all duration-fast hover:bg-secondary/5 has-checked:border-secondary has-checked:bg-secondary/10"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={selected === r.value}
                  onChange={(e) => setSelected(e.target.value)}
                  className="text-secondary transition-all"
                />
                {r.label}
              </label>
            ))}

            {error && <p className="text-sm text-danger-600">{error}</p>}

            <button
              type="button"
              disabled={!selected}
              onClick={handleSubmit}
              className="w-full rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-white transition-all duration-normal hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-[0_16px_30px_rgba(122,16,48,0.2)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit report
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
