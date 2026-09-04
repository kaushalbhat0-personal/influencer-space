"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";

export function LoginForm({ tenantId }: { tenantId: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Clear stale ?error on fresh mount so hard refresh never shows a stuck banner.
  useEffect(() => {
    if (searchParams.get("error")) {
      (router as unknown as { replace?: (href: string) => void }).replace?.("/admin/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearAuthError() {
    if (authError) setAuthError(null);
    if (searchParams.get("error")) (router as unknown as { replace?: (href: string) => void }).replace?.("/admin/login");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    clearAuthError();
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      tenantId: tenantId ?? "",
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      setAuthError(result.error);
      router.push("/admin/login?error=CredentialsSignin");
      return;
    }

    // RCCF-71.4.1 P1: navigate to the admin dashboard with a FULL document
    // navigation (window.location.href) instead of a client-side router.push.
    // On the first-ever load the target route (or /onboarding for a fresh
    // account) is compiled on demand; the App Router client aborts the soft
    // RSC navigation while that compile is in flight (net::ERR_ABORTED) and
    // the user is left looking at /admin/login even though the session cookie
    // was issued successfully. A full document GET waits server-side for the
    // compile, then re-enters through middleware with the fresh cookie — the
    // same route the browser would take on a manual reload. This preserves
    // the middleware role redirects (SUPER_ADMIN → /super-admin, AGENCY →
    // /agency, ADMIN → /admin/dashboard) and the lifecycle bounce for
    // non-provisioned accounts (→ /onboarding).
    // DO NOT call getSession() here — the new session cookie may not
    // have propagated to the browser cookie jar yet, causing the
    // session callback to read a stale JWT from a deleted user.
    window.location.href = "/admin/dashboard";
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--surface-root)] via-s8ul-purple/40 to-[var(--surface-root)] px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--neon-cyan)_15%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--neon-gold)_8%,transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-[var(--radius-card-elevated)] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_rgba(0,0,0,0.4)] sm:p-10">
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

          {authError === "CredentialsSignin" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
            >
              Invalid email or password. Please try again.
            </motion.div>
          )}

          {authError === "Configuration" && (
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
                onChange={(e) => {
                  clearAuthError();
                  setEmail(e.target.value);
                }}
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
                onChange={(e) => {
                  clearAuthError();
                  setPassword(e.target.value);
                }}
                className="admin-input mt-1.5"
                placeholder="••••••••"
              />
            </div>
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
