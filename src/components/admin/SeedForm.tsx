"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toaster";

export function SeedForm({
  secret: _secret,
  type,
}: {
  secret: string;
  type: "faculty" | "programme" | "course";
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isGeneral, setIsGeneral] = useState(false);
  const [scope, setScope] = useState("departmental");
  const [deptId, setDeptId] = useState("");
  const [allProgrammes, setAllProgrammes] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (type === "course") {
      fetch("/api/admin?action=list-programmes", { method: "POST" })
        .then((r) => r.json())
        .then((d) => setAllProgrammes(d.programmes || []))
        .catch(() => {});
    }
  }, [type]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    if (isGeneral) {
      formData.set("scope", "general");
      formData.delete("programme_id");
    }
    const res = await fetch(`/api/admin?action=seed-${type}`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (res.ok) {
      setMessage("Created successfully");
      toast.success("Created successfully");
      (e.target as HTMLFormElement).reset();
      setIsGeneral(false);
      setScope("departmental");
      setDeptId("");
    } else {
      const err = data.error || "Error";
      setMessage(err);
      toast.error(err);
    }
    setLoading(false);
  };

  if (type === "course") {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Add Course</h3>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            <input type="checkbox" checked={isGeneral} onChange={(e) => setIsGeneral(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-100" />
            General course (no programme / faculty)
          </label>

          <div>
            <label className="block text-xs font-medium text-gray-700">Code</label>
            <input name="code" type="text" required placeholder="e.g. GST101"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Title</label>
            <input name="title" type="text" required placeholder="e.g. Use of English"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
          </div>

          {!isGeneral && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700">Programme</label>
                <select name="programme_id" value={deptId} onChange={(e) => setDeptId(e.target.value)} required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
                  <option value="">Select programme</option>
                  {allProgrammes.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Level</label>
                  <input name="level" type="number" required placeholder="100"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Scope</label>
                  <select name="scope" value={scope} onChange={(e) => setScope(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
                    <option value="departmental">Programme</option>
                    <option value="shared">Shared</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>
              {scope === "shared" && (
                <div>
                    <label className="block text-xs font-medium text-gray-700">Link to additional programmes</label>
                  <div className="mt-1 max-h-36 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2.5">
                    {allProgrammes.filter((d) => d.id !== deptId).length === 0 && (
                      <p className="text-xs text-gray-400">No other programmes available</p>
                    )}
                    {allProgrammes.filter((d) => d.id !== deptId).map((d) => (
                      <label key={d.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                        <input type="checkbox" name="link_dept_ids" value={d.id} className="rounded border-gray-300 text-primary-600 focus:ring-primary-100" />
                        {d.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {isGeneral && (
            <div>
              <label className="block text-xs font-medium text-gray-700">Level</label>
              <select name="level" required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
                <option value="">Select level</option>
                <option value="100">100 Level</option>
                <option value="200">200 Level</option>
                <option value="300">300 Level</option>
                <option value="400">400 Level</option>
                <option value="500">500 Level</option>
              </select>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50">
            {loading ? "Creating..." : "Create Course"}
          </button>
          {message && (
            <p className={`rounded-md px-3 py-2 text-xs ${message === "Created successfully" ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700"}`}>
              {message}
            </p>
          )}
        </form>
      </div>
    );
  }

  const labels: Record<string, { fields: { name: string; placeholder?: string }[]; title: string }> = {
    faculty: { fields: [{ name: "name", placeholder: "e.g. Faculty of Science" }], title: "Add Faculty" },
    programme: { fields: [{ name: "name", placeholder: "e.g. Computer Science" }, { name: "faculty_id", placeholder: "Faculty ID" }], title: "Add Programme" },
  };

  const { fields, title } = labels[type];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">{title}</h3>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="block text-xs font-medium capitalize text-gray-700">{field.name.replace("_", " ")}</label>
            <input name={field.name} type="text" required placeholder={field.placeholder}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
          </div>
        ))}
        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50">
          {loading ? "Creating..." : "Create"}
        </button>
        {message && (
          <p className={`rounded-md px-3 py-2 text-xs ${message === "Created successfully" ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700"}`}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
