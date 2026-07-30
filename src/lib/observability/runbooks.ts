export interface RunbookStep {
  order: number;
  action: string;
  details: string;
  command?: string;
}

export interface Runbook {
  id: string;
  title: string;
  description: string;
  alertRule?: string;
  severity: "critical" | "warning";
  steps: RunbookStep[];
  relatedLinks?: string[];
}

export const RUNBOOKS: Runbook[] = [
  {
    id: "publishing-failure",
    title: "Publishing Failure",
    description: "A publish operation failed or exceeded the 30-second threshold. Resolve by verifying the snapshot and repository state.",
    alertRule: "publish_duration",
    severity: "warning",
    steps: [
      { order: 1, action: "Check Publishing Service Logs", details: "Search for ERROR level logs from 'publishing' service in the last 15 minutes. Look for the correlation ID in the error payload." },
      { order: 2, action: "Verify Snapshot Integrity", details: "Open the publish snapshot for the failed website. Check that all required fields (hero, products, gallery) are present and valid." },
      { order: 3, action: "Check Database Connectivity", details: "Navigate to Platform Health and verify the database service shows 'Healthy'. If critical, investigate database connection pool." },
      { order: 4, action: "Retry the Publish", details: "Once the issue is resolved, trigger a new publish from the website's publish button or via the Operations page recovery actions." },
    ],
    relatedLinks: ["/super-admin/health", "/super-admin/operations"],
  },
  {
    id: "provisioning-failure",
    title: "Provisioning Failure",
    description: "A provisioning workflow failed or exceeded the 60-second threshold. This affects new creator onboarding.",
    alertRule: "provision_duration",
    severity: "critical",
    steps: [
      { order: 1, action: "Identify the Failed Provision", details: "Check the provision run logs for the failed run ID. Look for error messages about tenant creation, user setup, or slug generation." },
      { order: 2, action: "Check Slug Uniqueness", details: "Verify the requested slug is not already taken. Duplicate slug errors appear as P2002 Prisma errors." },
      { order: 3, action: "Verify Template Availability", details: "Confirm the requested template exists in the template registry. Missing templates cause silent fallbacks." },
      { order: 4, action: "Check Database State", details: "Navigate to Platform Health. If database is healthy, the issue may be a transaction timeout — retry the provision." },
      { order: 5, action: "Manual Tenant Cleanup", details: "If the tenant was partially created, clean up orphaned records via the super admin tenant management page before retrying." },
    ],
    relatedLinks: ["/super-admin/health", "/super-admin/tenants"],
  },
  {
    id: "billing-failure",
    title: "Billing Failure",
    description: "A billing operation (checkout, payment capture, subscription update) failed.",
    alertRule: "billing_failure",
    severity: "critical",
    steps: [
      { order: 1, action: "Check Payment Provider", details: "Verify Razorpay connectivity. Navigate to the health page and check billing service status." },
      { order: 2, action: "Review Payment Events", details: "Open the Events page (/super-admin/events) and filter by billing event types. Look for PaymentCaptured or SubscriptionActivated events." },
      { order: 3, action: "Check Idempotency Keys", details: "Failed payments may have idempotency conflicts. Verify the idempotency service is healthy via Platform Health." },
      { order: 4, action: "Manual Invoice Creation", details: "If auto-billing fails, create invoices manually from the Invoices management page." },
    ],
    relatedLinks: ["/super-admin/health", "/super-admin/events", "/super-admin/invoices"],
  },
  {
    id: "generation-failure",
    title: "Generation Failure",
    description: "AI content generation failed. This affects new website creation and content regeneration.",
    alertRule: "generation_failure",
    severity: "warning",
    steps: [
      { order: 1, action: "Check AI Provider Status", details: "Verify the configured AI provider (OpenAI, Anthropic, etc.) is accessible. Check API key validity and rate limits." },
      { order: 2, action: "Review Generation Session", details: "Open the failed generation session and review the error payload for provider-specific error codes." },
      { order: 3, action: "Check Token Quotas", details: "Verify monthly token quotas have not been exhausted. Reset quotas or switch providers if needed." },
      { order: 4, action: "Retry Generation", details: "Trigger a regeneration from the Creator Import page or the failed session's retry button." },
    ],
    relatedLinks: ["/super-admin/generate"],
  },
  {
    id: "registry-drift",
    title: "Registry Drift",
    description: "Platform registry sync detected differences between source and target. Plans, pricing, or billing configs may be out of sync.",
    alertRule: "registry_mismatch",
    severity: "warning",
    steps: [
      { order: 1, action: "View Sync Report", details: "Navigate to Registry Sync (/super-admin/platform/sync) and review the diff report." },
      { order: 2, action: "Identify Affected Entities", details: "Check which entities (plans, pricing, revenue config, billing config, commission policy) have differences." },
      { order: 3, action: "Run Platform Sync", details: "Execute the sync operation from the Registry Sync page. Review the changes before applying." },
      { order: 4, action: "Verify Sync Completion", details: "After sync, re-run a diff check to confirm all entities are aligned." },
    ],
    relatedLinks: ["/super-admin/platform/sync"],
  },
  {
    id: "database-failure",
    title: "Database Failure",
    description: "Database health check reports critical or warning state. This affects all platform services.",
    alertRule: "health_critical",
    severity: "critical",
    steps: [
      { order: 1, action: "Check Database Status", details: "Navigate to Platform Health to confirm database status and latency. Sub-second latency is normal." },
      { order: 2, action: "Review Recent Deployments", details: "Check if a recent deployment introduced schema changes or migration issues." },
      { order: 3, action: "Check Connection Pool", details: "High latency may indicate connection pool exhaustion. Restart the application or increase pool size." },
      { order: 4, action: "Verify Prisma Migrations", details: "Run prisma migrate status to confirm all migrations have been applied." },
      { order: 5, action: "Escalate to Infrastructure", details: "If database is unreachable, contact the infrastructure team to verify the database server is running." },
    ],
    relatedLinks: ["/super-admin/health", "/super-admin/operations"],
  },
];

export function getRunbook(id: string): Runbook | undefined {
  return RUNBOOKS.find((r) => r.id === id);
}

export function getRunbookForAlert(alertRule: string): Runbook | undefined {
  return RUNBOOKS.find((r) => r.alertRule === alertRule);
}
