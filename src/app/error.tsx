"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
        <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        We encountered an unexpected issue. Our team has been notified.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button onClick={reset} className="btn-primary px-6 py-2.5 text-sm">
          Try Again
        </button>
        <Link href="/" className="btn-secondary px-6 py-2.5 text-sm">
          Go Home
        </Link>
      </div>
    </div>
  );
}
