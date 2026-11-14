"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "@/components/ui/toaster";
import { deriveLevelAndSemesterFromCode } from "@/lib/utils";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

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
  stickyActions?: boolean;
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
  stickyActions = false,
}: CreateCourseFormProps) {
  const [code, setCode] = useState(initialCode);
  const [title, setTitle] = useState(initialTitle);
  const [ownership, setOwnership] = useState<"general" | string>("general");
  const [programmeSearch, setProgrammeSearch] = useState("");
  const [scope, setScope] = useState<"general" | "shared" | "programme_specific">("programme_specific");
  const [sharedProgrammeIds, setSharedProgrammeIds] = useState<string[]>([]);
  const [sharedProgrammeSearch, setSharedProgrammeSearch] = useState("");
  const [programmeDropdownOpen, setProgrammeDropdownOpen] = useState(false);
  const [derivedLevel, setDerivedLevel] = useState<number | null>(null);
  const [derivedLevelDisplay, setDerivedLevelDisplay] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const programmeDropdownRef = useRef<HTMLDivElement>(null);
  const programmeSearchRef = useRef<HTMLInputElement>(null);

  const isGeneralOwnership = ownership === "general";
  const selectedProgrammeId = isGeneralOwnership ? "" : ownership;
  const selectedProgramme = programmes.find((p) => p.id === selectedProgrammeId);

  const filteredProgrammes = useMemo(() => {
    const query = programmeSearch.trim().toLowerCase();
    if (!query) return programmes;

    const matches = programmes.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.faculty_name.toLowerCase().includes(query),
    );

    if (selectedProgrammeId && !matches.some((p) => p.id === selectedProgrammeId)) {
      const selected = programmes.find((p) => p.id === selectedProgrammeId);
      return selected ? [selected, ...matches] : matches;
    }

    return matches;
  }, [programmes, programmeSearch, selectedProgrammeId]);

  const filteredSharedProgrammes = useMemo(() => {
    const options = programmes.filter((p) => p.id !== selectedProgrammeId);
    const query = sharedProgrammeSearch.trim().toLowerCase();
    if (!query) return options;
    return options.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.faculty_name.toLowerCase().includes(query),
    );
  }, [programmes, selectedProgrammeId, sharedProgrammeSearch]);

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

  useEffect(() => {
    if (!programmeDropdownOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (programmeDropdownRef.current && !programmeDropdownRef.current.contains(event.target as Node)) {
        setProgrammeDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProgrammeDropdownOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    programmeSearchRef.current?.focus();

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [programmeDropdownOpen]);

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
    setSharedProgrammeSearch("");
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
          <div ref={programmeDropdownRef} className="relative mt-1">
            <button
              type="button"
              onClick={() => setProgrammeDropdownOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-3 rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-left text-base transition-colors focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <span className="min-w-0">
                {isGeneralOwnership ? (
                  <span className="text-gray-600">General (no owner)</span>
                ) : selectedProgramme ? (
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-gray-900">{selectedProgramme.name}</span>
                    {selectedProgramme.faculty_name && (
                      <span className="text-xs text-gray-500">({selectedProgramme.faculty_name})</span>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-400">Select programme</span>
                )}
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-gray-400 transition-transform", programmeDropdownOpen && "rotate-180")} />
            </button>

            {programmeDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_20px_45px_rgba(63,39,50,0.16)]">
                <div className="border-b border-gray-100 p-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      ref={programmeSearchRef}
                      type="text"
                      value={programmeSearch}
                      onChange={(e) => setProgrammeSearch(e.target.value)}
                      placeholder="Search programmes..."
                      aria-label="Search programmes"
                      className="block w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto p-1.5" role="listbox" aria-label="Programmes">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isGeneralOwnership}
                    onClick={() => {
                      setOwnership("general");
                      setScope("programme_specific");
                      setSharedProgrammeIds([]);
                      setProgrammeDropdownOpen(false);
                      setProgrammeSearch("");
                    }}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-primary/5",
                      isGeneralOwnership && "bg-primary/10",
                    )}
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                      {isGeneralOwnership && <Check className="h-4 w-4 text-primary" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-900">
                        General (no owner)
                      </span>
                    </span>
                  </button>

                  {filteredProgrammes.map((p) => {
                    const isSelected = p.id === ownership;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setOwnership(p.id);
                          setScope("programme_specific");
                          setSharedProgrammeIds([]);
                          setProgrammeDropdownOpen(false);
                          setProgrammeSearch("");
                        }}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-primary/5",
                          isSelected && "bg-primary/10",
                        )}
                      >
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-gray-900">{p.name}</span>
                          {p.faculty_name && (
                            <span className="block text-xs text-gray-500">{p.faculty_name}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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
                  if (next !== "shared") {
                    setSharedProgrammeIds([]);
                    setSharedProgrammeSearch("");
                  }
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
                <input
                  type="text"
                  value={sharedProgrammeSearch}
                  onChange={(e) => setSharedProgrammeSearch(e.target.value)}
                  placeholder="Search programmes..."
                  className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
                />
                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-gray-200 p-3">
                  {filteredSharedProgrammes.length === 0 ? (
                    <p className="text-sm text-gray-500">No programmes match your search.</p>
                  ) : (
                    filteredSharedProgrammes.map((p) => (
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
                    ))
                  )}
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

        <div className={stickyActions ? "sticky bottom-0 z-10 -mx-1 -mb-1 flex gap-2 border-t border-gray-200 bg-white/95 px-1 py-3 backdrop-blur" : "flex gap-2"}>
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
