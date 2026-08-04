"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { AGENCY_NAV } from "@/lib/navigation/config";

/**
 * IMPLEMENTATION-41: agency console navigation shell. Client-side so the
 * AGENCY_NAV (which carries lucide icon components) is never passed across the
 * server→client prop boundary.
 */
export function AgencySidebar() {
  return <Sidebar nav={AGENCY_NAV} />;
}
