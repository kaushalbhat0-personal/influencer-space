"use client";

import dynamic from "next/dynamic";

const BuilderWorkspace = dynamic(
  () => import("./workspace").then((m) => m.BuilderWorkspace),
  { ssr: false }
);

export default function BuilderLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-root,#0A0A0B)]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-s8ul-cyan border-t-transparent" />
        <p className="text-sm text-zinc-400">Loading your editor…</p>
      </div>
    </div>
  );
}
