import Link from "next/link";

export const dynamic = "force-dynamic";

export default function WebsiteNavigationPage() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Navigation</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage your website&apos;s navigation menu.</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-500">Navigation management is coming soon. Use the Builder to edit navigation for now.</p>
        <Link href="/builder" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-s8ul-cyan px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
          Open Builder
        </Link>
      </div>
    </div>
  );
}
