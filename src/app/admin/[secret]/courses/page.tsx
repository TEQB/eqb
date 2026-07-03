import { CoursesManager } from "@/components/admin/CoursesManager";

export default function AdminCoursesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Courses</h2>
        <p className="mt-1 text-sm text-gray-500">
          View all courses, manage scope, and control programme sharing
        </p>
      </div>
      <CoursesManager />
    </div>
  );
}
