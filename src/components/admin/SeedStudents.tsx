"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/ui/toaster";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Student {
  id: string;
  full_name: string;
  matric_number: string;
  is_locked: boolean;
  lock_expires_at: string | null;
  lock_reason: string | null;
  current_level: number;
  created_at: string;
  programme_id: string | null;
  programme_name: string | null;
  faculty_name: string | null;
}

interface Faculty {
  id: string;
  name: string;
}

interface Programme {
  id: string;
  name: string;
  faculty_id: string;
}

const PAGE_SIZE = 20;

const LOCK_DURATIONS = [
  { value: "24h", label: "24 hours" },
  { value: "72h", label: "3 days" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "forever", label: "Permanent (no expiry)" },
];

function lockExpiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return "Permanent";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days >= 1) return `Unlocks in ${days}d`;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  return `Unlocks in ${hours}h`;
}

export function StudentsTable({ secret: _secret }: { secret: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "locked">("all");

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [facultyFilter, setFacultyFilter] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");

  const [stats, setStats] = useState<{
    total: number;
    active: number;
    locked: number;
    levels: Record<string, number>;
  } | null>(null);

  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [lockTarget, setLockTarget] = useState<Student | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [lockDuration, setLockDuration] = useState("forever");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin?action=faculties").then((r) => r.json()),
      fetch("/api/admin?action=list-programmes").then((r) => r.json()),
      fetch("/api/admin?action=student-stats").then((r) => r.json()),
    ]).then(([fData, pData, sData]) => {
      if (fData.faculties) setFaculties(fData.faculties);
      if (pData.programmes) setProgrammes(pData.programmes);
      if (sData) setStats(sData);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: "students", page: String(page) });
      if (facultyFilter) params.set("faculty_id", facultyFilter);
      if (programmeFilter) params.set("programme_id", programmeFilter);
      if (levelFilter) params.set("level", levelFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin?${params}`);
      const data = await res.json();
      setStudents(data.students ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [page, facultyFilter, programmeFilter, levelFilter, statusFilter, search]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const filteredProgrammes = programmeFilter || facultyFilter
    ? programmes.filter((p) => !facultyFilter || p.faculty_id === facultyFilter)
    : programmes;

  const openLockDialog = (student: Student) => {
    setLockTarget(student);
    setLockReason("");
    setLockDuration("forever");
    setLockDialogOpen(true);
  };

  async function handleLockWithReason() {
    if (!lockTarget) return;
    const formData = new FormData();
    formData.set("id", lockTarget.id);
    formData.set("lock_reason", lockReason);
    formData.set("duration", lockDuration);
    const res = await fetch("/api/admin?action=lock-student", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const label = LOCK_DURATIONS.find((d) => d.value === lockDuration)?.label ?? lockDuration;
      toast.success(`Student locked — ${label}`);
      setLockDialogOpen(false);
      setLockTarget(null);
      fetchStudents();
      fetch("/api/admin?action=student-stats").then((r) => r.json()).then((d) => { if (d) setStats(d); });
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to lock student");
    }
  }

  async function unlockStudent(student: Student) {
    const formData = new FormData();
    formData.set("id", student.id);
    const res = await fetch("/api/admin?action=unlock-student", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      toast.success("Student unlocked");
      fetchStudents();
      fetch("/api/admin?action=student-stats").then((r) => r.json()).then((d) => { if (d) setStats(d); });
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to unlock student");
    }
  }

  const clearFilters = () => {
    setFacultyFilter("");
    setProgrammeFilter("");
    setLevelFilter("");
    setStatusFilter("all");
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const hasFilters = facultyFilter || programmeFilter || levelFilter || statusFilter !== "all" || search;

  const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  const levelEntries = stats
    ? Object.entries(stats.levels).sort(([a], [b]) => Number(a) - Number(b))
    : [];

  const cardClass = "cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md";

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <button
            onClick={() => { setStatusFilter("all"); setPage(1); }}
            className={`${cardClass} ${statusFilter === "all" ? "border-primary-400 ring-1 ring-primary-200" : "border-gray-200"}`}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total Students</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
          </button>
          <button
            onClick={() => { setStatusFilter(statusFilter === "active" ? "all" : "active"); setPage(1); }}
            className={`${cardClass} ${statusFilter === "active" ? "border-success-400 ring-1 ring-success-200" : "border-gray-200"}`}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Active</p>
            <p className="mt-1 text-2xl font-bold text-success-600">{stats.active.toLocaleString()}</p>
          </button>
          <button
            onClick={() => { setStatusFilter(statusFilter === "locked" ? "all" : "locked"); setPage(1); }}
            className={`${cardClass} ${statusFilter === "locked" ? "border-danger-400 ring-1 ring-danger-200" : "border-gray-200"}`}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Locked</p>
            <p className="mt-1 text-2xl font-bold text-danger-600">{stats.locked.toLocaleString()}</p>
          </button>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">By Level</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {levelEntries.length === 0 ? (
                <span className="text-sm text-gray-400">—</span>
              ) : (
                levelEntries.map(([lvl, count]) => (
                  <button
                    key={lvl}
                    onClick={() => { setLevelFilter(levelFilter === lvl ? "" : lvl); setPage(1); }}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      levelFilter === lvl
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    title={`Filter level ${lvl}`}
                  >
                    {lvl}L · {count}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as "all" | "active" | "locked"); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="locked">Locked</option>
        </select>

        <select
          value={facultyFilter}
          onChange={(e) => { setFacultyFilter(e.target.value); setProgrammeFilter(""); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        >
          <option value="">All Faculties</option>
          {faculties.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>

        <select
          value={programmeFilter}
          onChange={(e) => { setProgrammeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        >
          <option value="">All Programmes</option>
          {filteredProgrammes.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={levelFilter}
          onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        >
          <option value="">All Levels</option>
          {[100, 200, 300, 400, 500].map((l) => (
            <option key={l} value={l}>{l}L</option>
          ))}
        </select>

        <div className="relative min-w-[180px] flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search name or matric..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 w-10">#</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Matric</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Programme</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Level</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Joined</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-4 rounded bg-gray-100" /></td>
                    ))}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12">
                    <div className="flex flex-col items-center">
                      <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                      <p className="text-sm text-gray-500">{hasFilters ? "No students match your filters" : "No students found"}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((s, i) => (
                  <tr key={s.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-4 text-gray-400 text-xs">{startItem + i}</td>
                    <td className="px-4 py-4 font-medium text-gray-900">{s.full_name || "—"}</td>
                    <td className="px-4 py-4 font-mono text-xs text-gray-500">{s.matric_number || "—"}</td>
                    <td className="px-4 py-4">
                      <p className="text-xs font-medium text-gray-900">{s.programme_name || "—"}</p>
                      {s.faculty_name && <p className="text-[11px] text-gray-400">{s.faculty_name}</p>}
                    </td>
                    <td className="px-4 py-4 text-gray-700">Level {s.current_level || "—"}</td>
                    <td className="px-4 py-4 text-xs text-gray-500">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          s.is_locked ? "bg-danger-50 text-danger-700" : "bg-success-50 text-success-700"
                        }`}
                      >
                        <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${s.is_locked ? "bg-danger-500" : "bg-success-500"}`} />
                        {s.is_locked ? "Locked" : "Active"}
                      </span>
                      {s.is_locked && (
                        <p className="mt-1 text-[11px] text-gray-400">
                          {lockExpiryLabel(s.lock_expires_at)}
                          {s.lock_expires_at && (
                            <span className="text-gray-300"> · {new Date(s.lock_expires_at).toLocaleDateString()}</span>
                          )}
                        </p>
                      )}
                      {s.is_locked && s.lock_reason && (
                        <p className="mt-0.5 max-w-[180px] truncate text-[11px] text-gray-400" title={s.lock_reason}>
                          {s.lock_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {s.is_locked ? (
                        <button
                          onClick={() => unlockStudent(s)}
                          className="rounded-lg bg-success-50 px-3.5 py-2 text-xs font-medium text-success-700 transition-colors hover:bg-success-100"
                        >
                          Unlock
                        </button>
                      ) : (
                        <button
                          onClick={() => openLockDialog(s)}
                          className="rounded-lg bg-danger-50 px-3.5 py-2 text-xs font-medium text-danger-700 transition-colors hover:bg-danger-100"
                        >
                          Lock
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500">
              Showing {startItem}–{endItem} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={lockDialogOpen} onOpenChange={(open) => !open && setLockDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock student account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {lockTarget && (
                <>You are about to lock <strong>{lockTarget.full_name}</strong> ({lockTarget.matric_number}).</>
              )}
            </p>
            <label className="block space-y-1">
              <span className="block text-sm font-medium text-gray-700">Duration</span>
              <select
                value={lockDuration}
                onChange={(e) => setLockDuration(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              >
                {LOCK_DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              {lockDuration !== "forever" && (
                <span className="block text-xs text-gray-500">
                  The account unlocks automatically when the duration expires.
                </span>
              )}
            </label>
            <label className="block space-y-1">
              <span className="block text-sm font-medium text-gray-700">Reason (optional)</span>
              <textarea
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="Enter the reason for locking this account..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </label>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLockDialogOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLockWithReason}
                className="rounded-lg bg-danger-600 px-4 py-2 text-sm font-medium text-white hover:bg-danger-700"
              >
                Lock Account
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
