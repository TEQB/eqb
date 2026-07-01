import { BulkUploadStaging } from "@/components/admin/BulkUploadStaging";

export default function AdminBulkUploadPage({
  params,
}: {
  params: { secret: string };
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Bulk Upload</h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload many images at once — AI extracts metadata, proposes groupings, and you confirm before anything is written.
        </p>
      </div>
      <BulkUploadStaging />
    </div>
  );
}