"use client";

import dynamic from "next/dynamic";

const BuilderWorkspace = dynamic(
  () => import("./workspace").then((m) => m.BuilderWorkspace),
  {
    ssr: false,
    // RCCF-VALIDATION-05: the loader MUST mount the workspace — the prior
    // "no blank screen" change returned only this spinner and never rendered
    // <BuilderWorkspace/>, so /builder hung on the loading screen forever.
    // This fallback keeps the spinner during the dynamic-chunk load, then the
    // workspace mounts and drives its own loading state to completion.
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-root,#0A0A0B)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-s8ul-cyan border-t-transparent" />
          <p className="text-sm text-zinc-400">Loading your editor…</p>
        </div>
      </div>
    ),
  }
);

export default function BuilderLoader() {
  return <BuilderWorkspace />;
}
