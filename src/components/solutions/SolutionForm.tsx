"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sanitizeHtml } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

interface SolutionFormProps {
  questionId: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const VALID_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export function SolutionForm({ questionId }: SolutionFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setBody("");
    setSolutionFile(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const trimmedBody = body.trim();
    if (!trimmedBody && !solutionFile) {
      setError("Add text or a file");
      toast.error("Add text or a file before submitting");
      return;
    }

    setIsSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsSubmitting(false);
      toast.error("You need to sign in to submit a solution");
      return;
    }

    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    const profile = rawProfile as unknown as { id: string } | null;
    if (!profile) {
      setIsSubmitting(false);
      toast.error("Profile not found — sign out and try again");
      return;
    }

    let fileUrl: string | null = null;
    if (solutionFile) {
      const ext = solutionFile.name.split(".").pop();
      const fileId = crypto.randomUUID();
      const filePath = `${fileId}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("solutions")
        .upload(filePath, solutionFile);
      if (uploadErr) {
        setError("File upload failed");
        setIsSubmitting(false);
        toast.error("File upload failed. Check the file and try again.");
        return;
      }
      fileUrl = `solutions/${filePath}`;
    }

    const { error: insertError } = await supabase.from("solutions").insert({
      question_id: questionId,
      submitted_by: profile.id,
      body: trimmedBody ? sanitizeHtml(trimmedBody) : null,
      file_url: fileUrl,
      status: "published",
    } as never);

    if (insertError) {
      setError("Failed to submit solution.");
      setIsSubmitting(false);
      toast.error("Failed to submit solution. Please try again.");
      return;
    }

    resetForm();
    setOpen(false);
    toast.success("Solution posted — thanks for contributing!");
    router.refresh();
    setIsSubmitting(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      setError("File must be under 10MB");
      toast.warning("File must be under 10MB");
      return;
    }
    if (!VALID_TYPES.includes(f.type)) {
      setError("Only PDF, JPG, or PNG files");
      toast.warning("Only PDF, JPG, or PNG files are accepted");
      return;
    }
    setError("");
    setSolutionFile(f);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Add a solution
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          className="hidden"
        />
        {solutionFile ? (
          <div className="flex items-center gap-2 rounded-md border border-success-200 bg-success-50 px-3 py-2">
            <svg className="h-4 w-4 shrink-0 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span className="truncate text-sm text-gray-700">{solutionFile.name}</span>
            <button
              type="button"
              onClick={() => {
                setSolutionFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="ml-auto text-xs font-medium text-danger-600 hover:text-danger-800"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-600 transition-all hover:border-secondary hover:bg-secondary/5 hover:text-secondary"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Attach image or PDF
            <span className="text-xs font-normal text-gray-400">(PDF, JPG, PNG · 10MB max)</span>
          </button>
        )}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="Write your solution (or attach a file above)..."
        className="block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
      />
      {error && <p className="text-sm text-danger-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            resetForm();
          }}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
