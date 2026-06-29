"use client";

import { useState, useRef, useCallback } from "react";

type TabType = "faculties" | "programmes";

type ImportResult = {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });

  return { headers, rows };
}

function downloadTemplate(tab: TabType) {
  const csv = tab === "faculties" ? "Faculty\n" : "Faculty,Programme\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = tab === "faculties" ? "faculties-template.csv" : "programmes-template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function BulkImportModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [tab, setTab] = useState<TabType>("faculties");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTabChange = (newTab: TabType) => {
    setTab(newTab);
    setRows([]);
    setHeaders([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
    };
    reader.readAsText(file);
  }, []);

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    setResult(null);

    try {
      const body =
        tab === "faculties"
          ? { action: "bulk-import-faculties", faculties: rows.map((r) => r["Faculty"] || r["faculty"] || "") }
          : {
              action: "bulk-import-programmes",
              programmes: rows.map((r) => ({
                faculty: r["Faculty"] || r["faculty"] || "",
                programme: r["Programme"] || r["programme"] || "",
              })),
            };

      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.results) setResult(data.results);
      if (onSuccess) onSuccess();
    } catch {
      setResult({ created: 0, skipped: 0, errors: [{ row: 0, message: "Import failed" }] });
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 mx-auto w-full max-w-2xl rounded-xl bg-white shadow-xl animate-fade-in-scale">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Bulk Import</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          {(["faculties", "programmes"] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                tab === t ? "border-b-2 border-primary-600 text-primary-700" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Import {t === "faculties" ? "Faculties" : "Programmes"}
            </button>
          ))}
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Download a CSV template to fill in your data.</p>
            <button
              onClick={() => downloadTemplate(tab)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download Template
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Upload CSV file</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>

          {rows.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">
                Preview ({rows.length} row{rows.length !== 1 ? "s" : ""})
              </p>
              <div className="max-h-48 overflow-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      {headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium text-gray-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {headers.map((h, j) => (
                          <td key={j} className="px-3 py-2 text-gray-700">
                            {row[h] || ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {rows.length > 10 && (
                      <tr>
                        <td colSpan={headers.length} className="px-3 py-2 text-center italic text-gray-400">
                          ... and {rows.length - 10} more row{rows.length - 10 !== 1 ? "s" : ""}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rows.length > 0 && !result && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {importing ? (
                <>
                  <svg className="h-4 w-4 animate-spinner" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Importing...
                </>
              ) : (
                "Import"
              )}
            </button>
          )}

          {result && (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">Import Results</p>
              <div className="flex gap-4 text-sm">
                <span className="font-medium text-success-600">{result.created} created</span>
                <span className="font-medium text-warning-600">{result.skipped} skipped</span>
                <span className="font-medium text-danger-600">
                  {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}
                </span>
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-auto rounded border border-gray-200 bg-white">
                  <table className="min-w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium text-gray-500">Row</th>
                        <th className="px-3 py-1.5 text-left font-medium text-gray-500">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.errors.map((err, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-gray-500">{err.row}</td>
                          <td className="px-3 py-1.5 text-danger-600">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
