import type { Prisma } from "@/generated/prisma/client";
import type { Template } from "@/lib/template/registry";

type StrategyId = "fast" | "balanced" | "premium";

/**
 * RCCF-18: manual/template provisioning no longer seeds fabricated creator
 * content. A brand-new manual website must not present products, history,
 * gallery images, or affiliate links the creator never provided — that would
 * violate the no-fabricated-facts product principle.
 *
 * The generated (profile-import) path already skips this hook via the
 * generatedWebsite.sections guard in ProvisioningService, so generated sites
 * are unaffected. The function is retained as the canonical starter-seed hook
 * (called by ProvisioningService for the manual path) but seeds nothing: the
 * manual experience is truthful and sparse, and empty sections auto-hide via
 * the existing section-presentation runtime.
 */
export async function seedStarterData(
  _template: Template,
  _tenantId: string,
  _strategy: StrategyId,
  _creatorName?: string,
  _tx?: Prisma.TransactionClient,
): Promise<void> {
  return;
}
