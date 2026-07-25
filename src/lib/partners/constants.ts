export const PARTNER_TYPES = ["freelancer", "agency", "enterprise", "marketplace", "affiliate"] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export const PARTNER_TYPES_CONFIG: Record<PartnerType, { label: string; maxWorkspaces: number; maxClients: number; maxTeamMembers: number; allowsWhiteLabel: boolean }> = {
  freelancer: { label: "Freelancer", maxWorkspaces: 5, maxClients: 5, maxTeamMembers: 1, allowsWhiteLabel: false },
  agency: { label: "Agency", maxWorkspaces: 20, maxClients: 20, maxTeamMembers: 10, allowsWhiteLabel: true },
  enterprise: { label: "Enterprise", maxWorkspaces: 100, maxClients: 100, maxTeamMembers: 50, allowsWhiteLabel: true },
  marketplace: { label: "Marketplace", maxWorkspaces: 10, maxClients: 10, maxTeamMembers: 5, allowsWhiteLabel: false },
  affiliate: { label: "Affiliate", maxWorkspaces: 3, maxClients: 3, maxTeamMembers: 1, allowsWhiteLabel: false },
};

export const PARTNER_STATUSES = ["pending", "active", "suspended", "disabled", "invited", "archived"] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export const PARTNER_ROLES = ["owner", "admin", "manager", "viewer"] as const;
export type PartnerRole = (typeof PARTNER_ROLES)[number];

export const PARTNER_ROLE_HIERARCHY: Record<PartnerRole, number> = {
  owner: 100,
  admin: 80,
  manager: 50,
  viewer: 10,
};

export const INVITE_STATUSES = ["pending", "accepted", "declined", "revoked", "expired"] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

export const INVITE_TTL_DAYS = 7;

export const WORKSPACE_ASSIGNMENT_REASONS = ["created", "transferred", "claimed", "administrative"] as const;
export type WorkspaceAssignmentReason = (typeof WORKSPACE_ASSIGNMENT_REASONS)[number];
