"use client";

import { useState, useTransition } from "react";
import {
  attachCustomDomain,
  removeCustomDomain,
  checkDomainStatus,
  verifyDomain,
} from "@/actions/domain.actions";
import type { VercelVerificationRecord } from "@/services/vercel.service";

export function DomainSettings({
  currentDomain,
  subdomain,
  verified: initialVerified,
  verification: initialVerification,
}: {
  currentDomain: string | null;
  subdomain: string;
  verified: boolean;
  verification: VercelVerificationRecord[];
}) {
  const [domain, setDomain] = useState(currentDomain);
  const [verified, setVerified] = useState(initialVerified);
  const [records, setRecords] = useState<VercelVerificationRecord[]>(initialVerification);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedRegistrar, setSelectedRegistrar] = useState<string>("generic");

  async function handleAttach(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await attachCustomDomain({ success: false }, formData);
      if (result.success && result.customDomain) {
        setDomain(result.customDomain);
        setVerified(result.verified ?? false);
        setRecords(result.verification ?? []);
      } else {
        setError(result.error ?? "Failed to attach domain");
      }
    });
  }

  async function handleCheckStatus() {
    setError(null);
    startTransition(async () => {
      const result = await checkDomainStatus();
      if (result.success) {
        setVerified(result.verified ?? false);
        setRecords(result.verification ?? []);
      } else {
        setError(result.error ?? "Failed to check status");
      }
    });
  }

  async function handleVerify() {
    setError(null);
    startTransition(async () => {
      const result = await verifyDomain();
      if (result.success) {
        setVerified(result.verified ?? false);
        setRecords(result.verification ?? []);
      } else {
        setError(result.error ?? "Verification failed");
      }
    });
  }

  async function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeCustomDomain();
      if (result.success) {
        setDomain(null);
        setVerified(false);
        setRecords([]);
      } else {
        setError(result.error ?? "Failed to remove domain");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ─── Current Subdomain ─── */}
      <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-5 backdrop-blur-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Default Subdomain</h3>
        <p className="mt-2 font-mono text-sm text-zinc-300">
          {subdomain}.{process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN || process.env.PLATFORM_BASE_DOMAIN || "creatorspace.app"}
        </p>
      </div>

      {/* ─── Custom Domain ─── */}
      <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-5 backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-zinc-300">Custom Domain</h2>

        {domain ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-900 px-4 py-3">
              <span className="font-mono text-sm text-white">{domain}</span>
              <span
                className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  verified
                    ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20"
                }`}
              >
                {verified ? "VERIFIED" : "PENDING"}
              </span>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {!verified && records.length > 0 && (
              <div className="space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-semibold text-amber-400">DNS Verification Required</p>
                </div>
                <p className="text-xs text-zinc-400">
                  Add these records at your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.). DNS changes can take anywhere from a few minutes to 48 hours to propagate globally.
                </p>

                <div className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10">
                  {records.map((rec, i) => (
                    <div key={i} className="flex items-center gap-3 bg-zinc-900 px-4 py-3">
                      <span className="shrink-0 rounded bg-zinc-800 px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-400">
                        {rec.type}
                      </span>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="truncate font-mono text-xs text-zinc-300">{rec.domain}</p>
                        <p className="font-mono text-xs text-s8ul-cyan">{rec.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-2">
                  <p className="text-[10px] text-zinc-500 mb-1.5">View setup instructions for your registrar:</p>
                  <select value={selectedRegistrar} onChange={(e) => setSelectedRegistrar(e.target.value)} className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-[11px] text-zinc-400 outline-none">
                    <option value="generic">Generic DNS</option>
                    <option value="godaddy">GoDaddy</option>
                    <option value="namecheap">Namecheap</option>
                    <option value="cloudflare">Cloudflare</option>
                    <option value="squarespace">Squarespace</option>
                    <option value="hostinger">Hostinger</option>
                  </select>
                  <div className="mt-2 rounded bg-zinc-900/50 border border-zinc-800 p-2.5 text-[10px] text-zinc-500 leading-relaxed">
                    {selectedRegistrar === "godaddy" && "1. Log in to GoDaddy → My Domains → DNS → Add. 2. Select record type (CNAME / TXT). 3. Enter the Host/Name as shown above (e.g., '_vercel' or '@'). 4. Enter the Points to/Value as shown. 5. Save. Allow 5–30 minutes for propagation."}
                    {selectedRegistrar === "namecheap" && "1. Log in to Namecheap → Domain List → Manage → Advanced DNS. 2. Click 'Add New Record'. 3. Choose the record type from Vercel's instructions. 4. Paste the Host and Value fields. TTL can be left as Automatic. 5. Save all changes."}
                    {selectedRegistrar === "cloudflare" && "1. Log in to Cloudflare → select domain → DNS → Records. 2. Click 'Add Record'. 3. IMPORTANT: Turn OFF the orange cloud (proxy) — set to 'DNS only' (grey cloud). 4. Enter the Name and Target from Vercel. 5. Save. Cloudflare propagates almost instantly."}
                    {selectedRegistrar === "hostinger" && "1. Log in to Hostinger → Domains → Manage → DNS/Nameservers. 2. Go to DNS Records → Add Record. 3. Select the matching type (CNAME for www, TXT for verification). 4. Paste the Name/Points-to values from Vercel. 5. Save."}
                    {selectedRegistrar === "squarespace" && "1. Log in to Squarespace → Settings → Domains → select domain → Advanced Settings. 2. Click 'Add custom record'. 3. Choose the record type that matches Vercel's instruction. 4. Enter the host and data values. 5. Save. Allow up to 72 hours if importing from another registrar."}
                    {selectedRegistrar === "generic" && "Add the DNS records above at your domain registrar's DNS management page. For CNAME records, point the hostname to cname.vercel-dns.com. For TXT verification records, add exactly as shown. DNS changes can take 5 minutes to 48 hours to propagate."}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={isPending}
                className="rounded-lg border border-white/10 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
              >
                Check Status
              </button>
              {!verified && (
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isPending}
                  className="rounded-lg border border-white/10 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
                >
                  Verify
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Remove this custom domain? Your site will fall back to the subdomain.")) {
                    handleRemove();
                  }
                }}
                disabled={isPending}
                className="ml-auto rounded-lg px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <form action={handleAttach} className="mt-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                name="domain"
                type="text"
                placeholder="yourdomain.com"
                className="admin-input flex-1"
                disabled={isPending}
                required
              />
              <button
                type="submit"
                disabled={isPending}
                className="admin-btn-cyan shrink-0 px-5 py-2.5"
              >
                Attach Domain
              </button>
            </div>
            <p className="text-xs text-zinc-600">
              Enter your domain without `http://` or `www` (e.g., store.yourdomain.com)
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </form>
        )}
      </div>

      {/* ─── Setup Instructions ─── */}
      {!domain && (
        <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-zinc-300">How it works</h2>
          <ol className="mt-3 space-y-2 text-sm text-zinc-500">
            <li className="flex gap-2">
              <span className="font-mono text-s8ul-cyan">1.</span>
              Enter your custom domain name above.
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-s8ul-cyan">2.</span>
              You&apos;ll receive DNS records (CNAME or A record) to add at your domain registrar.
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-s8ul-cyan">3.</span>
              Wait for DNS to propagate (5 minutes to 48 hours), then click &quot;Verify.&quot;
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-s8ul-cyan">4.</span>
              Your storefront will be accessible at your own domain.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
