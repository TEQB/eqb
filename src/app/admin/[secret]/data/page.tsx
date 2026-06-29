import { DataOverview } from "@/components/admin/DataOverview";

export default function AdminDataPage({
  params: _params,
}: {
  params: { secret: string };
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Data Overview</h2>
        <p className="mt-1 text-sm text-gray-500">
          View all faculties, programmes, and courses in the system
        </p>
      </div>
      <DataOverview />
    </div>
  );
}
