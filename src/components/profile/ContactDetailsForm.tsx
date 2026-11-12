"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";

interface ContactDetailsFormProps {
  phoneNumber: string | null;
  bankAccountNumber: string | null;
}

/**
 * Lets a student set their phone number and bank account number.
 * These are only shared inside study groups when the student opts in via the
 * per-group privacy toggles. Students are always identified by matric number.
 */
export function ContactDetailsForm({ phoneNumber, bankAccountNumber }: ContactDetailsFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [phone, setPhone] = useState(phoneNumber ?? "");
  const [account, setAccount] = useState(bankAccountNumber ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        phone_number: phone.trim() || null,
        bank_account_number: account.trim() || null,
      })
      .eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id ?? "");
    setSaving(false);
    if (error) {
      toast.error(error.message || "Could not save contact details");
      return;
    }
    toast.success("Contact details saved");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Only shared in study groups if you choose to share them. You are always identified by your matric number.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium uppercase text-gray-500">Phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0803 000 0000"
            className="mt-1 w-full h-11 rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-[#7A1030]"
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase text-gray-500">Account number</label>
          <input
            type="text"
            inputMode="numeric"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="0123456789"
            className="mt-1 w-full h-11 rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-[#7A1030]"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save contact details"}
      </button>
    </div>
  );
}
