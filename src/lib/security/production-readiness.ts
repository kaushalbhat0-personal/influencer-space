import { validateConfig } from "@/lib/config/validation";
import { platformBootstrap } from "@/lib/platform/bootstrap";
import { partnerEngine } from "@/lib/partners/engine";
import { commissionLedger } from "@/lib/commission/ledger";
import { payoutLedger } from "@/lib/payouts/ledger";
import { getPlatformHealth } from "@/lib/reliability";
import { getDiagnostics } from "@/lib/reliability";
import { getRateLimitStats } from "./rate-limiter";

export interface ProductionCheck {
  category: string;
  label: string;
  status: "pass" | "fail" | "warn" | "info";
  detail: string;
}

export async function getProductionReadiness(): Promise<{
  overall: "pass" | "fail" | "warn";
  checks: ProductionCheck[];
}> {
  const checks: ProductionCheck[] = [];

  // ── Configuration ──────────────────────────────────────────────────────
  const config = validateConfig();
  for (const c of config.checks) {
    checks.push({
      category: "configuration",
      label: c.label,
      status: c.required ? (c.present ? "pass" : "fail") : (c.present ? "pass" : "info"),
      detail: c.present ? `${c.key} is set` : `${c.key} is not set${c.required ? " (REQUIRED)" : " (optional)"}`,
    });
  }

  // ── Platform Bootstrap ─────────────────────────────────────────────────
  const report = platformBootstrap.getReport();
  checks.push({
    category: "platform",
    label: "Platform Bootstrap",
    status: report ? (report.status === "ready" ? "pass" : report.status === "degraded" ? "warn" : "fail") : "fail",
    detail: report ? `Status: ${report.status} (${report.phases.length} phases, ${report.totalDurationMs}ms)` : "Not initialized",
  });

  // ── Database ───────────────────────────────────────────────────────────
  const health = await getPlatformHealth();
  checks.push({
    category: "infrastructure",
    label: "Database Connectivity",
    status: health.checks.database?.status === "ok" ? "pass" : "fail",
    detail: health.checks.database?.status === "ok" ? `Connected (${health.checks.database.latencyMs}ms)` : "Disconnected",
  });

  // ── Engines ────────────────────────────────────────────────────────────
  const engineChecks = [
    { label: "Partner Engine", count: partnerEngine.listPartners().length },
    { label: "Commission Engine", count: commissionLedger.getAllEntries().length },
    { label: "Payout Engine", count: payoutLedger.getAllBatches().length },
  ];
  for (const ec of engineChecks) {
    checks.push({
      category: "engines",
      label: ec.label,
      status: "pass",
      detail: `Initialized with ${ec.count} records cached`,
    });
  }

  // ── Rate Limiting ──────────────────────────────────────────────────────
  const rateStats = getRateLimitStats();
  checks.push({
    category: "security",
    label: "Rate Limiting",
    status: "pass",
    detail: `Active (${rateStats.tracked} tracked endpoints, ${rateStats.entries} total requests)`,
  });

  // ── Diagnostics ────────────────────────────────────────────────────────
  const diagnostics = await getDiagnostics();
  checks.push({
    category: "monitoring",
    label: "Health & Diagnostics",
    status: diagnostics.health.status === "ok" ? "pass" : "warn",
    detail: `Health: ${diagnostics.health.status}`,
  });

  const overall = checks.some((c) => c.status === "fail") ? "fail" : checks.some((c) => c.status === "warn") ? "warn" : "pass";

  return { overall, checks };
}
