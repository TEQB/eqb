"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UploadForm } from "./UploadForm";

interface Course {
  id: string;
  code: string;
  title: string;
  level: number;
  scope: string;
}

export function UploadWall({ obligationDays }: { obligationDays: number }) {
  const supabase = createClient();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    async function fetchCourses() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rawData } = await supabase
        .from("courses")
        .select("id, code, title, level, scope")
        .order("level");
      const coursesData = rawData as unknown as Course[] | null;

      if (coursesData) setCourses(coursesData);
    }
    fetchCourses();
  }, [supabase]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-md text-center animate-fade-in-up">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 animate-bounce-in">
          <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">
          Access paused
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          You need to upload a past question every {obligationDays} days to keep your access active. Upload now to restore access.
        </p>
        <div className="mt-6">
          <UploadForm courses={courses} />
        </div>
      </div>
    </div>
  );
}