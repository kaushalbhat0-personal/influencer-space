"use client";

import { useState } from "react";
import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";
import { cn } from "@/lib/utils";

type FeedbackStatus = "new" | "reviewed" | "planned" | "in_progress" | "completed" | "declined";
type FeedbackType = "bug" | "idea" | "feature" | "general";

interface FeedbackRow { id: string; type: FeedbackType; title: string; user: string; status: FeedbackStatus; createdAt: Date; }

const TYPE_LABELS: Record<FeedbackType, string> = { bug: "Bug", idea: "Idea", feature: "Feature Request", general: "Feedback" };
const TYPE_COLORS: Record<FeedbackType, string> = {
  bug: "bg-red-500/15 text-red-400", idea: "bg-amber-500/15 text-amber-400",
  feature: "bg-indigo-500/15 text-indigo-400", general: "bg-zinc-800 text-zinc-400",
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  new: "bg-amber-500/15 text-amber-400", reviewed: "bg-indigo-500/15 text-indigo-400",
  planned: "bg-violet-500/15 text-violet-400", in_progress: "bg-blue-500/15 text-blue-400",
  completed: "bg-emerald-500/15 text-emerald-400", declined: "bg-zinc-800 text-zinc-500",
};

const SAMPLE_FEEDBACK: FeedbackRow[] = [
  { id: "1", type: "feature", title: "Add Instagram DM integration", user: "Creator A", status: "planned", createdAt: new Date("2026-07-20") },
  { id: "2", type: "bug", title: "Checkout fails on mobile Safari", user: "Creator B", status: "in_progress", createdAt: new Date("2026-07-19") },
  { id: "3", type: "idea", title: "Dark mode scheduling for storefront", user: "Creator C", status: "reviewed", createdAt: new Date("2026-07-18") },
  { id: "4", type: "general", title: "Love the AI generation flow!", user: "Creator D", status: "new", createdAt: new Date("2026-07-21") },
  { id: "5", type: "feature", title: "Support for TikTok shop integration", user: "Creator E", status: "new", createdAt: new Date("2026-07-21") },
  { id: "6", type: "bug", title: "Domain verification stuck on pending", user: "Creator A", status: "completed", createdAt: new Date("2026-07-15") },
  { id: "7", type: "idea", title: "Add WhatsApp share button", user: "Creator F", status: "declined", createdAt: new Date("2026-07-10") },
];

export default function FeedbackPage() {
  const [items] = useState<FeedbackRow[]>(SAMPLE_FEEDBACK);

  const cols: Column<FeedbackRow>[] = [
    { key: "type", header: "Type", sortable: true, cell: (r) => <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", TYPE_COLORS[r.type])}>{TYPE_LABELS[r.type]}</span> },
    { key: "title", header: "Title", sortable: true, cell: (r) => <span className="text-white text-sm">{r.title}</span> },
    { key: "user", header: "Creator", sortable: true, cell: (r) => <span className="text-zinc-400 text-sm">{r.user}</span> },
    { key: "status", header: "Status", sortable: true, cell: (r) => <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[r.status])}>{r.status.replace("_", " ")}</span> },
    { key: "createdAt", header: "Date", sortable: true, cell: (r) => <span className="text-zinc-500 text-xs">{r.createdAt.toLocaleDateString("en-IN")}</span> },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Feedback Center</h1>
        <p className="mt-1 text-sm text-zinc-400">Creator feedback, feature requests, and bug reports.</p>
      </div>
      <DataTable columns={cols} data={items} pageSize={20} searchable searchPlaceholder="Search feedback..." emptyMessage="No feedback yet." />
    </div>
  );
}
