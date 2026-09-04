"use client";

import { useFormState } from "react-dom";
import { provisionNewCreator, type ProvisionResult } from "@/actions/super-admin.actions";
import { motion } from "framer-motion";

const initialState: ProvisionResult = { success: false };

export function SuperAdminForm() {
  const [state, action, pending] = useFormState(provisionNewCreator, initialState);

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-6 sm:p-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="admin-gradient-text text-3xl font-bold font-display">
          Creator Provisioning
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Quick onboarding — creates tenant, admin user, and seed settings in one click.
        </p>

        <form action={action} className="mt-8 space-y-5">
          <div className="admin-card p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)]">Creator Name</label>
                <input
                  name="creatorName"
                  required
                  className="admin-input mt-1.5"
                  placeholder="Mortal Gaming"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)]">Admin Email</label>
                <input
                  name="adminEmail"
                  type="email"
                  required
                  className="admin-input mt-1.5"
                  placeholder="admin@mortalgaming.com"
                />
              </div>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={pending}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="admin-btn-cyan w-full py-3 text-base"
          >
            {pending ? "Provisioning..." : "Provision Creator"}
          </motion.button>
        </form>

        {state.error && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {state.error}
          </div>
        )}

        {state.success && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-4"
          >
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
              Creator provisioned successfully.
            </div>

            <div className="admin-card space-y-3 p-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Credentials</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Subdomain</span>
                  <code className="text-[var(--brand-primary)]">{state.subdomain}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Email</span>
                  <code className="text-[var(--text-primary)]">{state.email}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Password</span>
                  <code className="text-[var(--text-primary)]">{state.password}</code>
                </div>
              </div>

              <div className="rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Demo URL</p>
                <code className="break-all text-sm text-[var(--brand-primary)]">{state.demoUrl}</code>
              </div>

              <div className="rounded-lg bg-amber-500/10 p-3">
                <p className="text-xs text-[var(--text-muted)]">Subdomain URL (for testing)</p>
                <code className="break-all text-sm text-amber-400">
                  http://{state.subdomain}.localhost:3000/admin/login
                </code>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
