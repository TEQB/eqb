"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toaster";

type AdminProfile = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

export function AdminManagement() {
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function loadAdmins() {
    const res = await fetch("/api/admin?action=list-admins");
    const data = await res.json();
    if (data.admins) setAdmins(data.admins);
    setLoading(false);
  }

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setMsg(null);

    const formData = new FormData();
    formData.set("email", email);
    formData.set("fullName", fullName);

    const res = await fetch("/api/admin?action=invite-admin", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (res.ok) {
      setMsg({ text: `Invitation sent to ${email}`, ok: true });
      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      setFullName("");
      await loadAdmins();
    } else {
      const err = data.error || "Failed to send invitation";
      setMsg({ text: err, ok: false });
      toast.error(err);
    }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-sm font-semibold text-gray-900">Invite New Admin</h3>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="e.g. Jane Doe"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@university.edu.ng"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {sending ? "Sending invitation..." : "Send Invitation"}
          </button>
          {msg && (
            <p className={`rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700"}`}>
              {msg.text}
            </p>
          )}
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Current Admins
            <span className="ml-1.5 text-xs font-normal text-gray-400">({admins.length})</span>
          </h3>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : admins.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                  {a.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{a.full_name}</p>
                  <p className="truncate text-xs text-gray-400">{a.email}</p>
                </div>
                <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-medium text-primary-700">
                  Admin
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <p className="text-sm text-gray-400">No admins found</p>
          </div>
        )}
      </div>
    </div>
  );
}
