import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader } from "@/components/layout";
import { PlatformRegistrySyncService } from "@/lib/registry-sync";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { SyncClient } from "./_components/sync-client";

export const dynamic = "force-dynamic";

export default async function PlatformSyncPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") return <p className="text-red-400 p-8">Unauthorized</p>;

  const service = new PlatformRegistrySyncService();
  const schemaMissing = await service.checkSchema().catch(() => ["(database unreachable)"]);
  const schemaVersion = await service.getSchemaVersion().catch(() => null);

  const hasSchema = schemaMissing.length === 0;
  const versionOk = schemaVersion?.compatible ?? false;
  const report = hasSchema && versionOk ? await service.getDiff().catch(() => null) : null;

  const createdCount = report ? report.created.plans.length + report.created.pricings.length + report.created.revenueConfigs.length + report.created.billingConfigs.length + report.created.commissionPolicies.length : 0;
  const updatedCount = report ? report.updated.plans.length + report.updated.pricings.length + report.updated.revenueConfigs.length + report.updated.billingConfigs.length + report.updated.commissionPolicies.length : 0;
  const deletedCount = report ? report.deleted.plans.length + report.deleted.pricings.length : 0;
  const errorCount = report?.errors.length ?? 0;
  const isClean = createdCount + updatedCount + deletedCount + errorCount === 0;

  const blocked = schemaMissing.length > 0 || !versionOk;

  return (
    <ContentContainer>
      <PageHeader title="Platform Registry Sync" description="Synchronise runtime configuration tables with canonical plan definitions."
        breadcrumbs={[{ label: "Dashboard", href: "/super-admin" }, { label: "Platform" }, { label: "Registry Sync" }]} />

      {/* Schema Version Card */}
      <div className="admin-card p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-300">Platform Registry Runtime</h2>
          {schemaVersion && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
              versionOk ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            }`}>
              {versionOk ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {versionOk ? "Compatible" : "Incompatible"}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-900/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500">Schema Version</p>
            <p className="text-sm font-semibold text-white font-mono">{schemaVersion?.required ?? "—"}</p>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500">Installed</p>
            <p className="text-sm font-semibold text-white font-mono">{schemaVersion?.installed ?? "—"}</p>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500">Required</p>
            <p className="text-sm font-semibold text-white font-mono">{schemaVersion?.required ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Blocked State */}
      {blocked && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-400" />
            <div>
              <h2 className="text-lg font-semibold text-red-400">Registry Sync Blocked</h2>
              <p className="text-sm text-zinc-400 mt-1">
                {schemaMissing.length > 0
                  ? "One or more required runtime tables do not exist in the database."
                  : "Runtime schema version mismatch."}
              </p>
            </div>
          </div>

          {schemaMissing.length > 0 && (
            <div className="bg-zinc-900/50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-2">Missing Tables</h3>
              <ul className="space-y-1">
                {schemaMissing.map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm">
                    <span className="text-red-400">✕</span>
                    <span className="font-mono text-zinc-300">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!versionOk && schemaMissing.length === 0 && (
            <div className="bg-zinc-900/50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-2">Version Mismatch</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-500">Required:</span>
                  <span className="ml-2 font-mono text-zinc-300">{schemaVersion?.required}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Installed:</span>
                  <span className="ml-2 font-mono text-red-400">{schemaVersion?.installed ?? "none"}</span>
                </div>
              </div>
            </div>
          )}

          <div className="text-sm text-zinc-400">
            <p>Run <code className="text-[var(--brand-primary)] bg-zinc-900 px-1.5 py-0.5 rounded">scripts/sql/platform-registry-runtime.sql</code> in Supabase SQL Editor, then refresh.</p>
          </div>
        </div>
      )}

      {/* Sync State */}
      {!blocked && report ? (
        <div className="space-y-6">
          <div className="admin-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-300">Current State</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isClean ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                {isClean ? "In Sync" : "Drift Detected"}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500">Plans</p>
                <p className="text-lg font-semibold text-white">{report.sourcePlanCount} source / {report.targetPlanCount} db</p>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500">Diffs</p>
                <p className="text-lg font-semibold text-white">{report.diffs.length}</p>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500">Errors</p>
                <p className="text-lg font-semibold text-white">{report.errors.length}</p>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500">Duration</p>
                <p className="text-lg font-semibold text-white">{report.durationMs}ms</p>
              </div>
            </div>
          </div>

          {report.diffs.length > 0 && (
            <div className="admin-card overflow-hidden">
              <h2 className="text-sm font-semibold text-zinc-300 p-4 border-b border-white/5">Changes Pending</h2>
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Entity</th>
                      <th>Key</th>
                      <th>Operation</th>
                      <th>Source</th>
                      <th>Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.diffs.map((diff, i) => (
                      <tr key={i}>
                        <td><span className="text-xs text-zinc-400">{diff.entity}</span></td>
                        <td><span className="text-xs text-white font-mono">{diff.key}</span></td>
                        <td>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            diff.operation === "create" ? "bg-emerald-500/20 text-emerald-400" :
                            diff.operation === "update" ? "bg-blue-500/20 text-blue-400" :
                            diff.operation === "delete" ? "bg-red-500/20 text-red-400" :
                            "bg-zinc-800 text-zinc-400"
                          }`}>{diff.operation}</span>
                        </td>
                        <td><span className="text-xs text-zinc-500 font-mono">{diff.source !== null ? JSON.stringify(diff.source).slice(0, 60) : "—"}</span></td>
                        <td><span className="text-xs text-zinc-500 font-mono">{diff.target !== null ? JSON.stringify(diff.target).slice(0, 60) : "—"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {report.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-400 mb-2">Errors</h3>
              <ul className="space-y-1">
                {report.errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-300 font-mono">{err}</li>
                ))}
              </ul>
            </div>
          )}

          <SyncClient dryRun={true} />
        </div>
      ) : !blocked ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-sm text-red-400">Failed to generate diff report.</p>
        </div>
      ) : null}
    </ContentContainer>
  );
}
