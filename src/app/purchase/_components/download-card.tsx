"use client";

import { useState } from "react";
import { getOrderDownload } from "@/actions/customer-orders.actions";
import { Download } from "lucide-react";

/** RCCF-TRACK-01 Phase 5 — secure download button (email-verified, token-gated). */
export function DownloadCard({ orderId, email, ready, limitReached }: { orderId: string; email: string; ready: boolean; limitReached: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLink = async () => {
    setLoading(true); setError(null);
    const r = await getOrderDownload(orderId, email || undefined);
    if (r.success && r.url) {
      window.location.href = r.url;
    } else {
      setError(r.error ?? "Unable to prepare download");
    }
    setLoading(false);
  };

  return (
    <div className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-white"><Download className="h-3.5 w-3.5 text-indigo-400" /> Your download</p>
      {limitReached ? (
        <p className="mt-1 text-xs text-zinc-500">Download limit reached — contact the creator.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-zinc-500">{ready ? "Your download is ready." : "Download links are prepared securely on request."}</p>
          <button onClick={getLink} disabled={loading} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50">
            <Download className="h-4 w-4" /> {loading ? "Preparing…" : "Download"}
          </button>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </>
      )}
    </div>
  );
}
