"use client";

import { useState } from "react";
import { claimCreatorInvitation } from "@/actions/partner.actions";
import { signIn } from "next-auth/react";

export function ClaimInviteClient({ token, email }: { token: string; email: string }) {
  const [form, setForm] = useState({ email, password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit() {
    if (form.password.length < 8) {
      setNotice({ ok: false, message: "Password must be at least 8 characters" });
      return;
    }
    if (form.password !== form.confirm) {
      setNotice({ ok: false, message: "Passwords do not match" });
      return;
    }
    setBusy(true);
    setNotice(null);
    const result = await claimCreatorInvitation({ token, email: form.email, password: form.password });
    if (result.success) {
      setNotice({ ok: true, message: "Invitation accepted — signing you in…" });
      await signIn("credentials", { email: form.email, password: form.password, redirect: true, callbackUrl: "/admin/dashboard" });
    } else {
      setNotice({ ok: false, message: result.error ?? "Failed to accept invitation" });
    }
    setBusy(false);
  }

  const input = "w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]";

  return (
    <div className="mt-4 space-y-3">
      <div>
        <label className="mb-1 block text-xs text-[var(--text-muted)]">Email</label>
        <input className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="claim-email" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-[var(--text-muted)]">Password</label>
        <input className={input} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="claim-password" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-[var(--text-muted)]">Confirm Password</label>
        <input className={input} type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} data-testid="claim-confirm" />
      </div>
      <button onClick={submit} disabled={busy || !token} className="w-full rounded-md bg-[var(--brand-primary)] px-4 py-2 text-sm text-white hover:bg-[var(--primary-hover)] disabled:opacity-50" data-testid="claim-submit">
        {busy ? "Activating…" : "Activate Workspace"}
      </button>
      {notice && (
        <p className={`rounded-[var(--radius-card)] p-2 text-xs ${notice.ok ? "bg-[var(--color-success-surface)] text-[var(--color-success)] border border-[var(--color-success-border)]" : "bg-[var(--color-danger-surface)] text-[var(--color-danger)] border border-[var(--color-danger-border)]"}`} data-testid="claim-notice">
          {notice.message}
        </p>
      )}
    </div>
  );
}
