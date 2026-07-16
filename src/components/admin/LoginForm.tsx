"use client";

import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { motion } from "framer-motion";

type TenantOption = { id: string; name: string; subdomain: string };

export function LoginForm({
  tenantId,
  tenants,
}: {
  tenantId: string | null;
  tenants?: TenantOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState(tenantId ?? "");
  const needsTenantSelection = !tenantId && tenants && tenants.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      tenantId: selectedTenantId,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      const params = new URLSearchParams();
      params.set("error", "CredentialsSignin");
      if (needsTenantSelection && selectedTenantId) {
        const t = tenants?.find((t) => t.id === selectedTenantId);
        if (t) params.set("tenant", t.subdomain);
      }
      router.push(`/admin/login?${params.toString()}`);
      return;
    }

    const session = await getSession();
    if (session?.user?.role === "SUPER_ADMIN") {
      router.push("/super-admin");
    } else {
      router.push("/admin/dashboard");
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-[#0a0a0a] via-s8ul-purple/40 to-[#0a0a0a] px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,245,255,0.15),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,215,0,0.08),transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_rgba(0,0,0,0.4)] sm:p-10">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="admin-gradient-text text-3xl font-bold font-display sm:text-4xl"
            >
              Admin Login
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-2 text-sm text-gray-400"
            >
              Sign in to manage your CreatorBrand
            </motion.p>
          </div>

          {error === "CredentialsSignin" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
            >
              Invalid email, password, or creator brand selection. Please try again.
            </motion.div>
          )}

          {error === "Configuration" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
            >
              No tenant configured. Please seed a tenant first.
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="admin-input mt-1.5"
                placeholder="admin@snaxgaming.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="admin-input mt-1.5"
                placeholder="••••••••"
              />
            </div>
            {needsTenantSelection && (
              <div>
                <label htmlFor="tenant" className="block text-sm font-medium text-gray-300">
                  Creator Brand
                </label>
                <select
                  id="tenant"
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="admin-input mt-1.5"
                >
                  <option value="">Select a creator brand...</option>
                  {tenants!.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subdomain})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="admin-btn-cyan w-full py-3 text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : "Sign in"}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
