"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Phase = "show" | "exit" | "done";

export function SplashWrapper() {
  const [phase, setPhase] = useState<Phase>("show");

  useEffect(() => {
    // Phase timings (ms):
    //   show:  1700ms  logo pulses to full scale, holds, with a soft glow
    //   exit:   900ms   overlay fades + logo glides into navbar position + content fades in
    //   done:   remove overlay from DOM
    const t1 = setTimeout(() => setPhase("exit"), 1700);
    const t2 = setTimeout(() => setPhase("done"), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "done") return null;

  const isEntering = phase === "show";

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] pointer-events-none transition-opacity duration-700 ease-in-out ${
        isEntering ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop: white + heavy blur that fades toward transparent */}
      <div
        className={`absolute inset-0 transition-all duration-[900ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
          isEntering
            ? "bg-white/95 backdrop-blur-2xl"
            : "bg-white/0 backdrop-blur-0"
        }`}
      />
      {/* Soft glow behind the logo while it pulses */}
      <div
        className={`absolute left-1/2 top-1/2 h-40 w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl transition-opacity duration-1000 ${
          phase === "show" ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Logo: scales up on enter, glides to navbar position on exit */}
      <div
        className={`absolute left-1/2 top-1/2 flex h-20 w-[280px] items-center justify-center transition-all duration-[900ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
          phase === "show"
            ? "-translate-x-1/2 -translate-y-1/2 scale-100 opacity-100"
            : "-translate-x-[calc(50%+1px-16px)] -translate-y-[calc(50%+1px+12px)] scale-[0.171428] opacity-0"
        }`}
      >
        <Image
          src="/logo.png"
          alt="EQB"
          width={310}
          height={104}
          className="h-40 w-auto object-contain drop-shadow-[0_8px_24px_rgba(122,16,48,0.18)]"
          priority
        />
      </div>
    </div>
  );
}
