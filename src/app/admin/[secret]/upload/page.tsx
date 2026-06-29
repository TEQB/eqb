import { AdminUploadForm } from "@/components/admin/AdminUploadForm";

export default function AdminUploadPage({
  params,
}: {
  params: { secret: string };
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Upload Past Question</h2>
        <p className="mt-1 text-sm text-gray-500">
          Add a past question directly — published immediately without moderation
        </p>
      </div>
      <AdminUploadForm secret={params.secret} />
    </div>
  );
}
