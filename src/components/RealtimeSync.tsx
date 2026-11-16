"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RealtimeSync({ tables }: { tables: string[] }) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase.channel("realtime-sync");

    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          router.refresh();
        },
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router, tables]);

  return null;
}
