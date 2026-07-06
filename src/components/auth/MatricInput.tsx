"use client";

import { useRef, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MatricInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}

function parseValue(value: string = "") {
  const parts = value.split("/");
  return { year: parts[1] || "", gender: parts[2] || "", id: parts[3] || "" };
}

export function MatricInput({ value = "", onChange, onBlur }: MatricInputProps) {
  const segments = parseValue(value);
  const yearRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);

  const emit = useCallback(
    (year: string, gender: string, id: string) => {
      onChange?.(`125/${year}/${gender}/${id}`);
    },
    [onChange],
  );

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
    emit(v, segments.gender, segments.id);
    if (v.length === 2) {
      idRef.current?.focus();
    }
  };

  const handleGenderChange = (v: string | null) => {
    emit(segments.year, v || "", segments.id);
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
    emit(segments.year, segments.gender, v);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValue: string,
    targetRef: React.RefObject<HTMLInputElement | null>,
  ) => {
    if (e.key === "Backspace" && currentValue.length === 0) {
      targetRef.current?.focus();
    }
  };

  const handleContainerBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      onBlur?.();
    }
  };

  const inputClass =
    "h-11 w-[3.25rem] rounded-lg border border-gray-200 bg-white text-center text-sm font-semibold " +
    "placeholder:text-gray-300 " +
    "transition-shadow duration-150 " +
    "focus:border-[#7A1030] focus:outline-none focus:ring-2 focus:ring-[#7A1030]/15";

  return (
    <div className="flex flex-wrap items-center gap-1.5" onBlur={handleContainerBlur}>
      {/* static 125 */}
      <span className="inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-lg border border-gray-200 bg-[#7A1030]/5 px-2.5 text-sm font-bold tracking-tight text-[#7A1030]">
        125
      </span>

      <span className="text-gray-300 select-none text-xs font-light">/</span>

      {/* year */}
      <input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={segments.year}
        onChange={handleYearChange}
        onKeyDown={(e) => handleKeyDown(e, segments.year, idRef)}
        className={inputClass}
        placeholder="YY"
      />

      <span className="text-gray-300 select-none text-xs font-light">/</span>

      {/* gender */}
      <Select value={segments.gender} onValueChange={handleGenderChange}>
        <SelectTrigger className="h-11 w-[7.75rem] rounded-lg border-gray-200 px-3 text-sm transition-shadow duration-150 focus-visible:ring-2 focus-visible:ring-[#7A1030]/15 focus-visible:border-[#7A1030] data-[placeholder]:text-gray-300">
          <SelectValue placeholder="Gender" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1 — Male</SelectItem>
          <SelectItem value="2">2 — Female</SelectItem>
        </SelectContent>
      </Select>

      <span className="text-gray-300 select-none text-xs font-light">/</span>

      {/* id */}
      <input
        ref={idRef}
        type="text"
        inputMode="numeric"
        maxLength={4}
        value={segments.id}
        onChange={handleIdChange}
        onKeyDown={(e) => handleKeyDown(e, segments.id, yearRef)}
        className="h-11 w-[4.5rem] rounded-lg border border-gray-200 bg-white text-center text-sm font-semibold placeholder:text-gray-300 transition-shadow duration-150 focus:border-[#7A1030] focus:outline-none focus:ring-2 focus:ring-[#7A1030]/15"
        placeholder="####"
      />
    </div>
  );
}
