"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "@/components/ui/toaster";

interface LogEntry {
  id: string;
  created_at: string;
  event: string;
  message: string;
  level: string;
  ip: string | null;
  user_id: string | null;
  user_email: string | null;
  path: string | null;
  method: string | null;
  duration_ms: number | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  user_agent: string | null;
}

const LEVEL_COLORS: Record<string, string> = {
  info: "bg-blue-100 text-blue-800",
  warn: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [limit] = useState(30);

  const [levelFilter, setLevelFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [ipFilter, setIpFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchText, setSearchText] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const fetchLogs = useCallback(async (pg: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(limit) });
      if (levelFilter) params.set("level", levelFilter);
      if (eventFilter) params.set("event", eventFilter);
      if (ipFilter) params.set("ip", ipFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (searchText) params.set("search", searchText);

      const res = await fetch(`/api/admin?action=list-logs&${params}`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
      setPage(pg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load logs";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [limit, levelFilter, eventFilter, ipFilter, dateFrom, dateTo, searchText]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const clearFilters = () => {
    setLevelFilter("");
    setEventFilter("");
    setIpFilter("");
    setDateFrom("");
    setDateTo("");
    setSearchText("");
  };

  const hasFilters = levelFilter || eventFilter || ipFilter || dateFrom || dateTo || searchText;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
          <p className="mt-1 text-sm text-gray-500">{total.toLocaleString()} total entries</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>

          <input
            type="text"
            placeholder="Event name..."
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 w-44"
          />

          <input
            type="text"
            placeholder="IP address..."
            value={ipFilter}
            onChange={(e) => setIpFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 w-36"
          />

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />

          <button
            onClick={() => fetchLogs(1)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            Filter
          </button>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search in message or event..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLogs(1)}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={() => fetchLogs(1)}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Timestamp</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Level</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Event</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-0">Message</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">User</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">IP</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    No log entries found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {format(new Date(log.created_at), "dd MMM yyyy HH:mm:ss")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[log.level] ?? "bg-gray-100 text-gray-700"}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs whitespace-nowrap max-w-[180px] truncate">
                      {log.event}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs min-w-0 max-w-[320px] truncate" title={log.message}>
                      {log.message}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap max-w-[180px] truncate">
                      {log.user_email ?? log.user_id ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono whitespace-nowrap">
                      {log.ip ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(page - 1)}
                disabled={page <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => fetchLogs(page + 1)}
                disabled={page >= totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}