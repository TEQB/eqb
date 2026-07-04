"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazyMountProps {
  children: ReactNode;
  placeholder?: ReactNode;
  rootMargin?: string;
}

export function LazyMount({ children, placeholder, rootMargin = "400px" }: LazyMountProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldRender) return;
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldRender, rootMargin]);

  return <div ref={ref}>{shouldRender ? children : placeholder ?? null}</div>;
}
