"use client";

import { useState } from "react";
import type { MemberResult } from "@/modules/workspace/application/workspace-membership";
import { Shield, ShieldCheck, ShieldMinus, User } from "lucide-react";

interface Props {
  workspaceId: string;
  members: MemberResult[];
  currentUserId: string;
  isOwner: boolean;
  onUpdateRole: (userId: string, role: string) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
}

const ROLE_BADGES: Record<string, string> = {
  OWNER: "bg-purple-500/10 text-purple-400",
  ADMIN: "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]",
  MEMBER: "bg-blue-500/10 text-blue-400",
  VIEWER: "bg-zinc-500/10 text-[var(--text-secondary)]",
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  OWNER: ShieldCheck,
  ADMIN: Shield,
  MEMBER: Shield,
  VIEWER: ShieldMinus,
};

export function WorkspaceMembers({ workspaceId, members, currentUserId, isOwner, onUpdateRole, onRemove }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleRoleChange(userId: string, role: string) {
    setLoading(userId);
    try { await onUpdateRole(userId, role); } finally { setLoading(null); }
  }

  async function handleRemove(userId: string) {
    setLoading(userId);
    try { await onRemove(userId); } finally { setLoading(null); }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50">
      <div className="px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white">Team Members ({members.length})</h3>
      </div>
      <div className="divide-y divide-white/5">
        {members.map((m) => {
          const Icon = ROLE_ICONS[m.role] ?? User;
          return (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{m.name || m.email}</p>
                  <p className="text-xs text-[var(--text-muted)]">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${ROLE_BADGES[m.role] ?? ""}`}>
                  {m.role}
                </span>
                {m.status !== "ACTIVE" && (
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-[var(--text-muted)]">{m.status}</span>
                )}
                {isOwner && m.userId !== currentUserId && (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                    disabled={loading === m.userId}
                    className="rounded bg-zinc-800 px-2 py-1 text-xs text-[var(--text-secondary)] border border-white/10"
                  >
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                )}
                {isOwner && m.userId !== currentUserId && (
                  <button
                    onClick={() => handleRemove(m.userId)}
                    disabled={loading === m.userId}
                    className="rounded px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
