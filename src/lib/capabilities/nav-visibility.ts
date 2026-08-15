import { capabilityService } from "./service";
import { ADMIN_NAV, type NavConfig, type NavItem } from "@/config/admin-nav";

/**
 * RCCF-67.4 — capability-aware navigation visibility.
 *
 * Navigation is a UI projection of the canonical capability system: each item
 * may declare a `requiredCapability` (feature key). Visibility resolves against
 * the tenant's ACTIVE plan via capabilityService — never a hardcoded plan list.
 *
 * UX ONLY. It does NOT replace server-side authorization (middleware + route
 * guards + action-level tenant checks remain authoritative).
 */
export function isNavItemVisible(item: NavItem, planCode: string): boolean {
  if (!item.requiredCapability) return true;

  if (item.requiredLimitAbove !== false) {
    const limit = capabilityService.limit(planCode, item.requiredCapability);
    // -1 = unlimited; numeric limits must be > 0 to be available.
    return limit === -1 || limit > 0;
  }

  return capabilityService.can(planCode, item.requiredCapability).allowed;
}

/** Return the subset of nav config visible for a plan. */
export function filterNavForPlan(config: NavConfig, planCode: string): NavConfig {
  return {
    groups: config.groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => isNavItemVisible(item, planCode)),
      }))
      .filter((group) => group.items.length > 0),
    footer: config.footer,
  };
}

export { ADMIN_NAV };
