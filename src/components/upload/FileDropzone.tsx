"use client";

interface FileDropzoneProps {
  onFileSelect: (file: File | null) => void;
  file: File | null;
}

export function FileDropzone({ onFileSelect, file }: FileDropzoneProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && validateFile(f)) onFileSelect(f);
  };

  return (
    <div className="flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed border-white/70 bg-white/75 p-8 text-center transition-all duration-normal hover:border-secondary/40 hover:bg-secondary/5">
      {file ? (
        <div className="space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-success-100">
            <svg className="h-5 w-5 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">{file.name}</p>
          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          <button type="button" onClick={() => onFileSelect(null)} className="text-xs font-medium text-danger-600 transition-colors hover:text-danger-800">Remove</button>
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
      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleChange} className="hidden" />
    </div>
  );
}

function validateFile(file: File): boolean {
  const maxSize = 10 * 1024 * 1024;
  const validTypes = ["application/pdf", "image/jpeg", "image/png"];
  return file.size <= maxSize && validTypes.includes(file.type);
}
