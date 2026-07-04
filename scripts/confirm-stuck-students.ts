/**
 * One-off remediation script.
 * Confirms any student auth accounts left unconfirmed due to the
 * email_confirm:false bug in create-account/route.ts.
 *
 * Usage: npx tsx scripts/confirm-stuck-students.ts
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in env.
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in environment");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.error("Failed to list users:", error.message);
    process.exit(1);
  }

  const unconfirmed = data.users.filter((u) => !u.email_confirmed_at);

  if (unconfirmed.length === 0) {
    console.log("No unconfirmed accounts found. Nothing to do.");
    return;
  }

  console.log(`Found ${unconfirmed.length} unconfirmed account(s):`);
  unconfirmed.forEach((u) => console.log(`  - ${u.email} (${u.id})`));

  // Safety: first run in list-only mode to review affected emails.
  // Uncomment the loop below after manual review.
  //
  // for (const user of unconfirmed) {
  //   const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
  //     email_confirm: true,
  //   });
  //   if (updateError) {
  //     console.error(`  ✗ Failed to confirm ${user.email}: ${updateError.message}`);
  //   } else {
  //     console.log(`  ✓ Confirmed ${user.email}`);
  //   }
  // }

  console.log("Done.");
}

main();
