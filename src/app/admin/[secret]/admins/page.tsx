import { AdminManagement } from "@/components/admin/AdminManagement";

export default function AdminAdminsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Admin Management</h2>
        <p className="mt-1 text-sm text-gray-500">
          Invite new admins and manage existing ones
        </p>
      </div>
      <AdminManagement />
    </div>
  );
}
