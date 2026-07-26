"use client";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="admin-card max-w-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
          <svg className="h-7 w-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-red-400">Something went wrong</h2>
        <p className="mt-2 text-sm text-zinc-400">
          We encountered an unexpected issue while loading this page. Our team has been notified.
        </p>
        <div className="mt-6 space-y-3">
          <button onClick={reset} className="admin-btn-cyan w-full">
            Try Again
          </button>
          <a href="/admin/dashboard" className="block text-sm text-zinc-500 hover:text-zinc-300 underline underline-offset-2">
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
