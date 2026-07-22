"use client";

import { useState } from "react";
import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";
import { cn } from "@/lib/utils";
import { Users, UserPlus, Clock, Ban } from "lucide-react";

type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

interface BetaInvite { id: string; email: string; name: string; code: string; status: InviteStatus; persona: string; createdAt: Date; }

const STATUS_COLORS: Record<InviteStatus, string> = {
  pending: "bg-amber-500/15 text-amber-400",
  accepted: "bg-emerald-500/15 text-emerald-400",
  expired: "bg-zinc-800 text-zinc-500",
  revoked: "bg-red-500/15 text-red-400",
};

const SAMPLE_INVITES: BetaInvite[] = [
  { id: "1", email: "creator1@email.com", name: "Rahul M.", code: "BETA-CREATOR-01", status: "accepted", persona: "creator", createdAt: new Date("2026-07-15") },
  { id: "2", email: "creator2@email.com", name: "Priya S.", code: "BETA-CREATOR-02", status: "accepted", persona: "creator", createdAt: new Date("2026-07-16") },
  { id: "3", email: "agency1@email.com", name: "Digital Pro Agency", code: "BETA-AGENCY-01", status: "accepted", persona: "agency", createdAt: new Date("2026-07-17") },
  { id: "4", email: "creator3@email.com", name: "Vikram K.", code: "BETA-CREATOR-03", status: "pending", persona: "creator", createdAt: new Date("2026-07-21") },
  { id: "5", email: "creator4@email.com", name: "Anjali L.", code: "BETA-CREATOR-04", status: "expired", persona: "creator", createdAt: new Date("2026-07-10") },
  { id: "6", email: "creator5@email.com", name: "Spam Bot", code: "BETA-CREATOR-05", status: "revoked", persona: "creator", createdAt: new Date("2026-07-12") },
];

export default function BetaPage() {
  const [invites] = useState<BetaInvite[]>(SAMPLE_INVITES);

  const counts = {
    total: invites.length,
    accepted: invites.filter((i) => i.status === "accepted").length,
    pending: invites.filter((i) => i.status === "pending").length,
    expired: invites.filter((i) => i.status === "expired" || i.status === "revoked").length,
  };

  const cols: Column<BetaInvite>[] = [
    { key: "name", header: "Name", sortable: true, cell: (r) => <span className="text-white text-sm">{r.name}</span> },
    { key: "email", header: "Email", sortable: true, cell: (r) => <span className="text-zinc-300 text-sm">{r.email}</span> },
    { key: "code", header: "Code", sortable: true, cell: (r) => <span className="text-indigo-400 font-mono text-xs">{r.code}</span> },
    { key: "status", header: "Status", sortable: true, cell: (r) => <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[r.status])}>{r.status}</span> },
    { key: "persona", header: "Persona", sortable: true, cell: (r) => <span className="text-zinc-400 text-xs">{r.persona}</span> },
    { key: "createdAt", header: "Invited", sortable: true, cell: (r) => <span className="text-zinc-500 text-xs">{r.createdAt.toLocaleDateString("en-IN")}</span> },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Beta Program</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage beta invites and track creator onboarding.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Invites", value: counts.total, icon: Users, color: "text-indigo-400" },
          { label: "Accepted", value: counts.accepted, icon: UserPlus, color: "text-emerald-400" },
          { label: "Pending", value: counts.pending, icon: Clock, color: "text-amber-400" },
          { label: "Expired/Revoked", value: counts.expired, icon: Ban, color: "text-red-400" },
        ].map((kpi) => (
          <div key={kpi.label} className="admin-card p-4">
            <p className="text-xs text-zinc-500">{kpi.label}</p>
            <div className="flex items-center gap-2 mt-1">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <DataTable columns={cols} data={invites} pageSize={20} searchable searchPlaceholder="Search by name, email, or code..." emptyMessage="No beta invites yet." />
    </div>
  );
}
