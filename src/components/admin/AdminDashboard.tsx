"use client";

import { useEffect, useState } from "react";

const statIcons: Record<string, JSX.Element> = {
  "Total Questions": (
    <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  Published: (
    <svg className="h-5 w-5 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  "Pending Review": (
    <svg className="h-5 w-5 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Suspended: (
    <svg className="h-5 w-5 text-danger-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  Students: (
    <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  "Uploads Today": (
    <svg className="h-5 w-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  ),
  "Uploaded Solutions": (
    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  "Flag Rate": (
    <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
    </svg>
  ),
};

export function AdminDashboard({ secret: _secret }: { secret: string }) {
  const [stats, setStats] = useState({
    totalQuestions: 0,
    publishedQuestions: 0,
    suspendedQuestions: 0,
    totalStudents: 0,
    pendingReview: 0,
    uploadsToday: 0,
    totalSolutions: 0,
    flagRate: 0,
  });

  const [topCourses, setTopCourses] = useState<{ code: string; count: number }[]>([]);
  const [topStudents, setTopStudents] = useState<{ name: string; count: number }[]>([]);
  const [flaggedCourses, setFlaggedCourses] = useState<{ code: string; rate: number }[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<{ week: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin?action=stats");
      const data = await res.json();
      if (data.stats) setStats(data.stats);
      if (data.topCourses) setTopCourses(data.topCourses);
      if (data.topStudents) setTopStudents(data.topStudents);
      if (data.flaggedCourses) setFlaggedCourses(data.flaggedCourses);
      if (data.weeklyTrend) setWeeklyTrend(data.weeklyTrend);
      setLoading(false);
    }
    load();
  }, []);

  const cards = [
    { label: "Total Questions", value: stats.totalQuestions, key: "Total Questions" },
    { label: "Published", value: stats.publishedQuestions, key: "Published" },
    { label: "Pending Review", value: stats.pendingReview, key: "Pending Review" },
    { label: "Suspended", value: stats.suspendedQuestions, key: "Suspended" },
    { label: "Students", value: stats.totalStudents, key: "Students" },
    { label: "Uploads Today", value: stats.uploadsToday, key: "Uploads Today" },
    { label: "Uploaded Solutions", value: stats.totalSolutions, key: "Uploaded Solutions" },
    { label: "Flag Rate", value: `${stats.flagRate.toFixed(1)}%`, key: "Flag Rate" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.key} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const maxTrend = Math.max(...weeklyTrend.map((w) => w.count), 1);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.key} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{card.label}</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
                {statIcons[card.key]}
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Most Uploaded Courses</h3>
          {topCourses.length > 0 ? (
            <div className="space-y-3">
              {topCourses.map((c, i) => (
                <div key={c.code} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-medium text-gray-500">{i + 1}</span>
                  <span className="flex-1 truncate text-sm font-medium text-gray-700">{c.code}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100 md:w-32">
                      <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${(c.count / Math.max(...topCourses.map((x) => x.count), 1)) * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-900">{c.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No data yet</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Most Active Students</h3>
          {topStudents.length > 0 ? (
            <div className="space-y-3">
              {topStudents.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-medium text-gray-500">{i + 1}</span>
                  <span className="flex-1 truncate text-sm text-gray-700">{s.name}</span>
                  <span className="text-xs font-semibold text-gray-900">{s.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No data yet</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Flag Rate by Course</h3>
          {flaggedCourses.length > 0 ? (
            <div className="space-y-3">
              {flaggedCourses.map((c) => (
                <div key={c.code} className="flex items-center gap-3">
                  <span className="flex-1 truncate text-sm text-gray-700">{c.code}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100 md:w-32">
                      <div className="h-full rounded-full bg-danger-400 transition-all" style={{ width: `${Math.min(c.rate, 100)}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-900">{c.rate.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No data yet</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Upload Trend (Weekly)</h3>
          {weeklyTrend.length > 0 ? (
            <div className="flex items-end gap-2" style={{ height: 120 }}>
              {weeklyTrend.map((w) => (
                <div key={w.week} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-primary-400 transition-all"
                    style={{ height: `${(w.count / maxTrend) * 100}%`, minHeight: w.count > 0 ? 8 : 0 }}
                  />
                  <span className="text-[10px] text-gray-400">{w.week}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
