import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { AdminRegisterForm } from "@/components/admin/AdminRegisterForm";

export default async function AdminRootPage({
  params,
}: {
  params: { secret: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();
    const profile = rawProfile as unknown as { role: string } | null;

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

  if (existingAdmin) {
    redirect(`/admin/${params.secret}/login`);
  }

  return <AdminRegisterForm secret={params.secret} />;
}
