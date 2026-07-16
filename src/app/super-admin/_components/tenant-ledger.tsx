"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTenant,
  resetTenantAdminPassword,
} from "@/actions/super-admin.actions";
import type { TenantWithDetails } from "@/services/super-admin.service";

export function TenantLedger({
  tenants,
}: {
  tenants: TenantWithDetails[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedTenantName, setSelectedTenantName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  async function handleDelete(tenantId: string, name: string) {
    if (
      !window.confirm(
        `Delete "${name}"? This removes their site, users, products, and settings permanently.`,
      )
    )
      return;
    setDeleting(tenantId);
    const result = await deleteTenant(tenantId);
    setDeleting(null);
    if (result.success) {
      router.refresh();
    }
  }

  function openResetModal(tenantId: string, tenantName: string) {
    setSelectedTenantId(tenantId);
    setSelectedTenantName(tenantName);
    setNewPassword("");
    setResetError("");
    setResetModalOpen(true);
  }

  function closeResetModal() {
    setResetModalOpen(false);
    setSelectedTenantId(null);
    setSelectedTenantName("");
    setNewPassword("");
    setResetError("");
  }

  async function handleReset() {
    if (!selectedTenantId || !newPassword.trim()) return;

    setResetting(true);
    setResetError("");

    const result = await resetTenantAdminPassword(
      selectedTenantId,
      newPassword,
    );
    setResetting(false);

    if (result.success) {
      alert(`Password updated for ${selectedTenantName}. Share the new credentials securely.`);
      closeResetModal();
      router.refresh();
    } else {
      setResetError(result.error || "Failed to reset password.");
    }
  }

  return (
    <>
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th>Creator / Tenant</th>
                <th>Admin Email</th>
                <th>Domain</th>
                <th>Plan</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => {
                const adminEmail =
                  t.users.find((u) => u.email)?.email || "—";
                const domain = t.customDomain || t.subdomain;

                return (
                  <tr key={t.id}>
                    <td className="font-medium text-white">{t.name}</td>
                    <td>
                      <span className="text-zinc-400 text-xs">{adminEmail}</span>
                    </td>
                    <td>
                      <code className="text-xs text-s8ul-cyan">{domain}</code>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          t.subscription?.plan === "PRO"
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-s8ul-cyan/10 text-s8ul-cyan"
                        }`}
                      >
                        {t.subscription?.plan || "STARTER"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <a
                          href={`http://${t.subdomain}.localhost:3000`}
                          target="_blank"
                          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                          rel="noreferrer"
                        >
                          Preview
                        </a>
                        <span className="text-zinc-700">|</span>
                        <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                          Edit
                        </button>
                        <span className="text-zinc-700">|</span>
                        <button
                          onClick={() => openResetModal(t.id, t.name)}
                          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          Reset Password
                        </button>
                        <span className="text-zinc-700">|</span>
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
                          disabled={deleting === t.id}
                          className="text-xs text-red-500 hover:text-red-400 transition-colors disabled:opacity-40"
                        >
                          {deleting === t.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-zinc-600 py-8">
                    No tenants yet. Use the YouTube provisioner above to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Reset Password Modal ─── */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeResetModal}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/90 p-6 shadow-2xl backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">
              Reset Password — {selectedTenantName}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Set a new admin password for this creator&apos;s account.
            </p>

            <div className="mt-5">
              <label
                htmlFor="reset-password"
                className="mb-1.5 block text-xs font-medium text-zinc-400"
              >
                New Password
              </label>
              <input
                id="reset-password"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 8 chars)"
                className="admin-input w-full"
                disabled={resetting}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleReset()}
              />
            </div>

            {resetError && (
              <p className="mt-3 text-sm text-red-400">{resetError}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeResetModal}
                disabled={resetting}
                className="admin-btn-outline px-5 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting || !newPassword.trim() || newPassword.trim().length < 8}
                className="admin-btn-cyan px-5 py-2 text-sm"
              >
                {resetting ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
