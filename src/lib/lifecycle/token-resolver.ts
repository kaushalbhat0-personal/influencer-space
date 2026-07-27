import { LifecycleState, type LifecycleData, type RouteGuard } from "./types";
import type { AllowedRole } from "./types";

export const LIFECYCLE_ROUTE_GUARDS: RouteGuard[] = [
  {
    prefix: "/super-admin",
    allowedStates: [LifecycleState.READY, LifecycleState.EDITING, LifecycleState.PUBLISHED],
    allowedRoles: ["SUPER_ADMIN"],
    redirectTo: "/admin/login",
  },
  {
    prefix: "/agency",
    allowedStates: [LifecycleState.READY, LifecycleState.EDITING, LifecycleState.PUBLISHED],
    allowedRoles: ["AGENCY_ADMIN", "AGENCY_STAFF"],
    redirectTo: "/admin/login",
  },
  {
    prefix: "/admin/dashboard",
    allowedStates: [LifecycleState.READY, LifecycleState.EDITING, LifecycleState.PUBLISHED],
    allowedRoles: ["SUPER_ADMIN", "AGENCY_ADMIN", "AGENCY_STAFF", "ADMIN"],
    redirectTo: "/onboarding",
  },
  {
    prefix: "/admin",
    allowedStates: [LifecycleState.READY, LifecycleState.EDITING, LifecycleState.PUBLISHED],
    allowedRoles: ["SUPER_ADMIN", "AGENCY_ADMIN", "AGENCY_STAFF", "ADMIN"],
    redirectTo: "/onboarding",
  },
  {
    prefix: "/builder",
    allowedStates: [LifecycleState.READY, LifecycleState.EDITING, LifecycleState.PUBLISHED],
    allowedRoles: ["ADMIN", "SUPER_ADMIN", "AGENCY_ADMIN"],
    redirectTo: "/onboarding",
  },
  {
    prefix: "/onboarding",
    allowedStates: [LifecycleState.AUTHENTICATED, LifecycleState.ONBOARDING, LifecycleState.GENERATING, LifecycleState.PROVISIONING, LifecycleState.PUBLISHING],
    allowedRoles: ["ADMIN", "AGENCY_ADMIN", "AGENCY_STAFF"],
    redirectTo: "/admin/dashboard",
  },
];

export class LifecycleService {
  resolveFromToken(token: {
    id?: string | null;
    tenantId?: string | null;
    role?: string | null;
    workspaceId?: string | null;
  } | null): LifecycleData {
    if (!token?.id) {
      return {
        state: LifecycleState.VISITOR,
        userId: null, tenantId: null, workspaceId: null, role: null,
        hasOnboardingCompleted: false, hasWebsite: false, hasPublishedSnapshot: false,
      };
    }

    const role = token.role ?? null;
    const tenantId = token.tenantId ?? null;

    if (role === "SUPER_ADMIN" || role === "AGENCY_ADMIN" || role === "AGENCY_STAFF") {
      return {
        state: LifecycleState.READY,
        userId: token.id,
        tenantId,
        workspaceId: token.workspaceId ?? null,
        role,
        hasOnboardingCompleted: true, hasWebsite: true, hasPublishedSnapshot: false,
      };
    }

    if (!tenantId) {
      return {
        state: LifecycleState.AUTHENTICATED,
        userId: token.id,
        tenantId: null, workspaceId: null, role,
        hasOnboardingCompleted: false, hasWebsite: false, hasPublishedSnapshot: false,
      };
    }

    return {
      state: LifecycleState.READY,
      userId: token.id,
      tenantId,
      workspaceId: token.workspaceId ?? null,
      role,
      hasOnboardingCompleted: true, hasWebsite: true, hasPublishedSnapshot: false,
    };
  }

  canAccess(pathname: string, lifecycle: LifecycleData): { allowed: boolean; redirectTo?: string } {
    const guard = LIFECYCLE_ROUTE_GUARDS.find((g) => pathname.startsWith(g.prefix));
    if (!guard) return { allowed: true };

    if (lifecycle.role === "SUPER_ADMIN") return { allowed: true };

    if (guard.allowedRoles) {
      const roleMatch = guard.allowedRoles.includes(lifecycle.role as AllowedRole);
      if (!roleMatch) {
        return { allowed: false, redirectTo: guard.redirectTo };
      }
    }

    const stateMatch = guard.allowedStates.includes(lifecycle.state);
    if (!stateMatch) {
      if (lifecycle.state === LifecycleState.VISITOR || lifecycle.state === LifecycleState.AUTHENTICATED) {
        return { allowed: false, redirectTo: "/onboarding" };
      }
      return { allowed: false, redirectTo: guard.redirectTo };
    }

    return { allowed: true };
  }

  canAccessDashboard(lifecycle: LifecycleData): boolean {
    if (lifecycle.role === "SUPER_ADMIN") return true;
    if (lifecycle.role === "AGENCY_ADMIN" || lifecycle.role === "AGENCY_STAFF") return true;
    return lifecycle.state === LifecycleState.READY
      || lifecycle.state === LifecycleState.EDITING
      || lifecycle.state === LifecycleState.PUBLISHED;
  }

  canAccessBuilder(lifecycle: LifecycleData): boolean {
    return lifecycle.hasOnboardingCompleted
      && lifecycle.hasWebsite
      && (lifecycle.state === LifecycleState.READY
        || lifecycle.state === LifecycleState.EDITING
        || lifecycle.state === LifecycleState.PUBLISHED);
  }

  canPublish(lifecycle: LifecycleData): boolean {
    return lifecycle.hasOnboardingCompleted && lifecycle.hasWebsite;
  }

  canAccessStorefront(lifecycle: LifecycleData): { visible: boolean; status: string } {
    if (!lifecycle.hasPublishedSnapshot && lifecycle.hasWebsite) {
      return { visible: true, status: "draft" };
    }
    if (lifecycle.hasPublishedSnapshot) {
      return { visible: true, status: "published" };
    }
    return { visible: false, status: "unavailable" };
  }

  redirectTo(pathname: string, lifecycle: LifecycleData): string | null {
    if (lifecycle.role === "SUPER_ADMIN") {
      if (!pathname.startsWith("/super-admin") && !pathname.startsWith("/admin/login")) {
        return "/super-admin";
      }
      return null;
    }

    if (lifecycle.role === "AGENCY_ADMIN" || lifecycle.role === "AGENCY_STAFF") {
      if (!pathname.startsWith("/agency") && !pathname.startsWith("/admin/login") && !pathname.startsWith("/workspace")) {
        return "/agency";
      }
      return null;
    }

    if (lifecycle.state === LifecycleState.AUTHENTICATED) {
      if (pathname.startsWith("/admin") || pathname.startsWith("/builder")) {
        return "/onboarding";
      }
      return null;
    }

    if (lifecycle.state === LifecycleState.ONBOARDING
      || lifecycle.state === LifecycleState.GENERATING
      || lifecycle.state === LifecycleState.PROVISIONING
      || lifecycle.state === LifecycleState.PUBLISHING) {
      if (pathname.startsWith("/admin") && !pathname.startsWith("/onboarding")) {
        return null;
      }
      if (pathname.startsWith("/builder")) {
        return "/admin/dashboard";
      }
      return null;
    }

    if (lifecycle.state === LifecycleState.READY
      || lifecycle.state === LifecycleState.EDITING
      || lifecycle.state === LifecycleState.PUBLISHED) {
      if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
        return "/admin/dashboard";
      }
      return null;
    }

    return null;
  }
}
