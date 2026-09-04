"use client";

import { useState } from "react";
import { createCreatorInvitation } from "@/actions/partner.actions";

export function ClientInvite({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; inviteUrl?: string } | null>(null);

  async function send() {
    if (!email.trim()) return;
    setBusy(true);
    setResult(null);
    const res = await createCreatorInvitation({ tenantId, email: email.trim(), creatorName: tenantName });
    if (res.success && res.inviteToken) {
      setResult({ ok: true, message: "Invitation created.", inviteUrl: `/claim-invite?token=${res.inviteToken}&email=${encodeURIComponent(email.trim())}` });
    } else {
      setResult({ ok: false, message: res.error ?? "Invitation failed" });
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10" data-testid="client-invite-open">
        Invite
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
      <label className="mb-1 block text-[11px] text-emerald-300">Creator email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-[var(--text-primary)]" aria-label="Creator email" data-testid="client-invite-email" />
      <div className="mt-2 flex gap-2">
        <button onClick={send} disabled={busy} className="rounded-md bg-emerald-500 px-2 py-1 text-[11px] text-black hover:bg-emerald-600 disabled:opacity-50" data-testid="client-invite-send">
          {busy ? "Sending…" : "Send"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-[var(--text-primary)]">Close</button>
      </div>
      {result && (
        <div className={`mt-2 text-[11px] ${result.ok ? "text-emerald-300" : "text-red-300"}`} data-testid="client-invite-result">
          <p>{result.message}</p>
          {result.inviteUrl && <code className="block break-all text-emerald-400" data-testid="client-invite-url">{result.inviteUrl}</code>}
        </div>
      )}
    </div>
  );
}
