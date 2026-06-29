"use client";

import { type ReactNode, useEffect, useState } from "react";
import Image from "next/image";

type Phase = "spacer" | "show" | "exit" | "done";

export function SplashWrapper({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("spacer");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Phase timings (ms):
    //   spacer: 50ms    tiny delay so the overlay mounts before we animate (avoids skipping first frame)
    //   show:   1700ms  logo pulses to full scale, holds, with a soft glow
    //   exit:   900ms   overlay fades + logo glides into navbar position + content fades in
    //   done:   remove overlay from DOM
    const t1 = setTimeout(() => setPhase("show"), 50);
    const t2 = setTimeout(() => setPhase("exit"), 1750);
    const t3 = setTimeout(() => setPhase("done"), 2650);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // SSR / pre-mount: just render the page so it never blocks initial paint
  if (!mounted) return <>{children}</>;
  if (phase === "done") return <>{children}</>;

  const isEntering = phase === "spacer" || phase === "show";
  const isExiting = phase === "exit";

  return (
    <>
      {/* Splash overlay */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-[100] transition-opacity duration-700 ease-in-out ${
          isEntering ? "opacity-100" : "opacity-0"
        } ${isExiting ? "pointer-events-none" : ""}`}
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
            phase === "spacer"
              ? "translate-x-[calc(-50%+0.001px)] translate-y-[-50%] scale-80 opacity-0"
              : phase === "show"
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

      {/* Content: fades in during exit phase */}
      <div
        className={`transition-opacity duration-700 ease-out ${
          isExiting ? "opacity-100" : "opacity-0"
        }`}
      >
        {children}
      </div>
    </>
  );
}
