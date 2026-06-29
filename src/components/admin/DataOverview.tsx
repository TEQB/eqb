"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";

type Tab = "faculties" | "programmes" | "courses";

type Faculty = { id: string; name: string; slug: string };
type Programme = { name: string; faculty_name: string };
type Course = { code: string; title: string; level: number };

const BulkImportModal = dynamic(
  () => import("./BulkImportModal").then((mod) => mod.BulkImportModal),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50" />
        <div className="relative z-10 rounded-xl bg-white px-5 py-4 shadow-xl">
          <p className="text-sm text-gray-500">Loading import tools...</p>
        </div>
      </div>
    ),
  },
);

export function DataOverview() {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allProgrammes, setAllProgrammes] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("faculties");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const loadData = async () => {
    const [fRes, dRes, cRes] = await Promise.all([
      fetch("/api/admin?action=faculties"),
      fetch("/api/admin?action=programmes"),
      fetch("/api/admin?action=courses"),
    ]);
    const [fData, dData, cData] = await Promise.all([fRes.json(), dRes.json(), cRes.json()]);
    if (fData.faculties) setFaculties(fData.faculties);
    if (dData.programmes) setProgrammes(dData.programmes);
    if (cData.courses) setCourses(cData.courses);
  };

  useEffect(() => {
    async function init() {
      await loadData();
      const r = await fetch("/api/admin?action=list-programmes", { method: "GET" });
      const d = await r.json();
      if (d.programmes) setAllProgrammes(d.programmes);
      setLoading(false);
    }
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    let action: string;
    if (tab === "faculties") action = "seed-faculty";
    else if (tab === "programmes") action = "seed-programme";
    else action = "seed-course";

    const res = await fetch(`/api/admin?action=${action}`, { method: "POST", body: formData });
    const data = await res.json();

    if (res.ok) {
      setMsg({ text: "Created successfully", ok: true });
      form.reset();
      setShowForm(false);
      await loadData();
      if (tab === "courses") {
        const r = await fetch("/api/admin?action=list-programmes", { method: "POST" });
        const d = await r.json();
        if (d.programmes) setAllProgrammes(d.programmes);
      }
    } else {
      setMsg({ text: data.error || "Error", ok: false });
    }
  };

  const filteredFaculties = useMemo(
    () => faculties.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())),
    [faculties, search],
  );
  const filteredProgrammes = useMemo(
    () => programmes.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()) || d.faculty_name.toLowerCase().includes(search.toLowerCase())),
    [programmes, search],
  );
  const filteredCourses = useMemo(
    () => courses.filter((c) => c.code.toLowerCase().includes(search.toLowerCase()) || c.title.toLowerCase().includes(search.toLowerCase())),
    [courses, search],
  );

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "faculties", label: "Faculties", count: faculties.length },
    { key: "programmes", label: "Programmes", count: programmes.length },
    { key: "courses", label: "Courses", count: courses.length },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch(""); setShowForm(false); setMsg(null); }}
            className={`rounded-xl border p-5 text-left shadow-sm transition-all hover:shadow-md ${
              tab === t.key
                ? "border-primary-300 bg-primary-50 ring-1 ring-primary-200"
                : "border-gray-200 bg-white"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{t.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{t.count}</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between px-5">
            <div className="flex gap-0">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setSearch(""); setShowForm(false); setMsg(null); }}
                  className={`px-4 py-3 text-sm font-medium transition-colors ${
                    tab === t.key
                      ? "border-b-2 border-primary-600 text-primary-700"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 text-xs text-gray-400">({t.count})</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setShowBulkImport(true); }}
                className="flex items-center gap-1.5 rounded-lg border border-primary-300 bg-white px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Bulk Import
              </button>
              <button
                onClick={() => { setShowForm(!showForm); setMsg(null); }}
                className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add
              </button>
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${tab}...`}
                  className="w-44 rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4">
            <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
              {tab === "faculties" && (
                <>
                  <div className="min-w-0 flex-1">
                    <label className="block text-xs font-medium text-gray-700">Faculty name</label>
                    <input name="name" type="text" required placeholder="e.g. Faculty of Science"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
                  </div>
                  <button type="submit"
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700">
                    Create Faculty
                  </button>
                </>
              )}

              {tab === "programmes" && (
                <>
                  <div className="min-w-0 flex-1">
                    <label className="block text-xs font-medium text-gray-700">Programme name</label>
                    <input name="name" type="text" required placeholder="e.g. Computer Science"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="block text-xs font-medium text-gray-700">Faculty</label>
                    <select name="faculty_id" required
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
                      <option value="">Select faculty</option>
                      {faculties.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit"
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700">
                    Create Programme
                  </button>
                </>
              )}

              {tab === "courses" && (
                <>
                  <div className="w-28">
                    <label className="block text-xs font-medium text-gray-700">Code</label>
                    <input name="code" type="text" required placeholder="GST101"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="block text-xs font-medium text-gray-700">Title</label>
                    <input name="title" type="text" required placeholder="e.g. Use of English"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-700">Level</label>
                    <select name="level" required
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
                      <option value="">Level</option>
                      {[100, 200, 300, 400, 500].map((l) => (
                        <option key={l} value={l}>{l}L</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="block text-xs font-medium text-gray-700">Scope</label>
                    <select name="scope" defaultValue="departmental"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
                      <option value="departmental">Programme</option>
                      <option value="shared">Shared</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div className="min-w-0 flex-[2]">
                    <label className="block text-xs font-medium text-gray-700">Programme</label>
                    <select name="department_id"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
                      <option value="">None (general)</option>
                      {allProgrammes.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit"
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700">
                    Create
                  </button>
                </>
              )}

              {msg && (
                <p className={`w-full rounded-md px-3 py-2 text-xs ${msg.ok ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700"}`}>
                  {msg.text}
                </p>
              )}
            </form>
          </div>
        )}

        <div className="p-5">
          {tab === "faculties" && (
            filteredFaculties.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredFaculties.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 transition-colors hover:border-gray-200 hover:bg-white">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-100 text-primary-700">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                      </svg>
                    </div>
                    <span className="font-medium">{f.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-12 text-center">
                <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
                <p className="text-sm text-gray-400">{search ? "No matching faculties" : "No faculties yet"}</p>
                {!search && (
                  <button onClick={() => setShowForm(true)} className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700">
                    Add your first faculty
                  </button>
                )}
              </div>
            )
          )}

          {tab === "programmes" && (
            filteredProgrammes.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProgrammes.map((d) => (
                  <div key={d.name} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 transition-colors hover:border-gray-200 hover:bg-white">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m15-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{d.name}</p>
                      <p className="truncate text-xs text-gray-400">{d.faculty_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-12 text-center">
                <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m15-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
                <p className="text-sm text-gray-400">{search ? "No matching programmes" : "No programmes yet"}</p>
                {!search && (
                  <button onClick={() => setShowForm(true)} className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700">
                    Add your first programme
                  </button>
                )}
              </div>
            )
          )}

          {tab === "courses" && (
            filteredCourses.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCourses.map((c) => (
                  <div key={c.code} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 transition-colors hover:border-gray-200 hover:bg-white">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{c.code}</span>
                        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">Lvl {c.level}</span>
                      </div>
                      <p className="truncate text-xs text-gray-500">{c.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-12 text-center">
                <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
                <p className="text-sm text-gray-400">{search ? "No matching courses" : "No courses yet"}</p>
                {!search && (
                  <button onClick={() => setShowForm(true)} className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700">
                    Add your first course
                  </button>
                )}
              </div>
            )
          )}
        </div>
      </div>

      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onSuccess={() => { loadData(); }}
      />
    </div>
  );
}
