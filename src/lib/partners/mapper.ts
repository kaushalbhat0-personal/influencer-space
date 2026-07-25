import type { Partner, PartnerProfile, PartnerSettings, PartnerDashboardSummary, PartnerGrowthMetrics, PartnerActivityItem, PartnerWorkspace } from "./types";
import type { PartnerStatistics } from "./types";
import type { PartnerType, PartnerRole } from "./constants";

export function toDashboardSummary(
  partner: Partner,
  stats: PartnerStatistics,
  recentActivity: PartnerActivityItem[],
  planCode: string,
  planName: string,
): PartnerDashboardSummary {
  const workspaceUsage = stats.workspaceUsage;
  const clientUsage = stats.clientUsage;
  return {
    partner: {
      id: partner.id,
      type: partner.type,
      businessName: partner.profile.businessName,
      status: partner.status,
    },
    activeClients: stats.activeClients,
    workspaceUsage: {
      ...workspaceUsage,
      percentUsed: workspaceUsage.capacity > 0 ? Math.round((workspaceUsage.assigned / workspaceUsage.capacity) * 100) : 0,
    },
    clientUsage: {
      ...clientUsage,
      percentUsed: clientUsage.capacity > 0 ? Math.round((clientUsage.assigned / clientUsage.capacity) * 100) : 0,
    },
    plan: { code: planCode, name: planName },
    pendingInvites: stats.pendingInvites,
    recentActivity: recentActivity.slice(0, 10),
    growthMetrics: computeGrowthMetrics(),
  };
}

export function computeGrowthMetrics(): PartnerGrowthMetrics {
  return {
    workspacesThisMonth: 0,
    workspacesLastMonth: 0,
    growthPercent: 0,
    invitesSentThisMonth: 0,
    invitesAcceptedThisMonth: 0,
    conversionRate: 0,
  };
}

export function toStatistics(
  workspaces: PartnerWorkspace[],
  config: { maxWorkspaces: number; maxClients: number },
  pendingInvites: number,
  teamMembers: number,
): PartnerStatistics {
  const activeWorkspaces = workspaces.filter((w) => w.status === "active");
  return {
    totalWorkspaces: workspaces.length,
    activeClients: activeWorkspaces.length,
    pendingInvites,
    teamMembers,
    workspaceUsage: {
      assigned: activeWorkspaces.length,
      capacity: config.maxWorkspaces,
      remaining: Math.max(0, config.maxWorkspaces - activeWorkspaces.length),
    },
    clientUsage: {
      assigned: activeWorkspaces.length,
      capacity: config.maxClients,
      remaining: Math.max(0, config.maxClients - activeWorkspaces.length),
    },
  };
}

export function defaultProfile(): PartnerProfile {
  return {
    businessName: "",
  };
}

export function defaultSettings(): PartnerSettings {
  return {
    allowClientInvites: true,
    autoAssignWorkspaces: false,
    requireApprovalForTransfers: true,
    defaultRoleForNewClients: "viewer",
    notificationPreferences: {
      email: true,
      inviteReceived: true,
      workspaceTransferred: true,
      clientJoined: true,
    },
  };
}

export function formatPartnerType(type: PartnerType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function formatPartnerRole(role: PartnerRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function formatPartnerStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    active: "Active",
    suspended: "Suspended",
    disabled: "Disabled",
    invited: "Invited",
    archived: "Archived",
  };
  return map[status] ?? status;
}
