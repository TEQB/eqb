"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "@/components/ui/toaster";
import { deriveLevelAndSemesterFromCode } from "@/lib/utils";

interface Programme {
  id: string;
  name: string;
  faculty_id: string;
  faculty_name: string;
}

interface CreateCourseFormProps {
  onSuccess?: (course: { id: string; code: string; title: string; level: number; scope: string }) => void;
  onCancel?: () => void;
  postUrl: string;
  programmes: Programme[];
  initialCode?: string;
  initialTitle?: string;
  heading?: string;
}

const SEARCH_THRESHOLD = 15;

export function CreateCourseForm({
  onSuccess,
  onCancel,
  postUrl,
  programmes,
  initialCode = "",
  initialTitle = "",
  heading = "Add New Course",
}: CreateCourseFormProps) {
  const [code, setCode] = useState(initialCode);
  const [title, setTitle] = useState(initialTitle);
  const [ownership, setOwnership] = useState<"general" | string>("general");
  const [programmeSearch, setProgrammeSearch] = useState("");
  const [scope, setScope] = useState<"general" | "shared" | "programme_specific">("programme_specific");
  const [sharedProgrammeIds, setSharedProgrammeIds] = useState<string[]>([]);
  const [derivedLevel, setDerivedLevel] = useState<number | null>(null);
  const [derivedLevelDisplay, setDerivedLevelDisplay] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isGeneralOwnership = ownership === "general";
  const selectedProgrammeId = isGeneralOwnership ? "" : ownership;
  const selectedProgramme = programmes.find((p) => p.id === selectedProgrammeId);
  const showProgrammeSearch = programmes.length > SEARCH_THRESHOLD;

  const filteredProgrammes = useMemo(() => {
    if (!programmeSearch.trim()) return programmes;
    const q = programmeSearch.toLowerCase();
    return programmes.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.faculty_name.toLowerCase().includes(q),
    );
  }, [programmes, programmeSearch]);

  useEffect(() => {
    setCode(initialCode);
    setTitle(initialTitle);
  }, [initialCode, initialTitle]);

  useEffect(() => {
    if (code.length >= 3) {
      const result = deriveLevelAndSemesterFromCode(code);
      if (result) {
        setDerivedLevel(result.level);
        setDerivedLevelDisplay(`Detected level: ${result.level} — from code ${code.toUpperCase()}`);
      } else {
        setDerivedLevel(null);
        setDerivedLevelDisplay("");
      }
    } else {
      setDerivedLevel(null);
      setDerivedLevelDisplay("");
    }
  }, [code]);

  const handleSubmit = async () => {
    setError("");

    if (!code.trim() || !title.trim()) {
      setError("Course code and title are required");
      toast.warning("Course code and title are required");
      return;
    }

    if (derivedLevel === null) {
      setError("Could not detect level from course code. Please enter a valid course code (e.g., CSC301)");
      toast.warning("Invalid course code format");
      return;
    }

    if (!isGeneralOwnership && !selectedProgrammeId) {
      setError("Please select a programme");
      toast.warning("Please select a programme");
      return;
    }

    if (scope === "shared" && sharedProgrammeIds.length === 0) {
      setError("Select at least one programme for shared scope");
      toast.warning("Select at least one programme for shared scope");
      return;
    }

    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        code: code.trim(),
        title: title.trim(),
        level: derivedLevel,
      };

      if (isGeneralOwnership) {
        body.standAlone = true;
        body.scope = "general";
        body.programmeIds = [];
      } else {
        body.programme_id = selectedProgrammeId;
        body.scope = scope;
        if (scope === "shared") {
          body.programmeIds = [selectedProgrammeId, ...sharedProgrammeIds];
        } else {
          body.programmeIds = [];
        }
      }

      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to create course (${res.status})`);
      }

      const newCourse = data.course;
      if (onSuccess) {
        onSuccess(newCourse);
      }
      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error creating course";
      setError(msg);
      toast.error(msg);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setCode(initialCode);
    setTitle(initialTitle);
    setOwnership("general");
    setProgrammeSearch("");
    setScope("programme_specific");
    setSharedProgrammeIds([]);
    setDerivedLevel(null);
    setDerivedLevelDisplay("");
    setError("");
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-900">{heading}</h4>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700">Course Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. CSC301"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Course Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Programming"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Ownership</label>
          {showProgrammeSearch && (
            <input
              type="text"
              value={programmeSearch}
              onChange={(e) => setProgrammeSearch(e.target.value)}
              placeholder="Search programmes..."
              className="mt-1 mb-2 block w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
            />
          )}
          <select
            value={ownership}
            onChange={(e) => {
              const value = e.target.value;
              setOwnership(value);
              setScope("programme_specific");
              setSharedProgrammeIds([]);
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
          >
            <option value="general">General (no owner)</option>
            {filteredProgrammes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.faculty_name ? `(${p.faculty_name})` : ""}
              </option>
            ))}
          </select>
        </div>

        {!isGeneralOwnership && selectedProgrammeId && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700">Scope</label>
              <select
                value={scope}
                onChange={(e) => {
                  const next = e.target.value as "general" | "shared" | "programme_specific";
                  setScope(next);
                  if (next !== "shared") setSharedProgrammeIds([]);
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              >
                <option value="programme_specific">Programme Specific</option>
                <option value="shared">Shared</option>
                <option value="general">General (platform-wide)</option>
              </select>
            </div>

            {scope === "shared" && (
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Share with Additional Programmes
                </label>
                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-gray-200 p-3">
                  {programmes
                    .filter((p) => p.id !== selectedProgrammeId)
                    .map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={sharedProgrammeIds.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSharedProgrammeIds([...sharedProgrammeIds, p.id]);
                            } else {
                              setSharedProgrammeIds(sharedProgrammeIds.filter((id) => id !== p.id));
                            }
                          }}
                          className="rounded border-gray-400 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-gray-700">
                          {p.name} {p.faculty_name ? `(${p.faculty_name})` : ""}
                        </span>
                      </label>
                    ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  The owning programme ({selectedProgramme?.name}) is automatically included.
                </p>
              </div>
            )}
          </>
        )}

        {derivedLevel !== null && (
          <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
            {derivedLevelDisplay}
          </div>
        )}

        {error && (
          <p className="text-sm text-danger-600">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Course"}
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              if (onCancel) onCancel();
            }}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateCourseForm;
