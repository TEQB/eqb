import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExploreClient } from "@/components/explore/ExploreClient";
import { Skeleton } from "@/components/ui/skeleton";

export default async function ExplorePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawFaculties } = await supabase
    .from("faculties")
    .select("id, name")
    .order("name");
  const faculties = (rawFaculties as unknown as Array<{ id: string; name: string }>) ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-primary">Other Past Questions</h2>
        <p className="mt-1 text-sm text-gray-500">
          Select a faculty, programme, and course to browse past questions
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-5 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <Skeleton className="mt-1 h-5 w-20 rounded" />
                <Skeleton className="mt-1 h-11 w-full animate-pulse rounded-md bg-gray-100" />
              </div>
            ))}
          </div>
        }
      >
        <ExploreClient initialFaculties={faculties} />
      </Suspense>
    </div>
  );
}