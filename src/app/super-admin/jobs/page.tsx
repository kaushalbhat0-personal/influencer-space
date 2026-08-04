import { persistedJobRuntime } from "@/modules/operations/application/job-runtime";
import { jobRunner } from "@/lib/reliability";
import { JobsClient } from "./_components/jobs-client";

export const dynamic = "force-dynamic";

/** IMPLEMENTATION-40: persisted Job Center (JobRecord) — real runs + actions. */
export default async function JobsPage() {
  const [data, counts, runners] = await Promise.all([
    persistedJobRuntime.list({ page: 1, pageSize: 100 }),
    persistedJobRuntime.counts(),
    jobRunner.getStatus(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Job Center</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Persisted job runs (JobRecord) executed through the existing JobRunner.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span data-testid="jobs-running">{counts.running} running</span>
          <span>Failed (24h): {counts.failed24h}</span>
          <span>Succeeded (24h): {counts.succeeded24h}</span>
          <span>Total: {counts.total}</span>
        </div>
      </div>

      <div className="mb-4 admin-card p-3">
        <h3 className="text-sm font-medium text-zinc-300 mb-2">Registered Runners</h3>
        <div className="flex flex-wrap gap-2">
          {runners.map((r) => (
            <span key={r.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300" data-testid={`runner-${r.id}`}>
              {r.name} · {r.running ? "running" : "idle"}
            </span>
          ))}
        </div>
      </div>

      <JobsClient initial={data} runners={runners.map((r) => ({ id: r.id, name: r.name }))} />
    </div>
  );
}
