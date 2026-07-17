"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  magicProvisionFromYoutube,
  attachCustomDomain,
  type ProvisionResult,
} from "@/actions/super-admin.actions";

interface TenantRow {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  createdAt: Date;
  _count: { users: number; products: number };
}

export function ProvisionModal({
  open,
  onClose,
  tenants,
}: {
  open: boolean;
  onClose: () => void;
  tenants: TenantRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"provision" | "domains">("provision");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<ProvisionResult | null>(null);
  const [domainInputs, setDomainInputs] = useState<Record<string, string>>({});
  const [domainLoading, setDomainLoading] = useState<Record<string, boolean>>({});

  async function handleProvision() {
    if (!youtubeUrl.trim()) return;
    setProvisioning(true);
    setProvisionResult(null);
    const formData = new FormData();
    formData.set("youtubeUrl", youtubeUrl);
    const result = await magicProvisionFromYoutube({ success: false }, formData);
    setProvisionResult(result);
    setProvisioning(false);
    if (result.success) {
      setYoutubeUrl("");
      router.refresh();
    }
  }

  const attachDomain = useCallback(
    async (tenantId: string) => {
      const domain = domainInputs[tenantId]?.trim();
      if (!domain) return;
      setDomainLoading((prev) => ({ ...prev, [tenantId]: true }));
      const result = await attachCustomDomain(tenantId, domain);
      setDomainLoading((prev) => ({ ...prev, [tenantId]: false }));
      if (result.success) {
        setDomainInputs((prev) => ({ ...prev, [tenantId]: "" }));
        router.refresh();
      }
    },
    [domainInputs, router],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-xl max-h-[80vh] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl backdrop-blur-xl"
      >
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Provision &amp; Domains</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex gap-1 rounded-lg border border-white/10 bg-zinc-900 p-1 mb-5">
          <button
            onClick={() => setTab("provision")}
            className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-colors ${
              tab === "provision"
                ? "bg-s8ul-cyan/10 text-s8ul-cyan"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            YouTube Provision
          </button>
          <button
            onClick={() => setTab("domains")}
            className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-colors ${
              tab === "domains"
                ? "bg-s8ul-cyan/10 text-s8ul-cyan"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Custom Domains
          </button>
        </div>

        {/* ─── YouTube Provision Tab ─── */}
        {tab === "provision" && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              Paste a YouTube channel URL or handle to auto-create the tenant.
            </p>
            <div className="flex gap-3">
              <input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="@mortal or https://youtube.com/@mortal"
                className="admin-input flex-1"
                disabled={provisioning}
                onKeyDown={(e) => e.key === "Enter" && handleProvision()}
              />
              <button
                onClick={handleProvision}
                disabled={provisioning || !youtubeUrl.trim()}
                className="admin-btn-cyan px-6 whitespace-nowrap"
              >
                {provisioning ? "Scraping..." : "Provision"}
              </button>
            </div>

            {provisionResult?.error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
                {provisionResult.error}
              </div>
            )}

            {provisionResult?.success && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm space-y-2"
              >
                <p className="text-emerald-400 font-medium">Creator provisioned!</p>
                <div className="grid grid-cols-2 gap-2 text-zinc-300">
                  <span>Subdomain:</span>
                  <code className="text-s8ul-cyan">{provisionResult.subdomain}</code>
                  <span>Login:</span>
                  <code className="text-white">{provisionResult.email}</code>
                  <span>Password:</span>
                  <code className="text-white">{provisionResult.password}</code>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ─── Custom Domains Tab ─── */}
        {tab === "domains" && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-500">
              Attach a custom domain to a tenant. This registers it on Vercel.
            </p>
            {tenants.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-900/50 px-4 py-3"
              >
                <span className="text-sm text-zinc-300 w-28 shrink-0 truncate">{t.name}</span>
                <input
                  value={domainInputs[t.id] || ""}
                  onChange={(e) => setDomainInputs((prev) => ({ ...prev, [t.id]: e.target.value }))}
                  placeholder={t.customDomain || "example.com"}
                  className="admin-input flex-1 text-sm"
                  disabled={domainLoading[t.id]}
                  onKeyDown={(e) => e.key === "Enter" && attachDomain(t.id)}
                />
                <button
                  onClick={() => attachDomain(t.id)}
                  disabled={domainLoading[t.id] || !domainInputs[t.id]?.trim()}
                  className="admin-btn-cyan text-xs px-4 py-2 shrink-0"
                >
                  {domainLoading[t.id] ? "..." : "Attach"}
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
