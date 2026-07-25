import type { PartnerType, PartnerStatus, PartnerRole, InviteStatus, WorkspaceAssignmentReason } from "./constants";

export interface Partner {
  id: string;
  type: PartnerType;
  status: PartnerStatus;
  profile: PartnerProfile;
  settings: PartnerSettings;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerProfile {
  businessName: string;
  logo?: string;
  website?: string;
  description?: string;
  taxIdentifier?: string;
  country?: string;
  timezone?: string;
  supportEmail?: string;
  contactPerson?: string;
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    twitter?: string;
    linkedin?: string;
    facebook?: string;
  };
}

export interface PartnerSettings {
  allowClientInvites: boolean;
  autoAssignWorkspaces: boolean;
  requireApprovalForTransfers: boolean;
  defaultRoleForNewClients: PartnerRole;
  notificationPreferences: {
    email: boolean;
    inviteReceived: boolean;
    workspaceTransferred: boolean;
    clientJoined: boolean;
  };
}

export interface PartnerMember {
  id: string;
  partnerId: string;
  userId: string;
  role: PartnerRole;
  status: "active" | "inactive";
  joinedAt: string;
}

export interface PartnerWorkspace {
  id: string;
  partnerId: string;
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  assignedAt: string;
  assignedBy: string;
  reason: WorkspaceAssignmentReason;
  status: "active" | "transferred" | "removed";
  transferredAt?: string;
}

export interface PartnerInvite {
  id: string;
  partnerId: string;
  email: string;
  role: PartnerRole;
  status: InviteStatus;
  invitedById: string;
  acceptedById?: string;
  acceptedAt?: string;
  declinedAt?: string;
  revokedAt?: string;
  expiredAt?: string;
  expiresAt: string;
  createdAt: string;
  message?: string;
}

export interface PartnerStatistics {
  totalWorkspaces: number;
  activeClients: number;
  pendingInvites: number;
  teamMembers: number;
  workspaceUsage: {
    assigned: number;
    capacity: number;
    remaining: number;
  };
  clientUsage: {
    assigned: number;
    capacity: number;
    remaining: number;
  };
}

export interface PartnerDashboardSummary {
  partner: {
    id: string;
    type: PartnerType;
    businessName: string;
    status: PartnerStatus;
  };
  activeClients: number;
  workspaceUsage: {
    assigned: number;
    capacity: number;
    remaining: number;
    percentUsed: number;
  };
  clientUsage: {
    assigned: number;
    capacity: number;
    remaining: number;
    percentUsed: number;
  };
  plan: {
    code: string;
    name: string;
  };
  pendingInvites: number;
  recentActivity: PartnerActivityItem[];
  growthMetrics: PartnerGrowthMetrics;
}

export interface PartnerActivityItem {
  type: "workspace_assigned" | "workspace_transferred" | "invite_sent" | "invite_accepted" | "member_joined" | "member_removed";
  description: string;
  timestamp: string;
  relatedId?: string;
}

export interface PartnerGrowthMetrics {
  workspacesThisMonth: number;
  workspacesLastMonth: number;
  growthPercent: number;
  invitesSentThisMonth: number;
  invitesAcceptedThisMonth: number;
  conversionRate: number;
}

export interface PartnerQuery {
  search?: string;
  type?: PartnerType;
  status?: PartnerStatus;
  country?: string;
  planCode?: string;
  minWorkspaceCount?: number;
  maxWorkspaceCount?: number;
  createdAfter?: string;
  createdBefore?: string;
  sortBy?: "name" | "createdAt" | "workspaceCount" | "status";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface OwnershipCheck {
  isOwner: boolean;
  partnerId: string | null;
  partnerType: PartnerType | null;
  capacity?: {
    canAssign: boolean;
    reason?: string;
    remainingWorkspaces: number;
    remainingClients: number;
  };
}
