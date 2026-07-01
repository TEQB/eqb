"use client";

import { useRef, useState } from "react";

interface FileDropzoneProps {
  onFileSelect: (file: File | null) => void;
  file: File | null;
}

export function FileDropzone({ onFileSelect, file }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reason = validateFile(f);
    if (reason) {
      setError(reason);
      return;
    }
    setError(null);
    onFileSelect(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    const reason = validateFile(droppedFile);
    if (reason) {
      setError(reason);
      return;
    }
    setError(null);
    onFileSelect(droppedFile);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed bg-white/75 p-8 text-center transition-all duration-normal hover:border-secondary/40 hover:bg-secondary/5 ${
        isDragging
          ? "border-secondary scale-105 bg-secondary/10"
          : "border-white/70"
      }`}
    >
      {file ? (
        <div className="space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-success-100">
            <svg className="h-5 w-5 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">{file.name}</p>
          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFileSelect(null);
            }}
            className="text-xs font-medium text-danger-600 transition-colors hover:text-danger-800"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm text-gray-500">Drag and drop, or <span className="font-medium text-secondary">browse</span></p>
          <p className="mt-1 text-xs text-gray-400">PDF, JPG, or PNG — max 10MB</p>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-danger-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}

function validateFile(file: File): string | null {
  const maxSize = 10 * 1024 * 1024;
  const validTypes = ["application/pdf", "image/jpeg", "image/png"];
  if (file.size > maxSize) return "File is too large. Max size is 10MB.";
  if (!validTypes.includes(file.type)) return "Unsupported file type. Please upload a PDF, JPG, or PNG.";
  return null;
}