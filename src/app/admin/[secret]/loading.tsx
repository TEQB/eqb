export default function AdminLoading() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-56 shrink-0 border-r border-white/70 bg-white/65 shadow-[12px_0_30px_rgba(63,39,50,0.06)] backdrop-blur-xl md:block">
        <div className="space-y-4 p-4">
          <div className="h-10 w-32 rounded-lg bg-gray-200/70" />
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div key={idx} className="h-9 rounded-lg bg-gray-100/80" />
            ))}
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/70 bg-white/80 px-4 backdrop-blur-xl">
          <div className="h-9 w-9 rounded-lg bg-gray-200/70" />
          <div className="h-6 w-28 rounded-lg bg-gray-200/70" />
          <div className="h-9 w-9 rounded-full bg-gray-200/70" />
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="space-y-4">
            <div className="h-10 w-64 rounded-xl bg-gray-200/70" />
            <div className="h-6 w-96 rounded-xl bg-gray-100/80" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-28 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
