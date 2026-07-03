"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toaster";
import { CreateCourseForm } from "@/components/courses/CreateCourseForm";

interface Programme {
  id: string;
  name: string;
  faculty_id: string;
  faculty_name: string;
}

export function SeedForm({
  secret: _secret,
  type,
}: {
  secret: string;
  type: "faculty" | "programme" | "course";
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [programmes, setProgrammes] = useState<Programme[]>([]);

  useEffect(() => {
    if (type === "course") {
      fetch("/api/admin?action=programmes")
        .then((r) => r.json())
        .then((d) => setProgrammes(d.programmes || []))
        .catch(() => {});
    }
  }, [type]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await fetch(`/api/admin?action=seed-${type}`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (res.ok) {
      setMessage("Created successfully");
      toast.success("Created successfully");
      (e.target as HTMLFormElement).reset();
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
        <CreateCourseForm
          heading="Add Course"
          postUrl="/api/admin?action=create-course"
          programmes={programmes}
          onSuccess={() => {
            setMessage("Created successfully");
            toast.success("Created successfully");
          }}
        />
        {message && (
          <p className={`mt-3 rounded-md px-3 py-2 text-xs ${message === "Created successfully" ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700"}`}>
            {message}
          </p>
        )}
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
