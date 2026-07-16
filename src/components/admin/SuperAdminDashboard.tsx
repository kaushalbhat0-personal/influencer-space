"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  magicProvisionFromYoutube,
  attachCustomDomain,
  deleteTenant,
  type ProvisionResult,
} from "@/actions/super-admin.actions";
import { motion } from "framer-motion";

interface TenantRow {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  createdAt: Date;
  _count: { users: number; products: number };
}

export function SuperAdminDashboard({ tenants }: { tenants: TenantRow[] }) {
  const router = useRouter();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<ProvisionResult | null>(null);
  const [domainInputs, setDomainInputs] = useState<Record<string, string>>({});
  const [domainLoading, setDomainLoading] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(tenantId: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This removes their site, users, products, and settings.`)) return;
    setDeleting(tenantId);
    const result = await deleteTenant(tenantId);
    setDeleting(null);
    if (result.success) {
      router.refresh();
    }
  }

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-display">Platform Dashboard</h1>
      <p className="text-sm text-gray-400 mt-1">
        Manage all creators — provision, attach domains, monitor activity.
      </p>

      {/* Magic Provisioning */}
      <div className="admin-card p-6 mt-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-red-500">▶</span> YouTube Magic Provision
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Paste a YouTube channel URL or handle to auto-create the tenant.
        </p>

        <div className="flex gap-3 mt-4">
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
          <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
            {provisionResult.error}
          </div>
        )}

        {provisionResult?.success && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-sm space-y-2"
          >
            <p className="text-green-400 font-medium">Creator provisioned!</p>
            <div className="grid grid-cols-2 gap-2 text-gray-300">
              <span>Subdomain:</span>
              <code className="text-s8ul-cyan">{provisionResult.subdomain}</code>
              <span>Login:</span>
              <code className="text-white">{provisionResult.email}</code>
              <span>Password:</span>
              <code className="text-white">{provisionResult.password}</code>
            </div>
            <a
              href={`http://${provisionResult.subdomain}.localhost:3000/admin/login`}
              target="_blank"
              className="inline-block text-s8ul-cyan hover:underline mt-1"
              rel="noreferrer"
            >
              Open demo site →
            </a>
          </motion.div>
        )}
      </div>

      {/* === Section 2: Active Creators === */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white">
          Active Creators ({tenants.length})
        </h2>

        <div className="mt-4 rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Subdomain</th>
                  <th>Custom Domain</th>
                  <th>Users</th>
                  <th>Products</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id}>
                    <td className="font-medium text-white">{t.name}</td>
                    <td>
                      <code className="text-s8ul-cyan text-xs">{t.subdomain}</code>
                    </td>
                    <td>
                      {t.customDomain ? (
                        <a
                          href={`https://${t.customDomain}`}
                          target="_blank"
                          className="text-purple-400 text-xs hover:underline"
                          rel="noreferrer"
                        >
                          {t.customDomain}
                        </a>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                    <td>{t._count.users}</td>
                    <td>{t._count.products}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <a
                          href={`http://${t.subdomain}.localhost:3000`}
                          target="_blank"
                          className="text-xs text-gray-400 hover:text-white"
                          rel="noreferrer"
                        >
                          Preview
                        </a>
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
                          disabled={deleting === t.id}
                          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
                        >
                          {deleting === t.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* === Section 3: Domain Management === */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white">Custom Domains</h2>
          <p className="text-sm text-gray-400 mt-1">
            Attach a custom domain to a creator&apos;s tenant. This registers it on Vercel.
          </p>

          <div className="mt-4 space-y-3">
            {tenants.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
              >
                <span className="text-sm text-white w-32 shrink-0 truncate">{t.name}</span>
                <input
                  value={domainInputs[t.id] || ""}
                  onChange={(e) =>
                    setDomainInputs((prev) => ({ ...prev, [t.id]: e.target.value }))
                  }
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
        </div>
      </div>
    </div>
  );
}
