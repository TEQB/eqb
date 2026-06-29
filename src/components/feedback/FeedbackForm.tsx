"use client";

import { useState } from "react";

export function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmed = message.trim();
    if (trimmed.length < 10) {
      setError("Please write at least 10 characters so we can understand your idea.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error || "Could not send feedback");
      setLoading(false);
      return;
    }

    setMessage("");
    setSuccess("Thanks. Your feedback has been sent to the admin team.");
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.5rem] border border-white/70 bg-white/75 p-5 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl">
      <div>
        <label htmlFor="feedback" className="mb-2 block text-sm font-semibold text-gray-700">
          Tell us what we can do better
        </label>
        <textarea
          id="feedback"
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Share bugs, ideas, missing features, or anything that would make EQB better."
          className="block w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
        />
      </div>

      {error && <p className="text-sm text-danger-600">{error}</p>}
      {success && <p className="text-sm text-success-600">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send Feedback"}
      </button>
    </form>
  );
}
