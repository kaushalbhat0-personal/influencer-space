"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      router.push("/admin/login?error=CredentialsSignin");
    } else {
      router.push("/admin/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-950 px-4">
      <div className="w-full max-w-md">
        <GlassCard withGoldBorder className="p-6 sm:p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Admin Login</h1>
            <p className="mt-2 text-sm text-white/50">
              Sign in to manage your CreatorBrand
            </p>
          </div>

          {error === "CredentialsSignin" && (
            <div className="mt-4 rounded-lg bg-red-500/20 p-3 text-sm text-red-400">
              Invalid email or password. Please try again.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/70">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-s8ul-cyan focus:outline-none focus:ring-2 focus:ring-s8ul-cyan/50"
                placeholder="admin@snaxgaming.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/70">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-s8ul-cyan focus:outline-none focus:ring-2 focus:ring-s8ul-cyan/50"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-s8ul-cyan/20 text-s8ul-cyan hover:bg-s8ul-cyan/30"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
