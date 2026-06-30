"use client";

export default function ErrorPage({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="clay-panel max-w-md p-8">
        <p className="text-5xl font-bold text-primary/20">500</p>
        <h1 className="mt-4 text-xl font-semibold text-primary">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-primary-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
