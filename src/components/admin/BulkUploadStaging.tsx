"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { formatSession } from "@/lib/utils";
import { X, Upload, AlertTriangle, CheckCircle2, Plus, GripVertical, ChevronUp, ChevronDown, Image as ImageIcon } from "lucide-react";

interface ExtractedPage {
  stagedPath: string;
  originalIndex: number;
  textSnippet: string;
  pageIndicator: string | null;
}

interface ProposedMetadata {
  courseCode: string | null;
  courseTitle: string | null;
  level: number | null;
  semester: "first" | "second" | null;
  session: string | null;
  examType: "examination" | "mid_semester";
}

interface ExistingCourse {
  id: string;
  code: string;
  title: string;
  level: number;
  scope: string;
}

interface PossibleMatch {
  id: string;
  code: string;
  title: string;
}

interface Group {
  id: number;
  pages: ExtractedPage[];
  proposedMetadata: ProposedMetadata;
  groupConfidence: "high" | "low";
  matchedCourseId: string | null;
  possibleMatches: PossibleMatch[];
  courseId: string;
  newCourse: { code: string; title: string; level: number; scope: string; departmentIds: string[] } | null;
  year: string;
  semester: "first" | "second";
  examType: "examination" | "mid_semester";
}

interface Programme {
  id: string;
  name: string;
  faculty_id: string;
  faculty_name: string;
}

interface Faculty {
  id: string;
  name: string;
  slug: string;
}

interface BulkExtractResult {
  batchId: string;
  groups: Array<{
    pages: ExtractedPage[];
    proposedMetadata: ProposedMetadata;
    groupConfidence: "high" | "low";
    matchedCourseId: string | null;
    possibleMatches: PossibleMatch[];
  }>;
}

export function BulkUploadStaging() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<BulkExtractResult | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [courses, setCourses] = useState<ExistingCourse[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [draggedPage, setDraggedPage] = useState<{ groupId: number; pageIndex: number } | null>(null);
  const [dragOverPage, setDragOverPage] = useState<{ groupId: number; pageIndex: number } | null>(null);
  const [creatingCourseGroupId, setCreatingCourseGroupId] = useState<number | null>(null);
  const [newCourseForm, setNewCourseForm] = useState({ code: "", title: "", level: "100", scope: "departmental" as "departmental" | "shared" | "general", departmentIds: [] as string[] });
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/admin?action=courses")
      .then((r) => r.json())
      .then((d) => { if (d.courses) setCourses(d.courses); });
    fetch("/api/admin?action=programmes")
      .then((r) => r.json())
      .then((d) => { if (d.programmes) setProgrammes(d.programmes); });
    fetch("/api/admin?action=faculties")
      .then((r) => r.json())
      .then((d) => { if (d.faculties) setFaculties(d.faculties); });
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setExtracting(true);
    const formData = new FormData();
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      formData.append("files", file);
    }

    try {
      const res = await fetch("/api/admin?action=bulk-extract", {
        method: "POST",
        body: formData,
      });
      const data: BulkExtractResult = await res.json();
      if (!res.ok) throw new Error(data as unknown as string);

      setExtractedData(data);
      const currentYear = new Date().getFullYear().toString();
      setGroups(data.groups.map((g, idx) => ({
        id: idx,
        pages: g.pages,
        proposedMetadata: g.proposedMetadata,
        groupConfidence: g.groupConfidence,
        matchedCourseId: g.matchedCourseId || "",
        possibleMatches: g.possibleMatches || [],
        courseId: g.matchedCourseId || "",
        newCourse: null,
        year: currentYear,
        semester: g.proposedMetadata.semester || "first",
        examType: g.proposedMetadata.examType || "examination",
      })));
      toast.success(`Extracted ${files.length} pages — ${data.groups.length} group(s) proposed`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extraction failed";
      toast.error(msg);
    }
    setExtracting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePageDragStart = (groupId: number, pageIndex: number) => {
    setDraggedPage({ groupId, pageIndex });
  };

  const handlePageDragOver = (e: React.DragEvent, groupId: number, pageIndex: number) => {
    e.preventDefault();
    setDragOverPage({ groupId, pageIndex });
  };

  const handlePageDrop = (targetGroupId: number, targetPageIndex: number) => {
    if (!draggedPage) return;
    const { groupId: srcGroupId, pageIndex: srcPageIndex } = draggedPage;

    setGroups((prev) => {
      const updated = prev.map((g) => ({ ...g, pages: [...g.pages] }));
      const srcGroup = updated.find((g) => g.id === srcGroupId);
      const tgtGroup = updated.find((g) => g.id === targetGroupId);
      if (!srcGroup || !tgtGroup) return prev;

      const [movedPage] = srcGroup.pages.splice(srcPageIndex, 1);
      if (srcGroupId === targetGroupId) {
        srcGroup.pages.splice(targetPageIndex, 0, movedPage);
      } else {
        tgtGroup.pages.splice(targetPageIndex, 0, movedPage);
      }
      return updated;
    });
    setDraggedPage(null);
    setDragOverPage(null);
  };

  const handlePageDragEnd = () => {
    setDraggedPage(null);
    setDragOverPage(null);
  };

  const movePageUp = (groupId: number, pageIndex: number) => {
    if (pageIndex === 0) return;
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const pages = [...g.pages];
        [pages[pageIndex - 1], pages[pageIndex]] = [pages[pageIndex], pages[pageIndex - 1]];
        return { ...g, pages };
      })
    );
  };

  const movePageDown = (groupId: number, pageIndex: number) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        if (pageIndex >= g.pages.length - 1) return g;
        const pages = [...g.pages];
        [pages[pageIndex], pages[pageIndex + 1]] = [pages[pageIndex + 1], pages[pageIndex]];
        return { ...g, pages };
      })
    );
  };

  const removePage = (groupId: number, pageIndex: number) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        if (g.pages.length <= 1) return g;
        const pages = g.pages.filter((_, i) => i !== pageIndex);
        return { ...g, pages };
      })
    );
  };

  const discardGroup = (groupId: number) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const handleCreateCourseSubmit = async (groupId: number) => {
    if (!newCourseForm.code.trim() || !newCourseForm.title.trim()) {
      toast.warning("Course code and title are required");
      return;
    }
    try {
      const res = await fetch("/api/admin?action=create-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCourseForm.code.trim(),
          title: newCourseForm.title.trim(),
          programme_id: newCourseForm.departmentIds[0] || "",
          level: parseInt(newCourseForm.level),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create course");
      const newCourse = data.course;
      setCourses((prev) => [...prev, newCourse].sort((a, b) => a.code.localeCompare(b.code)));
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, courseId: newCourse.id, newCourse: { ...newCourseForm, code: newCourse.code, title: newCourse.title, level: parseInt(newCourseForm.level) }, possibleMatches: [] }
            : g
        )
      );
      setCreatingCourseGroupId(null);
      setNewCourseForm({ code: "", title: "", level: "100", scope: "departmental", departmentIds: [] });
      toast.success(`Course "${newCourse.code}" created and selected`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create course";
      toast.error(msg);
    }
  };

  const handleConfirm = async () => {
    if (groups.length === 0) {
      toast.warning("No groups to commit");
      return;
    }
    for (const g of groups) {
      if (!g.courseId && !g.newCourse) {
        toast.warning(`Group ${g.id + 1}: select or create a course`);
        return;
      }
      if (!g.year) {
        toast.warning(`Group ${g.id + 1}: select a session`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const commitGroups = groups.map((g) => ({
        pages: g.pages.map((p) => ({
          stagedPath: p.stagedPath,
          fileType: p.stagedPath.endsWith(".pdf") ? "pdf" : "image",
        })),
        courseId: g.courseId || null,
        newCourse: g.newCourse ? {
          code: g.newCourse.code,
          title: g.newCourse.title,
          level: g.newCourse.level,
          scope: g.newCourse.scope,
          departmentIds: g.newCourse.departmentIds,
        } : null,
        year: parseInt(g.year),
        semester: g.semester,
        examType: g.examType,
      }));

      const res = await fetch("/api/admin?action=bulk-commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: extractedData?.batchId, groups: commitGroups }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.failed && data.failed.length > 0) {
        for (const f of data.failed) {
          toast.error(`Group ${f.groupIndex + 1}: ${f.error}`);
        }
        toast.warning(`${data.committed} group(s) committed, ${data.failed.length} failed`);
      } else {
        toast.success(`${data.committed} question(s) published successfully`);
      }

      if (data.committed > 0) {
        setGroups([]);
        setExtractedData(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Commit failed";
      toast.error(msg);
    }
    setSubmitting(false);
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={extracting}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {extracting ? "Analyzing pages..." : "Select images or PDFs"}
        </button>
        <p className="mt-3 text-xs text-gray-500">
          Upload multiple images/PDFs — AI will analyze, group, and propose course matches.
          Nothing is written until you confirm.
        </p>
        {extracting && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            <span className="text-sm text-gray-500">Extracting metadata...</span>
          </div>
        )}
      </div>

      {groups.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{groups.length} Proposed Group{groups.length > 1 ? "s" : ""}</h3>
              <p className="text-xs text-gray-500">
                {groups.length} question{groups.length > 1 ? "s" : ""} • Drag pages to reorder or move between groups
              </p>
            </div>
            <button
              onClick={() => {
                setGroups([]);
                setExtractedData(null);
              }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Discard all
            </button>
          </div>

          <div className="grid gap-6">
            {groups.map((group, gIdx) => {
              const isLowConfidence = group.groupConfidence === "low";
              return (
                <div
                  key={group.id}
                  className={`rounded-2xl border-2 bg-white p-5 ${isLowConfidence ? "border-amber-300" : "border-gray-100"}`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${isLowConfidence ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                        {isLowConfidence ? (
                          <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Review needed</span>
                        ) : (
                          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />High confidence</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{group.pages.length} page{group.pages.length > 1 ? "s" : ""} • Group {gIdx + 1}</p>
                        {group.proposedMetadata.courseCode && (
                          <p className="text-sm font-medium text-gray-700">
                            Detected: <span className="font-mono">{group.proposedMetadata.courseCode}</span>
                            {group.proposedMetadata.courseTitle && ` — ${group.proposedMetadata.courseTitle}`}
                          </p>
                        )}
                        {isLowConfidence && (
                          <p className="mt-1 text-xs text-amber-600">
                            Course code mismatch detected across pages — please verify the correct course is selected
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => discardGroup(group.id)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Discard group"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Pages</p>
                    <div className="flex flex-wrap gap-3">
                      {group.pages.map((page, pIdx) => (
                        <div
                          key={`${page.stagedPath}-${pIdx}`}
                          draggable
                          onDragStart={() => handlePageDragStart(group.id, pIdx)}
                          onDragOver={(e) => handlePageDragOver(e, group.id, pIdx)}
                          onDrop={() => handlePageDrop(group.id, pIdx)}
                          onDragEnd={handlePageDragEnd}
                          className={`group relative rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing ${
                            dragOverPage?.groupId === group.id && dragOverPage?.pageIndex === pIdx
                              ? "border-primary-400 bg-primary-50"
                              : "border-gray-200 hover:border-gray-300"
                          } ${draggedPage?.groupId === group.id && draggedPage?.pageIndex === pIdx ? "opacity-40" : ""}`}
                        >
                          <div className="h-24 w-20 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                            {page.stagedPath.endsWith(".pdf") ? (
                              <div className="flex flex-col items-center gap-1 text-gray-400">
                                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                                <span className="text-[10px]">PDF</span>
                              </div>
                            ) : (
                              <img
                                src={`${supabaseUrl}/storage/v1/object/public/pending/${page.stagedPath}`}
                                alt={`Page ${pIdx + 1}`}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                                }}
                              />
                            )}
                            <div className="hidden absolute inset-0 bg-gray-200 flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          </div>
                          <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                            {pIdx + 1}
                          </div>
                          <div className="mt-1 flex items-center justify-center gap-0.5">
                            <button
                              onClick={() => movePageUp(group.id, pIdx)}
                              disabled={pIdx === 0}
                              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => movePageDown(group.id, pIdx)}
                              disabled={pIdx === group.pages.length - 1}
                              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => removePage(group.id, pIdx)}
                              disabled={group.pages.length <= 1}
                              className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          {page.textSnippet && (
                            <p className="mt-1 text-[9px] text-gray-400 line-clamp-2 px-1">{page.textSnippet}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {group.pages.length > 1 && (
                      <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                        <svg className="h-3.5 w-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        Drag pages between groups to reassign — check course match before confirming
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Course</label>
                      {creatingCourseGroupId === group.id ? (
                        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <input
                            type="text"
                            placeholder="Code (e.g. CSC 401)"
                            value={newCourseForm.code}
                            onChange={(e) => setNewCourseForm((f) => ({ ...f, code: e.target.value }))}
                            className="block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-100"
                          />
                          <input
                            type="text"
                            placeholder="Title"
                            value={newCourseForm.title}
                            onChange={(e) => setNewCourseForm((f) => ({ ...f, title: e.target.value }))}
                            className="block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-100"
                          />
                          <div className="flex gap-2">
                            <select
                              value={newCourseForm.level}
                              onChange={(e) => setNewCourseForm((f) => ({ ...f, level: e.target.value }))}
                              className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-100"
                            >
                              {[100, 200, 300, 400, 500, 600, 700].map((l) => (
                                <option key={l} value={l}>{l}</option>
                              ))}
                            </select>
                            <select
                              value={newCourseForm.scope}
                              onChange={(e) => setNewCourseForm((f) => ({ ...f, scope: e.target.value as typeof newCourseForm.scope }))}
                              className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-100"
                            >
                              <option value="departmental">Dept.</option>
                              <option value="shared">Shared</option>
                              <option value="general">General</option>
                            </select>
                          </div>
                          {(newCourseForm.scope === "shared" || newCourseForm.scope === "general") && (
                            <select
                              multiple
                              value={newCourseForm.departmentIds}
                              onChange={(e) => setNewCourseForm((f) => ({
                                ...f,
                                departmentIds: Array.from(e.target.selectedOptions, (o) => o.value),
                              }))}
                              className="block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-100"
                            >
                              {programmes.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          )}
                          {newCourseForm.scope === "departmental" && (
                            <select
                              value={newCourseForm.departmentIds[0] || ""}
                              onChange={(e) => setNewCourseForm((f) => ({ ...f, departmentIds: [e.target.value] }))}
                              className="block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-100"
                            >
                              <option value="">Select programme</option>
                              {programmes.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCreateCourseSubmit(group.id)}
                              className="flex-1 rounded-lg bg-primary-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                            >
                              Create
                            </button>
                            <button
                              onClick={() => setCreatingCourseGroupId(null)}
                              className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <select
                            value={group.courseId}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "__create_new__") {
                                setCreatingCourseGroupId(group.id);
                              } else {
                                setGroups((prev) =>
                                  prev.map((g) =>
                                    g.id === group.id
                                      ? { ...g, courseId: val, newCourse: null, possibleMatches: [] }
                                      : g
                                  )
                                );
                              }
                            }}
                            className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-100"
                          >
                            <option value="">Select course...</option>
                            {group.possibleMatches.length > 0 && !group.courseId && (
                              <optgroup label="Possible matches">
                                {group.possibleMatches.map((m) => (
                                  <option key={m.id} value={m.id}>{m.code} — {m.title}</option>
                                ))}
                              </optgroup>
                            )}
                            {courses.map((c) => (
                              <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                            ))}
                            <option value="__create_new__">+ Create new course...</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Session</label>
                      <select
                        value={group.year}
                        onChange={(e) => setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, year: e.target.value } : g))}
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-100"
                      >
                        {Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - i).toString()).map((y) => (
                          <option key={y} value={y}>{formatSession(Number(y))}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Semester</label>
                      <select
                        value={group.semester}
                        onChange={(e) => setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, semester: e.target.value as "first" | "second" } : g))}
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-100"
                      >
                        <option value="first">First</option>
                        <option value="second">Second</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Exam Type</label>
                      <select
                        value={group.examType}
                        onChange={(e) => setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, examType: e.target.value as "examination" | "mid_semester" } : g))}
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-100"
                      >
                        <option value="examination">Examination</option>
                        <option value="mid_semester">Mid Semester</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-4 rounded-2xl border border-primary/20 bg-primary-600 p-4 shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-white">
                <p className="font-medium">{groups.length} group{groups.length > 1 ? "s" : ""} ready to publish</p>
                <p className="text-xs text-white/70">Nothing is written until you confirm — review each group above</p>
              </div>
              <button
                onClick={handleConfirm}
                disabled={submitting || groups.length === 0}
                className="flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-primary-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-700" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm & Publish All
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}