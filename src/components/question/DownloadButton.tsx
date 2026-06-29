"use client";

import { createClient } from "@/lib/supabase/client";

interface DownloadButtonProps {
  fileUrl: string;
  fileName: string;
}

export function DownloadButton({ fileUrl, fileName }: DownloadButtonProps) {
  const supabase = createClient();

  const handleDownload = async () => {
    const { data } = await supabase.storage
      .from("approved")
      .createSignedUrl(fileUrl, 60);

    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = fileName;
      a.click();
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handleDownload();
      }}
      className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
    >
      Download ↓
    </button>
  );
}
