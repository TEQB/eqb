"use client";

import { useEffect, useState } from "react";

interface Faculty { id: string; name: string }
interface Programme { id: string; name: string }
interface Course { id: string; code: string; title: string; level: number }

export default function ExplorePage() {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedProgramme, setSelectedProgramme] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  const [loadingFaculties, setLoadingFaculties] = useState(true);
  const [loadingProgrammes, setLoadingProgrammes] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/browse/faculties")
      .then((r) => r.json())
      .then((d) => setFaculties(d.faculties ?? []))
      .catch(() => setError("Failed to load faculties"))
      .finally(() => setLoadingFaculties(false));
  }, []);

  useEffect(() => {
    if (!selectedFaculty) {
      setProgrammes([]);
      setSelectedProgramme("");
      return;
    }
    setLoadingProgrammes(true);
    setSelectedProgramme("");
    setCourses([]);
    setSelectedCourse("");
    fetch(`/api/browse/programmes?faculty_id=${selectedFaculty}`)
      .then((r) => r.json())
      .then((d) => setProgrammes(d.programmes ?? []))
      .catch(() => setError("Failed to load programmes"))
      .finally(() => setLoadingProgrammes(false));
  }, [selectedFaculty]);

  useEffect(() => {
    if (!selectedProgramme) {
      setCourses([]);
      setSelectedCourse("");
      return;
    }
    setLoadingCourses(true);
    setSelectedCourse("");
    fetch(`/api/browse/courses?department_id=${selectedProgramme}`)
      .then((r) => r.json())
      .then((d) => setCourses(d.courses ?? []))
      .catch(() => setError("Failed to load courses"))
      .finally(() => setLoadingCourses(false));
  }, [selectedProgramme]);

  useEffect(() => {
    if (selectedCourse) {
      window.location.href = `/course/${selectedCourse}`;
    }
  }, [selectedCourse]);

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-primary">Other Past Questions</h2>
        <p className="mt-1 text-sm text-gray-500">
          Select a faculty, programme, and course to browse past questions
        </p>
      </div>

      {error && (
        <p className="rounded-2xl bg-danger-50 px-3 py-2 text-sm text-danger-600">{error}</p>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Faculty</label>
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            disabled={loadingFaculties}
            className="mt-1 block w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{loadingFaculties ? "Loading..." : "Select faculty"}</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Programme</label>
          <select
            value={selectedProgramme}
            onChange={(e) => setSelectedProgramme(e.target.value)}
            disabled={!selectedFaculty || loadingProgrammes}
            className="mt-1 block w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{loadingProgrammes ? "Loading..." : "Select programme"}</option>
            {programmes.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            disabled={!selectedProgramme || loadingCourses}
            className="mt-1 block w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{loadingCourses ? "Loading..." : "Select course"}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.title} ({c.level} Level)
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
