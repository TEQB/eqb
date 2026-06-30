"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toaster";

export function SettingsForm({
  initialDays,
  initialLockout,
}: {
  initialDays: number;
  initialLockout: boolean;
}) {
  const [days, setDays] = useState(initialDays);
  const [lockout, setLockout] = useState(initialLockout);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const formData = new FormData();
    formData.set("upload_obligation_days", String(days));
    if (lockout) formData.set("lockout_enabled", "on");

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
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
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
