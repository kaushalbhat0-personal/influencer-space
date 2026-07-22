"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildStorefrontUrl } from "@/lib/config/platform";
import {
  deleteTenant,
  resetTenantAdminPassword,
  generateLoginAsToken,
  updateSubscriptionPlan,
  triggerTenantContentSync,
  reVerifyAdminDomain,
  purgeContentFeed,
} from "@/actions/super-admin.actions";
import type { TenantWithDetails } from "@/services/super-admin.service";

export function TenantLedger({ tenants }: { tenants: TenantWithDetails[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left: number }>({ top: 0, left: 0 });
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [resetModal, setResetModal] = useState<{ tenantId: string; name: string } | null>(null);
  const [planModal, setPlanModal] = useState<{ tenantId: string; name: string; currentPlan: string } | null>(null);
  const [password, setPassword] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) {
      const close = () => setOpenMenuId(null);
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", close, { passive: true });
      window.addEventListener("resize", close);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("scroll", close);
        window.removeEventListener("resize", close);
      };
    }
  }, [openMenuId]);

  const filtered = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(search.toLowerCase())
  );

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleMenuClick(tenantId: string) {
    const btn = buttonRefs.current[tenantId];
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const fitsBelow = rect.bottom + 240 <= window.innerHeight;
    setMenuPos({
      top: fitsBelow ? rect.bottom + 4 : undefined,
      bottom: fitsBelow ? undefined : window.innerHeight - rect.top + 4,
      left: rect.right - 192,
    });
    setOpenMenuId(openMenuId === tenantId ? null : tenantId);
  }

  async function handleLoginAs(tenantId: string) {
    setOpenMenuId(null);
    setLoading(tenantId);
    const result = await generateLoginAsToken(tenantId);
    setLoading(null);
    if (result.success && result.loginUrl) {
      window.open(result.loginUrl, "_blank");
      showToast("Logged in as tenant");
    } else {
      showToast(result.error || "Failed");
    }
  }

  async function handleSync(tenantId: string) {
    setOpenMenuId(null);
    setLoading(tenantId);
    const result = await triggerTenantContentSync(tenantId);
    setLoading(null);
    showToast(result.success ? "Sync triggered" : result.error || "Failed");
  }

  async function handleReVerify(tenantId: string) {
    setOpenMenuId(null);
    setLoading(tenantId);
    const result = await reVerifyAdminDomain(tenantId);
    setLoading(null);
    showToast(result.success ? "Domain verified" : result.error || "Not verified");
  }

  async function handlePurge(tenantId: string, name: string) {
    setOpenMenuId(null);
    if (!window.confirm(`Purge ALL content feed items for "${name}"?`)) return;
    setLoading(tenantId);
    const result = await purgeContentFeed(tenantId);
    setLoading(null);
    showToast(result.success ? "Content feed purged" : result.error || "Failed");
    router.refresh();
  }

  async function handleDelete(tenantId: string, name: string) {
    setOpenMenuId(null);
    if (!window.confirm(`DELETE "${name}" permanently? This removes everything.`)) return;
    setLoading(tenantId);
    const result = await deleteTenant(tenantId);
    setLoading(null);
    if (result.success) {
      showToast(`${name} deleted`);
      router.refresh();
    } else {
      showToast(result.error || "Failed");
    }
  }

  async function handleReset() {
    if (!resetModal || !password.trim()) return;
    setLoading(resetModal.tenantId);
    const result = await resetTenantAdminPassword(resetModal.tenantId, password);
    setLoading(null);
    if (result.success) {
      showToast(`Password reset for ${resetModal.name}`);
      setResetModal(null);
      setPassword("");
    } else {
      showToast(result.error || "Failed");
    }
  }

  async function handlePlanUpdate(plan: "STARTER" | "PRO", status: "FREE" | "ACTIVE") {
    if (!planModal) return;
    setLoading(planModal.tenantId);
    const result = await updateSubscriptionPlan(planModal.tenantId, plan, status);
    setLoading(null);
    if (result.success) {
      showToast(`Plan updated to ${plan}`);
      setPlanModal(null);
      router.refresh();
    } else {
      showToast(result.error || "Failed");
    }
  }

  const openMenuTenant = filtered.find((t) => t.id === openMenuId);
  const plan = openMenuTenant?.subscription?.plan || "STARTER";

  return (
    <div className="space-y-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search tenants..."
        className="admin-input w-full max-w-md"
      />

      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-lg bg-emerald-500/90 px-4 py-3 text-sm font-medium text-black shadow-lg">
          {toast}
        </div>
      )}

      <div className="w-full rounded-xl border border-white/10">
        <table className="admin-table w-full">
          <thead>
            <tr>
              <th>Creator</th>
              <th>Admin Email</th>
              <th>Domain</th>
              <th>Plan</th>
              <th>Products</th>
              <th className="w-10">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const adminEmail = t.users.find((u) => u.email)?.email || "\u2014";
              const domain = t.customDomain ? `https://${t.customDomain}` : buildStorefrontUrl(t.subdomain);
              const planLabel = t.subscription?.plan || "STARTER";

              return (
                <tr key={t.id}>
                  <td className="font-medium text-white">
                    <Link href={`/super-admin/tenants/${t.id}`} className="hover:text-indigo-400 transition-colors">
                      {t.name}
                    </Link>
                  </td>
                  <td><span className="text-zinc-400 text-xs">{adminEmail}</span></td>
                  <td>
                    <a href={domain} target="_blank" rel="noopener noreferrer" className="text-xs text-s8ul-cyan hover:text-indigo-400 transition-colors underline underline-offset-2 decoration-white/10 hover:decoration-indigo-400/30">
                      {domain}
                    </a>
                  </td>
                  <td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      planLabel === "PRO" ? "bg-purple-500/20 text-purple-400" : "bg-s8ul-cyan/10 text-s8ul-cyan"
                    }`}>
                      {planLabel}
                    </span>
                  </td>
                  <td><span className="text-zinc-400 text-xs">{t._count.products}</span></td>
                  <td>
                    <button
                      ref={(el) => { buttonRefs.current[t.id] = el; }}
                      onClick={() => handleMenuClick(t.id)}
                      disabled={loading === t.id}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-zinc-600 py-8">
                  No tenants found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Portal Dropdown ─── */}
      {openMenuId && openMenuTenant &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] w-48 rounded-xl border border-white/10 bg-zinc-900/95 p-1 shadow-2xl backdrop-blur-xl"
            style={{
              top: menuPos.top ?? "auto",
              bottom: menuPos.bottom ?? "auto",
              left: menuPos.left,
            }}
          >
            <button onClick={() => handleLoginAs(openMenuId)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/5">
              Login as Tenant
            </button>
            <button onClick={() => { setPlanModal({ tenantId: openMenuId, name: openMenuTenant.name, currentPlan: plan }); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/5">
              Manage Plan
            </button>
            <button onClick={() => { setResetModal({ tenantId: openMenuId, name: openMenuTenant.name }); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/5">
              Reset Password
            </button>
            <button onClick={() => handleSync(openMenuId)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/5">
              Sync Content
            </button>
            {openMenuTenant.customDomain && (
              <button onClick={() => handleReVerify(openMenuId)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/5">
                Re-verify Domain
              </button>
            )}
            <button onClick={() => handlePurge(openMenuId, openMenuTenant.name)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-amber-400 hover:bg-amber-500/10">
              Purge Content Feed
            </button>
            <hr className="my-1 border-white/5" />
            <button onClick={() => handleDelete(openMenuId, openMenuTenant.name)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/10">
              Delete Tenant
            </button>
          </div>,
          document.body,
        )}

      {/* ─── Plan Modal ─── */}
      {planModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPlanModal(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/90 p-6 shadow-2xl backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">Manage Plan — {planModal.name}</h3>
            <p className="text-xs text-zinc-500">Current: {planModal.currentPlan}</p>
            <div className="mt-5 space-y-2">
              <button onClick={() => handlePlanUpdate("STARTER", "FREE")} className="w-full rounded-lg border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5">
                Set to STARTER (Free)
              </button>
              <button onClick={() => handlePlanUpdate("PRO", "ACTIVE")} className="w-full rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm text-purple-400 hover:bg-purple-500/20">
                Set to PRO (Active)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reset Password Modal ─── */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setResetModal(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/90 p-6 shadow-2xl backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">Reset Password — {resetModal.name}</h3>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
              className="admin-input mt-4 w-full"
              onKeyDown={(e) => e.key === "Enter" && handleReset()}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setResetModal(null)} className="admin-btn-outline px-5 py-2 text-sm">Cancel</button>
              <button onClick={handleReset} disabled={!password.trim() || password.length < 8} className="admin-btn-cyan px-5 py-2 text-sm">Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
