"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Users, QrCode, Search } from "lucide-react";

interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  member_count?: number;
  is_member?: boolean;
  my_role?: string;
  course?: { id: string; code: string; title: string; level: number };
}

export default function StudyGroupsPage() {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/study-groups?mine=true");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setGroups(data.groups ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    setError(null);
    try {
      const res = await fetch("/api/study-groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join");
      setJoinCode("");
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Study Groups</h1>
        <p className="text-gray-600 mt-1">Chat with classmates about your courses in real time.</p>
      </div>

      {/* Join section */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Join a group</h2>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center bg-gray-50 rounded-xl px-3 h-11 border border-gray-200">
            <Search size={16} className="text-gray-400" />
            <input
              className="flex-1 ml-2 bg-transparent outline-none text-gray-900 placeholder-gray-400"
              placeholder="Invite code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
          </div>
          <button
            onClick={handleJoin}
            disabled={joining}
            className="bg-[#7A1030] text-white px-5 rounded-xl font-semibold h-11 disabled:opacity-60"
          >
            {joining ? "Joining..." : "Join"}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
          <QrCode size={12} /> On mobile, scan a group QR code to join instantly.
        </p>
      </div>

      {/* My groups */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">My Groups</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <Users size={36} className="mx-auto text-gray-300" />
            <p className="text-gray-500 mt-2">
              You are not in any study groups yet. Create one from a course page or join with a code.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/study-groups/${g.id}`}
                className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 bg-[#7A1030]/10 rounded-xl flex items-center justify-center">
                  <MessageCircle size={20} className="text-[#7A1030]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{g.name}</p>
                  {g.course && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {g.course.code} · Level {g.course.level}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {g.member_count ?? "?"} members · You are {g.my_role === "admin" ? "admin" : "a member"}
                  </p>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
