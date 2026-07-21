import Link from "next/link";

export default function StorefrontNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white px-4">
      <div className="text-center space-y-4">
        <p className="text-6xl font-bold font-display text-zinc-800">404</p>
        <h1 className="text-xl font-semibold">Creator Not Found</h1>
        <p className="text-sm text-zinc-500 max-w-md">
          This creator profile doesn&apos;t exist or has been removed.
        </p>
        <Link href="/" className="admin-btn-cyan inline-flex text-sm">
          ← Back to CreatorStore
        </Link>
      </div>
    </main>
  );
}
