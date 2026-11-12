"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle, Users, Plus, ChevronRight, X } from "lucide-react";

interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  member_count?: number;
  is_member?: boolean;
}

interface Course {
  id: string;
  code: string;
  title: string;
  level: number;
}

export default function CourseStudyGroupsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      const [courseRes, groupsRes] = await Promise.all([
        supabase.from("courses").select("id, code, title, level").eq("id", courseId).single(),
        fetch(`/api/study-groups?course_id=${courseId}`),
      ]);
      const groupsData = await groupsRes.json();
      if (courseRes.data) setCourse(courseRes.data as Course);
      if (groupsRes.ok) setGroups(groupsData.groups ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [courseId]);

  const canCreate = groups.length < 2;

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Please give the group a name.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/study-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId, name: name.trim(), description: description.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      setCreateOpen(false);
      setName("");
      setDescription("");
      router.push(`/study-groups/${data.group.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">
          <Link href={`/course/${courseId}`} className="hover:text-secondary">Course</Link> / Study Groups
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Study Groups</h1>
        <p className="text-gray-600 mt-1">
          {course ? `${course.code} — ${course.title}` : "Loading..."}
        </p>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Groups for this course ({groups.length}/2)
        </h2>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/study-groups/${g.id}`}
                className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 bg-[#7A1030]/10 rounded-xl flex items-center justify-center">
                  <MessageCircle size={20} className="text-[#7A1030]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{g.name}</p>
                  {g.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{g.description}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <Users size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-500">{g.member_count ?? 0} members</span>
                    {g.is_member && (
                      <span className="bg-[#7A1030]/10 text-[#7A1030] text-[10px] font-semibold rounded-full px-2 py-0.5">Joined</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </Link>
            ))}

            {groups.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                <MessageCircle size={32} className="mx-auto text-gray-300" />
                <p className="text-gray-500 mt-2">No study groups for this course yet. Be the first to create one!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {canCreate && !loading && (
        <button
          onClick={() => setCreateOpen(true)}
          className="w-full bg-[#7A1030] rounded-2xl py-4 flex items-center justify-center gap-2 text-white font-semibold hover:bg-[#5f0c26]"
        >
          <Plus size={20} /> Create study group
        </button>
      )}
      {!canCreate && !loading && (
        <div className="bg-gray-100 rounded-2xl p-4">
          <p className="text-gray-600 text-center text-sm">Maximum of 2 groups per course. Join an existing group above.</p>
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setCreateOpen(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Create group</h2>
              <button onClick={() => setCreateOpen(false)} className="text-gray-500 hover:text-gray-800">
                <X size={22} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-900 block mb-1.5">Group name</label>
                <input
                  className="w-full h-12 rounded-xl border border-gray-300 px-4 text-gray-900 outline-none focus:border-[#7A1030]"
                  placeholder="e.g. CSC301 Night Owls"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-900 block mb-1.5">Description (optional)</label>
                <textarea
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-[#7A1030] min-h-[80px]"
                  placeholder="What is this group about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full bg-[#7A1030] py-4 rounded-xl text-white font-semibold disabled:opacity-60 hover:bg-[#5f0c26]"
              >
                {creating ? "Creating..." : "Create group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
