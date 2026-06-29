"use client";

import dynamic from "next/dynamic";

const PdfViewerInner = dynamic(
  () => import("./PdfViewerInner").then((mod) => ({ default: mod.PdfViewerInner })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">Loading PDF viewer...</p>
      </div>
    ),
  },
);

interface PdfViewerProps {
  fileUrl: string;
}

export function PdfViewer({ fileUrl }: PdfViewerProps) {
  return <PdfViewerInner fileUrl={fileUrl} />;
}
