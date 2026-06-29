import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="clay-panel max-w-md p-8">
        <p className="text-5xl font-bold text-primary/20">404</p>
        <h1 className="mt-4 text-xl font-semibold text-primary">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-primary-700"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
