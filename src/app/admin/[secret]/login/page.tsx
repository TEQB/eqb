import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import Link from "next/link";

export default async function AdminLoginPage({
  params,
}: {
  params: { secret: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: raw } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();
    const profile = raw as unknown as { role: string } | null;
    if (profile?.role === "super_admin") {
      redirect(`/admin/${params.secret}/dashboard`);
    }
  }

  const service = createServiceClient();
  const { data: existingAdmin } = await service
    .from("profiles")
    .select("id")
    .eq("role", "super_admin")
    .maybeSingle();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center text-xl font-semibold text-gray-900">
          Admin Access
        </h1>
        <AdminLoginForm secret={params.secret} />
        {!existingAdmin && (
          <p className="text-center text-sm text-gray-500">
            No admin account yet?{" "}
            <Link
              href={`/admin/${params.secret}`}
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              Create one here
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
