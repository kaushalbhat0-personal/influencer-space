// ── Communication — Domain Types ───────────────────────────
// RCCF-TRACK-02. The canonical communication layer. Business runtimes never
// send — they emit events; this runtime routes, templates, delivers, records
// and retries.

export type CommunicationChannel = "email" | "in_app" | "alert" | "sms" | "whatsapp" | "push";
export type CommunicationAudience = "creator" | "agency" | "super_admin";
export type NotificationPriority = "low" | "medium" | "high";

export interface CommunicationTemplate {
  /** Rendered subject/title. */
  subject: string;
  /** Rendered body (plain text; no HTML in business logic). */
  body: string;
}

export interface CommunicationDefinition {
  id: string;
  name: string;
  audience: CommunicationAudience;
  priority: NotificationPriority;
  /** Primary channel: email, in_app, alert. */
  channel: CommunicationChannel;
  category: string;
  /** Template with {{variable}} placeholders. */
  template: CommunicationTemplate;
  retries: number;
  throttle: string | null;
  /** Required data keys for rendering. */
  requiredData: string[];
}

export interface NotificationView {
  id: string;
  category: string;
  title: string;
  body: string | null;
  priority: NotificationPriority;
  read: boolean;
  archived: boolean;
  createdAt: string;
}

/** Resolved recipient (from the session) — creator tenant, agency id, or "system". */
export interface Recipient {
  audience: CommunicationAudience;
  recipientId: string;
  email?: string | null;
}
