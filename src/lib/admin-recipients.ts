import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type ServiceClient = SupabaseClient<Database>;

export async function getAdminRecipientEmails(service: ServiceClient) {
  const [{ data: adminProfiles }, { data: authUsers }] = await Promise.all([
    service
      .from("profiles" as never)
      .select("auth_user_id")
      .eq("role", "super_admin"),
    service.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const adminIds = new Set(
    (adminProfiles ?? []).map(
      (row) => (row as unknown as { auth_user_id: string }).auth_user_id,
    ),
  );

  const emails = (authUsers?.users ?? [])
    .filter((user) => adminIds.has(user.id) && !!user.email)
    .map((user) => user.email as string);

  return Array.from(new Set(emails));
}
