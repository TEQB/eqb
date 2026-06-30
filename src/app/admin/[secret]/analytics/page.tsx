"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { toast } from "@/components/ui/toaster";

interface DailyData {
  date: string;
  count: number;
  label?: string;
}

interface LogStats {
  infoCount: number;
  warnCount: number;
  errorCount: number;
  totalLogs: number;
}

interface AnalyticsData {
  stats: LogStats;
  dailyQuestions: DailyData[];
  dailySolutions: DailyData[];
  dailySignups: DailyData[];
}

function formatDateLabel(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd MMM");
  } catch {
    return dateStr;
  }
}

const chartColors = {
  questions: "#7A1030",
  solutions: "#D4A017",
  signups: "#2563EB",
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin?action=log-stats");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();
      setData(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load analytics";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Platform activity overview</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
              <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
              <div className="h-8 bg-gray-100 rounded animate-pulse w-16" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="h-5 bg-gray-100 rounded animate-pulse w-40 mb-4" />
              <div className="h-64 bg-gray-50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || "No data available"}</p>
          <button
            onClick={fetchAnalytics}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { stats, dailyQuestions, dailySolutions, dailySignups } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">Platform activity overview — last 30 days</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Activity Logs"
          value={stats.totalLogs.toLocaleString()}
          bg="bg-primary/5"
          textColor="text-primary"
        />
        <StatCard
          label="Info Events"
          value={stats.infoCount.toLocaleString()}
          bg="bg-blue-50"
          textColor="text-blue-700"
        />
        <StatCard
          label="Warnings"
          value={stats.warnCount.toLocaleString()}
          bg="bg-yellow-50"
          textColor="text-yellow-700"
        />
        <StatCard
          label="Errors (all time)"
          value={stats.errorCount.toLocaleString()}
          bg="bg-red-50"
          textColor="text-red-700"
        />
      </div>

      {/* Questions Chart */}
      <ChartCard title="Questions Uploaded" subtitle="Daily submissions over the last 30 days">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dailyQuestions} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={{ stroke: "#E5E7EB" }}
              interval={6}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #E5E7EB",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              labelFormatter={(label) => formatDateLabel(label as string)}
              formatter={(value) => [Number(value ?? 0), "Questions"]}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke={chartColors.questions}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: chartColors.questions }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Solutions Chart */}
      <ChartCard title="Solutions Submitted" subtitle="Daily solutions over the last 30 days">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dailySolutions} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={{ stroke: "#E5E7EB" }}
              interval={6}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #E5E7EB",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              labelFormatter={(label) => formatDateLabel(label as string)}
              formatter={(value) => [Number(value ?? 0), "Solutions"]}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke={chartColors.solutions}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: chartColors.solutions }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Signups Chart */}
      <ChartCard title="New Student Signups" subtitle="Daily registrations over the last 30 days">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dailySignups} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={{ stroke: "#E5E7EB" }}
              interval={6}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #E5E7EB",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              labelFormatter={(label) => formatDateLabel(label as string)}
              formatter={(value) => [Number(value ?? 0), "Signups"]}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke={chartColors.signups}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: chartColors.signups }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function StatCard({
  label,
  value,
  bg,
  textColor,
}: {
  label: string;
  value: string;
  bg: string;
  textColor: string;
}) {
  return (
    <div className={`rounded-2xl border border-gray-200 p-5 ${bg}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}