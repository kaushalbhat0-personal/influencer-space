"use client";

import { useState, useTransition } from "react";
import { changeAgencyTeamRole, removeAgencyTeamMember } from "@/actions/team.actions";

const ROLE_OPTIONS = ["AGENCY_STAFF", "AGENCY_ADMIN"] as const;

export function TeamMemberControls({ userId, currentRole, isOwner }: { userId: string; currentRole: string; isOwner: boolean }) {
  const [selected, setSelected] = useState<string>(currentRole);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (isOwner) {
    return <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">Owner</span>;
  }

  const changeRole = () => {
    startTransition(async () => {
      const res = await changeAgencyTeamRole({ userId, role: selected });
      setMsg(res.success ? "Role updated" : res.error);
    });
  };

  const remove = () => {
    if (!confirm("Remove this member from the team?")) return;
    startTransition(async () => {
      const res = await removeAgencyTeamMember({ userId });
      setMsg(res.success ? "Member removed" : res.error);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded-md border border-white/10 bg-zinc-950 px-2 py-1 text-xs text-white outline-none focus:border-[var(--border-focus)]"
      >
        {ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <button
        onClick={changeRole}
        disabled={pending || selected === currentRole}
        className="rounded-md border border-white/10 px-2 py-1 text-xs text-[var(--text-primary)] hover:bg-zinc-800 disabled:opacity-40"
      >
        Change
      </button>
      <button
        onClick={remove}
        disabled={pending}
        className="rounded-md border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-40"
      >
        Remove
      </button>
      {msg && <span className="text-xs text-[var(--text-secondary)]">{msg}</span>}
    </div>
  );
}
