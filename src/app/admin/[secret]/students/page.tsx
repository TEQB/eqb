import { StudentsTable } from "@/components/admin/SeedStudents";

export default function AdminStudentsPage({
  params,
}: {
  params: { secret: string };
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Students</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage student accounts — view, search, and lock/unlock access
        </p>
      </div>
      <StudentsTable secret={params.secret} />
    </div>
  );
}
