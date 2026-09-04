"use client";

import { useState, useTransition } from "react";
import { inviteAgencyTeamMember, resendAgencyTeamInvitation } from "@/actions/team.actions";

const INVITE_ROLES = ["AGENCY_STAFF", "AGENCY_ADMIN"] as const;

type InviteState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "created-not-delivered"; email: string; acceptUrl: string }
  | { status: "duplicate"; email: string }
  | { status: "error"; message: string };

export function TeamInviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("AGENCY_STAFF");
  const [state, setState] = useState<InviteState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const res = await inviteAgencyTeamMember({ email, role });
      if (res.success) {
        if (res.delivered) {
          setState({ status: "sent", email: res.email });
        } else if (res.acceptUrl) {
          setState({ status: "created-not-delivered", email: res.email, acceptUrl: res.acceptUrl });
        } else {
          setState({ status: "sent", email: res.email });
        }
        setEmail("");
      } else if (/already exists/i.test(res.error)) {
        setState({ status: "duplicate", email: email.trim() });
      } else {
        setState({ status: "error", message: res.error });
      }
    });
  };

  const resend = () => {
    startTransition(async () => {
      const target = state.status === "duplicate" ? state.email : email.trim();
      if (!target) return;
      const res = await resendAgencyTeamInvitation({ email: target });
      if (res.success) {
        setState(res.delivered ? { status: "sent", email: target } : { status: "error", message: `Invitation exists, but email could not be sent. ${res.deliveryError ?? "Please retry."}` });
      } else {
        setState({ status: "error", message: res.error });
      }
    });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Invite team member</h3>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[220px]">
          <span className="mb-1 block text-xs text-[var(--text-secondary)]">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@example.com"
            className="w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[var(--border-focus)]"
          />
        </label>
        <label className="min-w-[160px]">
          <span className="mb-1 block text-xs text-[var(--text-secondary)]">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[var(--border-focus)]"
          >
            {INVITE_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <button
          onClick={submit}
          disabled={pending || !email.trim()}
          className="rounded-md bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          {pending ? "Sending…" : "Send invitation"}
        </button>
      </div>

      {state.status === "sent" && (
        <p className="mt-3 text-sm text-emerald-400">Invitation sent to {state.email}.</p>
      )}

      {state.status === "created-not-delivered" && (
        <div className="mt-3">
          <p className="text-sm text-amber-400">Invitation created, but the email could not be sent.</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            The invitation is still pending. Share this link manually or retry delivery:
          </p>
          <p className="mt-2 break-all rounded bg-zinc-950 px-2 py-1 font-mono text-xs text-[var(--brand-primary)]">{state.acceptUrl}</p>
          <button
            onClick={resend}
            disabled={pending}
            className="mt-2 rounded-md border border-white/10 px-3 py-1 text-xs text-[var(--text-primary)] hover:bg-zinc-800 disabled:opacity-40"
          >
            Retry email delivery
          </button>
        </div>
      )}

      {state.status === "duplicate" && (
        <div className="mt-3">
          <p className="text-sm text-amber-400">A pending invitation already exists for {state.email}.</p>
          <button
            onClick={resend}
            disabled={pending}
            className="mt-2 rounded-md border border-white/10 px-3 py-1 text-xs text-[var(--text-primary)] hover:bg-zinc-800 disabled:opacity-40"
          >
            Resend invitation
          </button>
        </div>
      )}

      {state.status === "error" && (
        <p className="mt-3 text-sm text-red-400">{state.message}</p>
      )}
    </div>
  );
}
