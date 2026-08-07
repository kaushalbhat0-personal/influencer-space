// ── Customer Success — Risk Engine ──────────────────────────
// RCCF-EPIC-09 Phase 3. Deterministic risk detection from signals. Returns the
// highest severity + all findings.

import type { RiskFinding, RiskLevel, SuccessSignals } from "../domain/types";

const SEVERITY_ORDER: RiskLevel[] = ["low", "medium", "high", "critical"];

export function assessRisk(s: SuccessSignals): { risk: RiskLevel; findings: RiskFinding[] } {
  const findings: RiskFinding[] = [];

  // Trial ending within 3 days.
  if (s.trialEndsAt) {
    const daysLeft = Math.ceil((s.trialEndsAt.getTime() - Date.now()) / 86400000);
    if (daysLeft <= 3) {
      findings.push({ key: "trial_ending", label: "Trial ending soon", severity: daysLeft <= 0 ? "critical" : "high", description: `Your trial ends in ${Math.max(0, daysLeft)} day(s). Add a payment method to keep your plan.` });
    }
  }

  // Never published.
  if (!s.published) {
    findings.push({ key: "no_publish", label: "Website not published", severity: "high", description: "Publish your website so visitors can see it." });
  }

  // No products.
  if (!s.hasProducts) {
    findings.push({ key: "no_products", label: "No products yet", severity: "high", description: "Add your first product to start selling." });
  }

  // No payment setup (DIRECT_CREATOR or subscriptions).
  if (s.paymentIncomplete || (s.commerceStrategy !== "PLATFORM_COLLECT" && !s.paymentReady)) {
    findings.push({ key: "no_payment", label: "Payment not configured", severity: "medium", description: "Connect a payment account to receive money for sales." });
  }

  // No activity in 30 days (stale).
  if (s.lastActivityAt && Date.now() - s.lastActivityAt.getTime() > 30 * 86400000) {
    findings.push({ key: "inactive", label: "No activity in 30 days", severity: "medium", description: "Re-engage with your storefront to keep momentum." });
  }

  // Poor business health.
  if (s.healthScore !== null && s.healthScore < 50) {
    findings.push({ key: "poor_health", label: "Low website health", severity: "medium", description: `Your website health is ${s.healthScore}%. Improve content and structure.` });
  }

  // Low profile completion.
  if (s.knowledgeScore !== null && s.knowledgeScore < 40) {
    findings.push({ key: "low_profile", label: "Profile incomplete", severity: "medium", description: "Complete your profile so the AI knows your brand better." });
  }

  // No recommendations completed.
  if (s.completedRecommendations === 0 && (s.published || s.hasProducts)) {
    findings.push({ key: "no_recommendations", label: "No next steps completed", severity: "low", description: "Follow your suggested next steps to grow." });
  }

  // Stale account (signed up long ago, no progress).
  const ageDays = (Date.now() - s.createdAt.getTime()) / 86400000;
  if (ageDays > 14 && !s.hasProducts && !s.published) {
    findings.push({ key: "stale_account", label: "Stalled after signup", severity: "high", description: "You signed up over two weeks ago — finish your store setup to go live." });
  }

  const maxSeverity = findings.reduce<RiskLevel>((max, f) => (SEVERITY_ORDER.indexOf(f.severity) > SEVERITY_ORDER.indexOf(max) ? f.severity : max), "low");
  return { risk: findings.length === 0 ? "low" : maxSeverity, findings };
}
