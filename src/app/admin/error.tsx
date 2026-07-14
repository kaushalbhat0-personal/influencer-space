"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-lg bg-red-500/10 p-8">
        <h2 className="text-xl font-bold text-red-400">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-red-300">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded bg-s8ul-cyan px-6 py-2 text-sm font-medium text-black transition-colors hover:bg-s8ul-cyan/80"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
