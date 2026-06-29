"use client";

import { useEffect, useState } from "react";

interface Student {
  id: string;
  full_name: string;
  matric_number: string;
  is_locked: boolean;
  current_level: number;
  created_at: string;
}

export function StudentsTable({ secret: _secret }: { secret: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/admin?action=students");
      const data = await res.json();
      setStudents(data.students ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function toggleLock(student: Student) {
    const action = student.is_locked ? "unlock-student" : "lock-student";
    const formData = new FormData();
    formData.set("id", student.id);
    const res = await fetch(`/api/admin?action=${action}`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, is_locked: !s.is_locked } : s)),
      );
    }
  }

  const filtered = search
    ? students.filter(
        (s) =>
          s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          s.matric_number?.toLowerCase().includes(search.toLowerCase()),
      )
    : students;

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Matric</th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Level</th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-5 py-4 font-medium text-gray-900">{s.full_name || "—"}</td>
                  <td className="px-5 py-4 font-mono text-xs text-gray-500">{s.matric_number || "—"}</td>
                  <td className="px-5 py-4 text-gray-700">Level {s.current_level || "—"}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        s.is_locked ? "bg-danger-50 text-danger-700" : "bg-success-50 text-success-700"
                      }`}
                    >
                      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${s.is_locked ? "bg-danger-500" : "bg-success-500"}`} />
                      {s.is_locked ? "Locked" : "Active"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => toggleLock(s)}
                      className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
                        s.is_locked
                          ? "bg-success-50 text-success-700 hover:bg-success-100"
                          : "bg-danger-50 text-danger-700 hover:bg-danger-100"
                      }`}
                    >
                      {s.is_locked ? "Unlock" : "Lock"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-12">
            <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <p className="text-sm text-gray-500">No students found</p>
          </div>
        )}
      </div>
    </div>
  );
}
