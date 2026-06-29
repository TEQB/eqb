"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfViewerInnerProps {
  fileUrl: string;
}

export function PdfViewerInner({ fileUrl }: PdfViewerInnerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState(false);

  function onLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  if (error) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">
          PDF could not be rendered.{" "}
          <a href={fileUrl} download className="font-medium text-primary-600 hover:text-primary-800">
            Download instead
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <Document
        file={fileUrl}
        onLoadSuccess={onLoadSuccess}
        onLoadError={() => setError(true)}
      >
        <Page pageNumber={pageNumber} className="mx-auto" />
      </Document>
      {numPages > 1 && (
        <div className="flex items-center justify-center gap-4 border-t border-gray-200 bg-gray-50 px-4 py-2">
          <button
            type="button"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            className="text-sm text-gray-700 disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-gray-500">
            {pageNumber} / {numPages}
          </span>
          <button
            type="button"
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            className="text-sm text-gray-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
