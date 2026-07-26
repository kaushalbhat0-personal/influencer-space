export enum LifecycleState {
  VISITOR = "VISITOR",
  REGISTERED = "REGISTERED",
  AUTHENTICATED = "AUTHENTICATED",
  ONBOARDING = "ONBOARDING",
  GENERATING = "GENERATING",
  PROVISIONING = "PROVISIONING",
  PUBLISHING = "PUBLISHING",
  READY = "READY",
  EDITING = "EDITING",
  PUBLISHED = "PUBLISHED",
}

export interface LifecycleData {
  state: LifecycleState;
  userId: string | null;
  tenantId: string | null;
  workspaceId: string | null;
  role: string | null;
  hasOnboardingCompleted: boolean;
  hasWebsite: boolean;
  hasPublishedSnapshot: boolean;
}

export type AllowedRole = "SUPER_ADMIN" | "AGENCY_ADMIN" | "AGENCY_STAFF" | "ADMIN";

export interface RouteGuard {
  prefix: string;
  allowedStates: LifecycleState[];
  allowedRoles?: AllowedRole[];
  redirectTo: string;
}

export interface NavigationItem {
  label: string;
  href: string;
  icon?: string;
  group?: string;
  requiresPublished?: boolean;
}

export interface NavigationConfig {
  top: NavigationItem[];
  main: NavigationItem[];
  footer: NavigationItem[];
}
