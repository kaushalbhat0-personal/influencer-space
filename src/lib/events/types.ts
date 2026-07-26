export const EVENT_TYPES = [
  "UserRegistered",
  "CreatorProvisioned",
  "WebsiteBeingGenerated",
  "WebsiteGenerated",
  "WebsitePublished",
  "PaymentCaptured",
  "SubscriptionActivated",
  "SubscriptionCancelled",
  "CapabilityAssigned",
  "PartnerAssigned",
  "CommissionCreated",
  "PayoutCreated",
  "PayoutCompleted",
  "InviteAccepted",
  "WorkspaceCreated",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface PlatformEventPayloads {
  UserRegistered: {
    userId: string;
    email: string;
    persona: "creator" | "agency";
    planCode: string;
  };
  CreatorProvisioned: {
    tenantId: string;
    creatorName: string;
    sourceUrl: string;
    sourcePlatform: string;
    workspaceId: string;
    planCode: string;
    correlationId?: string;
  };
  WebsiteBeingGenerated: {
    tenantId: string;
    workspaceId: string;
    creatorName: string;
    sourceUrl: string;
    sourcePlatform: string;
    correlationId?: string;
  };
  WebsiteGenerated: {
    tenantId: string;
    creatorName: string;
    sourcePlatform: string;
    stagesCompleted: number;
    totalStages: number;
    correlationId?: string;
  };
  WebsitePublished: {
    tenantId: string;
    websiteId: string;
    version: number;
    storefrontUrl: string;
    correlationId?: string;
  };
  PaymentCaptured: {
    workspaceId: string;
    planCode: string;
    amount: number;
    currency: string;
    invoiceId: string;
    subscriptionId: string;
  };
  SubscriptionActivated: {
    workspaceId: string;
    planCode: string;
    previousStatus: string;
  };
  SubscriptionCancelled: {
    workspaceId: string;
    planCode: string;
    reason?: string;
  };
  CapabilityAssigned: {
    workspaceId: string;
    planCode: string;
    featuresEnabled: number;
  };
  PartnerAssigned: {
    partnerId: string;
    workspaceId: string;
    workspaceName: string;
    assignedBy: string;
  };
  CommissionCreated: {
    partnerId: string;
    invoiceId: string;
    amount: number;
    partnerShare: number;
    platformShare: number;
    planCode: string;
  };
  PayoutCreated: {
    batchId: string;
    partnerId: string;
    amount: number;
    provider: string;
  };
  PayoutCompleted: {
    batchId: string;
    partnerId: string;
    amount: number;
    providerReference?: string;
  };
  InviteAccepted: {
    partnerId: string;
    email: string;
    role: string;
  };
  WorkspaceCreated: {
    workspaceId: string;
    tenantId?: string;
    type: string;
    name: string;
  };
}

export type PlatformEvent<T extends EventType = EventType> = {
  id: string;
  type: T;
  payload: PlatformEventPayloads[T];
  correlationId?: string;
  timestamp: string;
  source: string;
};

export type PlatformEventHandler<T extends EventType = EventType> = (
  event: PlatformEvent<T>,
) => void | Promise<void>;

export type UnsubscribeFn = () => void;
