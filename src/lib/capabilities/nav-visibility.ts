import { capabilityService } from "./service";
import {
  ADMIN_NAV,
  isAdminNavIconKey,
  type AdminNavIconKey,
  type NavConfig,
  type NavConfigWire,
  type NavItem,
  type NavItemWire,
} from "@/config/admin-nav";
import type { LucideIcon } from "lucide-react";

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

// RCCF-70.6.2 — deterministically derive a wire-safe icon key from the Lucide
// component's `displayName` (Lucide sets displayName = PascalCase(iconName)).
// Unknown/unnamed icons fall back to "Menu" so a misconfigured item can never
// reintroduce a non-serializable value into the Server → Client payload.
const FALLBACK_ICON_KEY: AdminNavIconKey = "Menu";

function iconKeyOf(icon: LucideIcon): AdminNavIconKey {
  const name = icon.displayName;
  if (typeof name === "string" && isAdminNavIconKey(name)) return name;
  return FALLBACK_ICON_KEY;
}

/**
 * Project a filtered `NavConfig` into the wire-safe `NavConfigWire` consumed by
 * the client shell. Capability metadata (`requiredCapability`/limits) and React
 * icon components are intentionally NOT serialized — the client only receives
 * `iconKey` strings and resolves presentation via its own icon registry.
 */
export function toNavWire(config: NavConfig): NavConfigWire {
  const toItem = (item: NavItem): NavItemWire => ({
    href: item.href,
    label: item.label,
    iconKey: iconKeyOf(item.icon),
    badge: item.badge,
  });

  return {
    groups: config.groups.map((group) => ({
      ...group,
      items: group.items.map(toItem),
    })),
    footer: config.footer.map(toItem),
  };
}

export { ADMIN_NAV };
