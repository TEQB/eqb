"use client";

import { useState, useEffect } from "react";
import { toast } from "@/components/ui/toaster";

export type EntityType = "faculty" | "programme" | "course";

type Faculty = { id: string; name: string };
type Programme = { id: string; name: string; faculty_id?: string };
type Course = { id: string; code: string; title: string; level: number };

type Props = {
  type: EntityType;
  isOpen: boolean;
  entity: Faculty | Programme | Course | null;
  faculties: Faculty[];
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
};

export function EditModal({ type, isOpen, entity, faculties, onClose, onDeleted, onUpdated }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState(100);
  const [facultyId, setFacultyId] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!entity) return;
    if (type === "faculty") {
      const f = entity as Faculty;
      setName(f.name);
    } else if (type === "programme") {
      const p = entity as Programme;
      setName(p.name);
      setFacultyId(p.faculty_id || "");
    } else {
      const c = entity as Course;
      setCode(c.code);
      setTitle(c.title);
      setLevel(c.level);
    }
    setConfirmDelete(false);
  }, [entity, type]);

  if (!isOpen || !entity) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("id", entity.id);
      if (type === "faculty") {
        formData.append("name", name);
      } else if (type === "programme") {
        formData.append("name", name);
        if (facultyId) formData.append("faculty_id", facultyId);
      } else {
        formData.append("code", code);
        formData.append("title", title);
        formData.append("level", String(level));
      }

      const res = await fetch(`/api/admin?action=update-${type}`, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Update failed");

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} updated`);
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("id", entity.id);
      const res = await fetch(`/api/admin?action=delete-${type}`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`);
      onDeleted();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const label = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Edit {label}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {type === "faculty" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700">Faculty name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>
        )}

        {type === "programme" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700">Programme name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Faculty</label>
              <select
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              >
                <option value="">Select faculty</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {type === "course" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              >
                {[100, 200, 300, 400, 500].map((l) => (
                  <option key={l} value={l}>{l}L</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handleDelete}
            disabled={saving}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              confirmDelete
                ? "bg-red-600 text-white hover:bg-red-700"
                : "border border-red-200 text-red-600 hover:bg-red-50"
            }`}
          >
            {confirmDelete ? "Confirm delete" : "Delete"}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (type === "course" && !code.trim())}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}