import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SeedForm } from "@/components/admin/SeedForm";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage({
  params,
}: {
  params: { secret: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/admin/${params.secret}/login`);

  const { data: raw } = await supabase
    .from("platform_settings")
    .select("*")
    .single();
  const settings = raw as unknown as {
    upload_obligation_days: number;
    lockout_enabled: boolean;
  } | null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure platform behavior and seed data
        </p>
      </div>

      <section>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Platform Settings</h3>
          <SettingsForm
            initialDays={settings?.upload_obligation_days ?? 30}
            initialLockout={settings?.lockout_enabled ?? true}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Seed Data</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Add faculties, programmes, and courses to the system
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <SeedForm secret={params.secret} type="faculty" />
          <SeedForm secret={params.secret} type="programme" />
          <SeedForm secret={params.secret} type="course" />
        </div>
      </section>
    </div>
  );
}
