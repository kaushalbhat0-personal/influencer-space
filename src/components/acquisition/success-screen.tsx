"use client";

import { CheckCircle2, ExternalLink, LayoutDashboard, Plus } from "lucide-react";
import Link from "next/link";

export function SuccessScreen({
  storefrontUrl,
  tenantId,
  creatorName,
  onCreateAnother,
}: {
  storefrontUrl: string;
  tenantId: string;
  creatorName: string;
  onCreateAnother: () => void;
}) {
  return (
    <div className="text-center space-y-6 py-4">
      <div className="rounded-full bg-emerald-500/20 p-4 w-fit mx-auto">
        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-white">Storefront Created!</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {creatorName}&apos;s storefront is live.
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <p className="text-xs text-zinc-500 mb-1">Storefront URL</p>
        <a
          href={storefrontUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--brand-primary)] hover:text-[var(--brand-primary)] text-sm font-medium flex items-center justify-center gap-1.5"
        >
          {storefrontUrl}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href={`/super-admin/tenants/${tenantId}`}
          className="btn-primary px-6 py-2.5 text-sm inline-flex items-center justify-center gap-2"
        >
          <LayoutDashboard className="h-4 w-4" />
          View Dashboard
        </Link>
        <button
          onClick={onCreateAnother}
          className="btn-secondary px-6 py-2.5 text-sm inline-flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Another
        </button>
      </div>
    </div>
  );
}
