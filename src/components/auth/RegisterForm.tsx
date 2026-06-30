"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";

type FormData = z.infer<typeof registerSchema>;

interface Faculty {
  id: string;
  name: string;
}

interface Programme {
  id: string;
  name: string;
  available_levels: number[];
}

export function RegisterForm() {
  const router = useRouter();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [levels, setLevels] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const domainEmailToastRef = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(registerSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  const selectedFaculty = watch("facultyId");
  const selectedProgramme = watch("departmentId");

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const headers = { apikey: anonKey };
    fetch(`${supabaseUrl}/rest/v1/faculties?select=id,name&order=name.asc`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (data.length) setFaculties(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedFaculty) {
      setProgrammes([]);
      setLevels([]);
      setValue("departmentId", "" as never);
      setValue("currentLevel", "" as never);
      return;
    }
    fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/departments?select=id,name,available_levels&faculty_id=eq.${selectedFaculty}&order=name.asc`,
      { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } },
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setProgrammes(data);
        setLevels([]);
        setValue("departmentId", "" as never);
        setValue("currentLevel", "" as never);
      });
  }, [selectedFaculty, setValue]);

  useEffect(() => {
    if (!selectedProgramme) {
      setLevels([]);
      setValue("currentLevel", "" as never);
      return;
    }
    const prog = programmes.find((d) => d.id === selectedProgramme);
    if (prog) {
      setLevels(prog.available_levels);
      setValue("currentLevel", "" as never);
    }
  }, [selectedProgramme, programmes, setValue]);

  const onSubmit = async (data: FormData) => {
    setError("");

    const otpRes = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        fullName: data.fullName,
        matricNumber: data.matricNumber,
        departmentId: data.departmentId,
        currentLevel: data.currentLevel,
      }),
    });

    if (!otpRes.ok) {
      const { error: otpErr } = await otpRes.json();
      setError(otpErr || "Failed to send OTP");
      setShakeKey((k) => k + 1);
      toast.error(otpErr || "Failed to send OTP");
      return;
    }

    toast.success("Verification code sent to your email");
    const params = new URLSearchParams({ email: data.email });
    router.push(`/register/verify?${params}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left" key={shakeKey}>
      <div className="w-full animate-fade-in-up stagger-1">
        <label htmlFor="fullName" className="mb-2 block text-sm font-semibold text-gray-700">
          Full name
        </label>
        <Input id="fullName" placeholder="Your full name" className="h-12 rounded-xl focus-visible:ring-[#7A1030]" {...register("fullName")} />
        {errors.fullName && (
          <p className="mt-1 text-xs text-danger-600 animate-fade-in">{errors.fullName.message}</p>
        )}
      </div>

      <div className="w-full animate-fade-in-up stagger-2">
        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">
          University email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@university.edu.ng"
          className="h-12 rounded-xl focus-visible:ring-[#7A1030]"
          {...register("email")}
          onBlur={(e) => {
            const domain = process.env.NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN || "";
            if (e.target.value && !e.target.value.endsWith(domain)) {
              setError(`Only ${domain} emails are accepted`);
              if (domainEmailToastRef.current) toast.dismiss(domainEmailToastRef.current);
              const id = toast.warning(`Only ${domain} emails are accepted`);
              domainEmailToastRef.current = id as string;
            } else {
              setError("");
            }
          }}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-danger-600 animate-fade-in">{errors.email.message}</p>
        )}
      </div>

      <div className="w-full animate-fade-in-up stagger-3">
        <label htmlFor="matricNumber" className="mb-2 block text-sm font-semibold text-gray-700">
          Matric number
        </label>
        <Input id="matricNumber" placeholder="Matric number" className="h-12 rounded-xl focus-visible:ring-[#7A1030]" {...register("matricNumber")} />
        {errors.matricNumber && (
          <p className="mt-1 text-xs text-danger-600 animate-fade-in">{errors.matricNumber.message}</p>
        )}
      </div>

      <div className="animate-fade-in-up stagger-4 rounded-3xl bg-white/60 p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
          Academic Info
        </p>
        <div className="space-y-4">
          <div className="w-full">
            <label htmlFor="facultyId" className="mb-2 block text-sm font-semibold text-gray-700">
              Faculty
            </label>
            <Controller
              control={control}
              name="facultyId"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || undefined)}
                >
                  <SelectTrigger className="h-12 w-full rounded-xl px-4 focus-visible:ring-[#7A1030]">
                    <SelectValue placeholder="Select faculty">
                      {(value: string) =>
                        faculties.find((f) => f.id === value)?.name ?? "Select faculty"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {faculties.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.facultyId && (
              <p className="mt-1 text-xs text-danger-600 animate-fade-in">{errors.facultyId.message}</p>
            )}
          </div>

          <div className="w-full">
            <label htmlFor="departmentId" className="mb-2 block text-sm font-semibold text-gray-700">
              Programme
            </label>
            <Controller
              control={control}
              name="departmentId"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || undefined)}
                  disabled={!selectedFaculty}
                  key={selectedFaculty || "none"}
                >
                  <SelectTrigger className="h-12 w-full rounded-xl px-4 focus-visible:ring-[#7A1030]">
                    <SelectValue placeholder="Select programme">
                      {(value: string) =>
                        programmes.find((d) => d.id === value)?.name ?? "Select programme"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {programmes.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.departmentId && (
              <p className="mt-1 text-xs text-danger-600 animate-fade-in">{errors.departmentId.message}</p>
            )}
          </div>

          <div className="w-full">
            <label htmlFor="currentLevel" className="mb-2 block text-sm font-semibold text-gray-700">
              Current level
            </label>
            <Controller
              control={control}
              name="currentLevel"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || undefined)}
                  disabled={!selectedProgramme}
                >
                  <SelectTrigger className="h-12 w-full rounded-xl px-4 focus-visible:ring-[#7A1030]">
                    <SelectValue placeholder="Select level">
                      {(value: string) =>
                        value ? `${value} Level` : "Select level"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((l) => (
                      <SelectItem key={l} value={String(l)}>
                        {l} Level
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.currentLevel && (
              <p className="mt-1 text-xs text-danger-600 animate-fade-in">{errors.currentLevel.message}</p>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-danger-600 animate-fade-in">{error}</p>}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl py-5 text-md font-semibold"
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <svg className="h-4 w-4 animate-spinner" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending code...
          </span>
        ) : "Continue →"}
      </Button>
    </form>
  );
}
