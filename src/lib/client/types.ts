export type ClientStatus = "lead" | "active" | "paused" | "archived";

export interface ClientData {
  id: string;
  tenantId: string;
  businessName: string;
  contactName: string | null;
  email: string | null;
  status: ClientStatus;
  note: string | null;
  createdAt: Date;
  websiteCount: number;
  healthScore: number | null;
  publishState: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
}

export interface ClientSummary {
  totalClients: number;
  activeClients: number;
  publishedWebsites: number;
  averageHealth: number;
  recentClients: ClientData[];
  needingAttention: number;
  unpublished: number;
}
