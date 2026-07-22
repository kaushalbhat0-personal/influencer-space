"use client";

import type { ImportRecord } from "@/lib/import/types";
import { motion } from "framer-motion";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

export function ImportHistoryTable({ records }: { records: ImportRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-8 text-center">
        <Clock className="h-6 w-6 text-zinc-700 mx-auto mb-2" />
        <p className="text-sm text-zinc-500">No imports yet. Create your first creator import above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Recent Imports</h4>
      <div className="space-y-2">
        {records.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
          >
            <div className="shrink-0">
              {r.status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : r.status === "started" ? (
                <Clock className="h-4 w-4 text-amber-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{r.creatorName}</p>
              <p className="text-[10px] text-zinc-500">
                {r.source} · {Math.round(r.duration / 1000)}s · {r.confidence}% confidence
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className={`text-[10px] font-medium ${r.status === "completed" ? "text-emerald-400" : r.status === "started" ? "text-amber-400" : "text-red-400"}`}>
                {r.status}
              </span>
              {r.storefrontUrl && <p className="text-[10px] text-zinc-600">{r.storefrontUrl}</p>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
