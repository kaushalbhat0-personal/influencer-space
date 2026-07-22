"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { attachCustomDomain } from "@/actions/super-admin.actions";
import { analyzeCreatorImport, importCreator } from "@/actions/import.actions";
import { getAllAdapters } from "@/lib/import/adapters";
import { ImportPreview } from "@/components/import/ImportPreview";
import { ImportHistoryTable } from "@/components/import/ImportHistoryTable";
import { DEMO_SEEDS } from "@/lib/demo/seeds";
import type { ImportSource, CreatorProfile, ImportAnalysisResult, ImportRecord } from "@/lib/import/types";
import { Video, User, Grid, Globe } from "lucide-react";

interface TenantRow {
  id: string; name: string; subdomain: string;
  customDomain: string | null; createdAt: Date;
  _count: { users: number; products: number };
}

const SOURCE_ICON: Record<string, typeof Grid> = {
  demo_seed: Grid, manual: User, youtube: Video,
};

export function ProvisionModal({ open, onClose, tenants }: { open: boolean; onClose: () => void; tenants: TenantRow[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"import" | "domains" | "history">("import");

  // Import flow
  const [source, setSource] = useState<ImportSource>("youtube");
  const [input, setInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ImportAnalysisResult | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; storefrontUrl: string; creatorName: string } | null>(null);
  const [importRecords, setImportRecords] = useState<ImportRecord[]>([]);

  // Domains
  const [domainInputs, setDomainInputs] = useState<Record<string, string>>({});
  const [domainLoading, setDomainLoading] = useState<Record<string, boolean>>({});

  async function handleAnalyze() {
    if (!input.trim()) return;
    setAnalyzing(true);
    setAnalysis(null);
    setImportResult(null);
    const result = await analyzeCreatorImport(source, input);
    setAnalysis(result);
    setAnalyzing(false);
  }

  async function handleProvision(profile: CreatorProfile) {
    setProvisioning(true);
    const result = await importCreator(source, input, profile);
    setImportResult({ success: result.success, storefrontUrl: result.storefrontUrl, creatorName: profile.brandName });
    setImportRecords((prev) => [result.record, ...prev]);
    setProvisioning(false);
    if (result.success) {
      setInput("");
      setAnalysis(null);
      router.refresh();
    }
  }

  const attachDomain = useCallback(async (tenantId: string) => {
    const domain = domainInputs[tenantId]?.trim();
    if (!domain) return;
    setDomainLoading((prev) => ({ ...prev, [tenantId]: true }));
    const result = await attachCustomDomain(tenantId, domain);
    setDomainLoading((prev) => ({ ...prev, [tenantId]: false }));
    if (result.success) {
      setDomainInputs((prev) => ({ ...prev, [tenantId]: "" }));
      router.refresh();
    }
  }, [domainInputs, router]);

  if (!open) return null;

  const demoSeeds = source === "demo_seed" ? DEMO_SEEDS : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[6vh]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl backdrop-blur-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Creator Import</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border border-white/10 bg-zinc-900 p-1 mb-5">
          <button onClick={() => { setTab("import"); setAnalysis(null); setImportResult(null); }} className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-colors ${tab === "import" ? "bg-s8ul-cyan/10 text-s8ul-cyan" : "text-zinc-500 hover:text-zinc-300"}`}>Import</button>
          <button onClick={() => setTab("history")} className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-colors ${tab === "history" ? "bg-s8ul-cyan/10 text-s8ul-cyan" : "text-zinc-500 hover:text-zinc-300"}`}>History</button>
          <button onClick={() => setTab("domains")} className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-colors ${tab === "domains" ? "bg-s8ul-cyan/10 text-s8ul-cyan" : "text-zinc-500 hover:text-zinc-300"}`}>Domains</button>
        </div>

        {/* ── Import Tab ── */}
        {tab === "import" && (
          <div className="space-y-5">

            {/* Source Selection */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Import Source</label>
              <div className="grid grid-cols-3 gap-2">
                {getAllAdapters().map((a) => {
                  const AdapterIcon = SOURCE_ICON[a.source] || Globe;
                  const active = source === a.source;
                  return (
                    <button key={a.source} onClick={() => { setSource(a.source); setAnalysis(null); setImportResult(null); }} className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-center transition-all ${active ? "border-indigo-500/40 bg-indigo-500/10" : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"}`}>
                      <AdapterIcon className={`h-5 w-5 ${active ? "text-indigo-400" : "text-zinc-500"}`} />
                      <span className={`text-[10px] font-medium leading-tight ${active ? "text-indigo-300" : "text-zinc-400"}`}>{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                {source === "demo_seed" ? "Select Template" : source === "manual" ? "Creator Name" : "YouTube URL or Handle"}
              </label>

              {source === "demo_seed" ? (
                <select value={input} onChange={(e) => setInput(e.target.value)} className="admin-input w-full text-sm">
                  <option value="">Choose a seed...</option>
                  {demoSeeds.map((s) => (
                    <option key={s.id} value={s.id}>{s.brand.name} — {s.industry}</option>
                  ))}
                </select>
              ) : (
                <div className="flex gap-3">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={source === "manual" ? "e.g. Priya Sharma" : "@channel or https://youtube.com/@channel"}
                    className="admin-input flex-1"
                    disabled={analyzing || provisioning}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  />
                  <button onClick={handleAnalyze} disabled={analyzing || !input.trim()} className="admin-btn-cyan px-6 whitespace-nowrap">
                    {analyzing ? "Analyzing..." : "Analyze"}
                  </button>
                </div>
              )}

              {source === "demo_seed" && input && (
                <button onClick={handleAnalyze} disabled={analyzing} className="admin-btn-cyan px-6 py-2 text-sm mt-2">
                  {analyzing ? "Analyzing..." : "Analyze Seed"}
                </button>
              )}
            </div>

            {/* Analysis -> Preview */}
            {analysis && !importResult && (
              <ImportPreview
                analysis={analysis}
                onConfirm={handleProvision}
                onCancel={() => setAnalysis(null)}
                provisioning={provisioning}
              />
            )}

            {/* Result */}
            {importResult && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-lg border p-4 text-sm space-y-2 ${importResult.success ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}
              >
                <p className={importResult.success ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>
                  {importResult.success ? "Creator provisioned!" : "Provision failed"}
                </p>
                {importResult.success && (
                  <div className="grid grid-cols-2 gap-2 text-zinc-300">
                    <span>Creator:</span>
                    <code className="text-s8ul-cyan">{importResult.creatorName}</code>
                    <span>Storefront:</span>
                    <code className="text-white">{importResult.storefrontUrl}</code>
                  </div>
                )}
                {!importResult.success && (
                  <p className="text-red-300/80 text-xs">Check the import history for details.</p>
                )}
                <button onClick={() => { setAnalysis(null); setImportResult(null); }} className="text-xs text-zinc-500 hover:text-zinc-300 mt-2">Import another</button>
              </motion.div>
            )}
          </div>
        )}

        {/* ── History Tab ── */}
        {tab === "history" && (
          <ImportHistoryTable records={importRecords} />
        )}

        {/* ── Domains Tab ── */}
        {tab === "domains" && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-500">Attach a custom domain to a tenant. This registers it on Vercel.</p>
            {tenants.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-900/50 px-4 py-3">
                <span className="text-sm text-zinc-300 w-28 shrink-0 truncate">{t.name}</span>
                <input value={domainInputs[t.id] || ""} onChange={(e) => setDomainInputs((prev) => ({ ...prev, [t.id]: e.target.value }))} placeholder={t.customDomain || "example.com"} className="admin-input flex-1 text-sm" disabled={domainLoading[t.id]} onKeyDown={(e) => e.key === "Enter" && attachDomain(t.id)} />
                <button onClick={() => attachDomain(t.id)} disabled={domainLoading[t.id] || !domainInputs[t.id]?.trim()} className="admin-btn-cyan text-xs px-4 py-2 shrink-0">
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
