"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface AdminGroup {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  is_active: boolean;
  created_at: string;
  member_count: number;
  eadmin_count: number;
  message_count: number;
  course: { code: string; title: string } | null;
}

export default function AdminGroupsPage() {
  const params = useParams();
  const secret = params.secret as string;
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/study-groups")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setGroups(d.groups ?? []);
      })
      .catch(() => setError("Failed to load groups"))
      .finally(() => setLoading(false));
  }, []);

  const active = groups.filter((g) => g.is_active);
  const disbanded = groups.filter((g) => !g.is_active);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Study Groups</h1>
          <p className="text-sm text-gray-500 mt-1">
            {active.length} active group{active.length !== 1 ? "s" : ""} ·{" "}
            {groups.reduce((s, g) => s + g.message_count, 0)} total messages
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading groups...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">{error}</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No study groups yet.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Group</th>
                <th className="text-left px-4 py-3">Course</th>
                <th className="text-center px-4 py-3">Members</th>
                <th className="text-center px-4 py-3">E-Admins</th>
                <th className="text-center px-4 py-3">Messages</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groups.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/${secret}/groups/${g.id}`}
                      className="font-medium text-[#7A1030] hover:underline"
                    >
                      {g.name}
                    </Link>
                    {g.description && (
                      <p className="text-xs text-gray-400 truncate max-w-xs">{g.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {g.course ? `${g.course.code} — ${g.course.title}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{g.member_count}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      E-Admin ×{g.eadmin_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{g.message_count}</td>
                  <td className="px-4 py-3 text-center">
                    {g.is_active ? (
                      <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Active</span>
                    ) : (
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Disbanded</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">
                    {new Date(g.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
