"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toaster";

const ALL_LEVELS = [100, 200, 300, 400, 500, 600];

export function SettingsForm({
  initialDays,
  initialLockout,
  initialOpenLevels = [],
  initialLevelChange = false,
}: {
  initialDays: number;
  initialLockout: boolean;
  initialOpenLevels?: number[];
  initialLevelChange?: boolean;
}) {
  const [days, setDays] = useState(initialDays);
  const [lockout, setLockout] = useState(initialLockout);
  const [openLevels, setOpenLevels] = useState<number[]>(initialOpenLevels);
  const [levelChange, setLevelChange] = useState(initialLevelChange);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleLevel = (lvl: number) => {
    setOpenLevels((prev) =>
      prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const formData = new FormData();
    formData.set("upload_obligation_days", String(days));
    if (lockout) formData.set("lockout_enabled", "on");
    openLevels.forEach((l) => formData.append("open_registration_levels", String(l)));
    if (levelChange) formData.set("level_change_enabled", "on");

    const res = await fetch("/api/admin?action=update-settings", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Saved successfully");
      toast.success("Settings saved");
    } else {
      const err = data.error || "Error";
      setMessage(err);
      toast.error(err);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Upload Obligation Window
        </label>
        <p className="mt-0.5 text-xs text-gray-400">
          Days a student can go without uploading before being locked out
        </p>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="block w-32 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
          />
          <span className="text-sm text-gray-500">days</span>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <input
          type="checkbox"
          id="lockout"
          checked={lockout}
          onChange={(e) => setLockout(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-100"
        />
        <div>
          <label htmlFor="lockout" className="text-sm font-medium text-gray-700">
            Automatic lockout enabled
          </label>
          <p className="text-xs text-gray-400">
            Students exceeding the obligation window will be locked automatically
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
        <label className="block text-sm font-medium text-gray-700">
          Open registration levels
        </label>
        <p className="mt-0.5 text-xs text-gray-400">
          Students in these levels can register with any email and no matric
          number (e.g. a new intake). They are reminded to add their matric and
          school email later.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ALL_LEVELS.map((lvl) => {
            const active = openLevels.includes(lvl);
            return (
              <button
                type="button"
                key={lvl}
                onClick={() => toggleLevel(lvl)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary-600 bg-primary-600 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-primary-300"
                }`}
              >
                {lvl} Level
              </button>
            );
          })}
        </div>
        {openLevels.length === 0 && (
          <p className="mt-2 text-xs text-gray-400">
            None selected — all levels require a school email and matric number.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <input
          type="checkbox"
          id="levelChange"
          checked={levelChange}
          onChange={(e) => setLevelChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-100"
        />
        <div>
          <label htmlFor="levelChange" className="text-sm font-medium text-gray-700">
            Allow students to change their own level
          </label>
          <p className="text-xs text-gray-400">
            Lets students update their current level (for a new academic session).
            They can only choose from levels available for their programme.
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Settings"}
      </button>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message === "Saved successfully"
              ? "border border-success-200 bg-success-50 text-success-700"
              : "border border-danger-200 bg-danger-50 text-danger-700"
          }`}
        >
          {message}
        </div>
      )}
    </form>
  );
}
