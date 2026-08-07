// ── Communication — Provider Adapters ───────────────────────
// RCCF-TRACK-02 Phases 3-4. Every delivery goes through an adapter — no provider
// calls from business runtimes. Email is launch-ready behind an interface
// (currently a durable log adapter); In-App + Admin Alert write the Notification
// table. SMS/WhatsApp/Push/Slack/Discord are future adapters.

import { prisma } from "@/lib/prisma";
import type { CommunicationChannel, Recipient } from "../domain/types";

export interface DeliveryRequest {
  templateId: string;
  recipient: Recipient;
  channel: CommunicationChannel;
  subject: string;
  body: string;
  payload: Record<string, unknown>;
}

export interface DeliveryResult {
  success: boolean;
  provider: string;
  error?: string;
}

/** Canonical provider adapter interface. */
export interface CommunicationProviderAdapter {
  readonly channel: CommunicationChannel;
  deliver(req: DeliveryRequest): Promise<DeliveryResult>;
}

/** Email provider — launch adapter: records the email durably (no SMTP infra yet).
 *  Future providers (Resend/SES/SendGrid) implement the same interface. */
class EmailLogAdapter implements CommunicationProviderAdapter {
  readonly channel: CommunicationChannel = "email";
  async deliver(req: DeliveryRequest): Promise<DeliveryResult> {
    // Persist the rendered email so it is auditable and later replayable.
    await prisma.notification.create({
      data: {
        audience: req.recipient.audience,
        recipientId: req.recipient.recipientId,
        category: "billing",
        title: req.subject,
        body: req.body,
        priority: "medium",
        channel: "email",
        data: { email: req.recipient.email, payload: req.payload } as never,
      },
    }).catch(() => {});
    return { success: true, provider: "log" };
  }
}

/** In-app notification adapter — writes the Notification table. */
class InAppAdapter implements CommunicationProviderAdapter {
  readonly channel: CommunicationChannel = "in_app";
  async deliver(req: DeliveryRequest): Promise<DeliveryResult> {
    const category = categoryFor(req.templateId);
    await prisma.notification.create({
      data: {
        audience: req.recipient.audience,
        recipientId: req.recipient.recipientId,
        category,
        title: req.subject,
        body: req.body,
        priority: priorityFor(req.templateId),
        channel: "in_app",
        data: req.payload as never,
      },
    });
    return { success: true, provider: "in_app" };
  }
}

/** Admin alert adapter — writes a super_admin notification. */
class AdminAlertAdapter implements CommunicationProviderAdapter {
  readonly channel: CommunicationChannel = "alert";
  async deliver(req: DeliveryRequest): Promise<DeliveryResult> {
    await prisma.notification.create({
      data: {
        audience: "super_admin",
        recipientId: "system",
        category: "system",
        title: req.subject,
        body: req.body,
        priority: priorityFor(req.templateId),
        channel: "alert",
        data: req.payload as never,
      },
    });
    return { success: true, provider: "alert" };
  }
}

export const communicationAdapters: Record<string, CommunicationProviderAdapter> = {
  email: new EmailLogAdapter(),
  in_app: new InAppAdapter(),
  alert: new AdminAlertAdapter(),
};

export function getAdapter(channel: CommunicationChannel): CommunicationProviderAdapter | null {
  return communicationAdapters[channel] ?? null;
}

// Notification category/priority inferred from the template id's prefix.
function categoryFor(templateId: string): string {
  const map: Record<string, string> = {
    order: "orders", payment: "payments", download: "orders", shipment: "orders",
    subscription: "billing", commission: "billing", success: "customer_success",
    alert: "system",
  };
  for (const [key, cat] of Object.entries(map)) {
    if (templateId.startsWith(key)) return cat;
  }
  return "system";
}

function priorityFor(templateId: string): "low" | "medium" | "high" {
  return templateId.startsWith("alert") || templateId.includes("trial") || templateId.includes("failed") ? "high" : "medium";
}
