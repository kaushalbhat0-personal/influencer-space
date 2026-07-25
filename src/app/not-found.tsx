import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
        <svg className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn-primary px-6 py-2.5 text-sm">
          Go Home
        </Link>
        <Link href="/admin/dashboard" className="btn-secondary px-6 py-2.5 text-sm">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
