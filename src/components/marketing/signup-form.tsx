"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Register
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      // 2. Auto-login via NextAuth
      const signInResult = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Account created but login failed. Please sign in manually.");
        setLoading(false);
        return;
      }

      // 3. Redirect to agency dashboard
      window.location.href = "/agency";
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-s8ul-cyan/50 focus:outline-none"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-s8ul-cyan/50 focus:outline-none"
          placeholder="Min 8 characters"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !email || password.length < 8}
        className="w-full rounded-lg bg-s8ul-cyan py-2.5 text-sm font-bold text-black transition-all hover:bg-s8ul-cyan/80 disabled:opacity-50"
      >
        {loading ? "Creating account..." : "Start for Free"}
      </button>
    </form>
  );
}
