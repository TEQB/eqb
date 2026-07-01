"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface Faculty { id: string; name: string }
interface Programme { id: string; name: string }
interface Course { id: string; code: string; title: string; level: number }

interface ExploreClientProps {
  initialFaculties: Faculty[];
}

function SelectSkeleton() {
  return <Skeleton className="mt-1 h-11 w-full animate-pulse rounded-md bg-gray-100" />;
}

function ProgrammeSelector({
  selectedFaculty,
  onProgrammeChange,
}: {
  selectedFaculty: string;
  onProgrammeChange: (id: string) => void;
}) {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedFaculty) { setProgrammes([]); return; }
    let cancelled = false;
    setLoading(true);
    setProgrammes([]);
    onProgrammeChange("");
    fetch(`/api/browse/programmes?faculty_id=${selectedFaculty}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setProgrammes(d.programmes ?? []); })
      .catch(() => { if (!cancelled) setProgrammes([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedFaculty, onProgrammeChange]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">Programme</label>
      {loading ? (
        <SelectSkeleton />
      ) : (
        <select
          onChange={(e) => onProgrammeChange(e.target.value)}
          disabled={!selectedFaculty}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">{!selectedFaculty ? "Select faculty first" : "Select programme"}</option>
          {programmes.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function CourseSelector({
  selectedProgramme,
  onCourseChange,
}: {
  selectedProgramme: string;
  onCourseChange: (id: string) => void;
}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedProgramme) { setCourses([]); return; }
    let cancelled = false;
    setLoading(true);
    setCourses([]);
    onCourseChange("");
    fetch(`/api/browse/courses?programme_id=${selectedProgramme}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setCourses(d.courses ?? []); })
      .catch(() => { if (!cancelled) setCourses([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedProgramme, onCourseChange]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">Course</label>
      {loading ? (
        <SelectSkeleton />
      ) : (
        <select
          onChange={(e) => onCourseChange(e.target.value)}
          disabled={!selectedProgramme}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">{!selectedProgramme ? "Select programme first" : "Select course"}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.title} ({c.level}L)
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export function ExploreClient({ initialFaculties }: ExploreClientProps) {
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedProgramme, setSelectedProgramme] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  const handleFacultyChange = useCallback((id: string) => {
    setSelectedFaculty(id);
    setSelectedProgramme("");
    setSelectedCourse("");
  }, []);

  const handleProgrammeChange = useCallback((id: string) => {
    setSelectedProgramme(id);
    setSelectedCourse("");
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      window.location.href = `/course/${selectedCourse}`;
    }
  }, [selectedCourse]);

  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <div>
        <label className="block text-sm font-medium text-gray-700">Faculty</label>
        <select
          value={selectedFaculty}
          onChange={(e) => handleFacultyChange(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
        >
          <option value="">Select faculty</option>
          {initialFaculties.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      <Suspense fallback={<SelectSkeleton />}>
        <ProgrammeSelector
          selectedFaculty={selectedFaculty}
          onProgrammeChange={handleProgrammeChange}
        />
      </Suspense>

      <Suspense fallback={<SelectSkeleton />}>
        <CourseSelector
          selectedProgramme={selectedProgramme}
          onCourseChange={(id) => setSelectedCourse(id)}
        />
      </Suspense>
    </div>
  );
}