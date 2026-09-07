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

/** Production Resend email adapter — implements the same interface, sends via Resend API. */
class ResendEmailAdapter implements CommunicationProviderAdapter {
  readonly channel: CommunicationChannel = "email";
  async deliver(req: DeliveryRequest): Promise<DeliveryResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      return { success: false, provider: "resend", error: "RESEND_API_KEY or EMAIL_FROM not configured" };
    }
    const to = req.recipient.email;
    if (!to) {
      return { success: false, provider: "resend", error: "Recipient email missing" };
    }
    try {
      // Always persist audit record first — durable even if provider fails (retryable via CommunicationLog).
      await prisma.notification.create({
        data: {
          audience: req.recipient.audience,
          recipientId: req.recipient.recipientId,
          category: "billing",
          title: req.subject,
          body: req.body,
          priority: "medium",
          channel: "email",
          data: { email: to, payload: req.payload, provider: "resend", from } as never,
        },
      }).catch(() => {});

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: req.subject,
          text: req.body,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        return { success: false, provider: "resend", error: `Resend ${res.status}: ${errText.slice(0, 300)}` };
      }

      return { success: true, provider: "resend" };
    } catch (err) {
      // Never log apiKey/from — handled by runtime semantics (caller logs generic failure).
      return { success: false, provider: "resend", error: err instanceof Error ? err.message : "Resend delivery failed" };
    }
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

function resolveEmailAdapter(): CommunicationProviderAdapter {
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    return new ResendEmailAdapter();
  }
  return new EmailLogAdapter();
}

// RCCF-INTEGRATIONS-02 — lazy email resolution: the warm-server singleton
// `communicationAdapters.email` was evaluated once at import and then never
// reflected a later RESEND_API_KEY/EMAIL_FROM change (or test override).
// In-App and Alert remain singletons (no env dependency); email is always
// re-resolved so provider configuration cannot go stale.
const inAppAdapter = new InAppAdapter();
const alertAdapter = new AdminAlertAdapter();

export const communicationAdapters: Record<string, CommunicationProviderAdapter> = {
  // Back-compat: `communicationAdapters.email` now delegates to the live config
  // via a getter-like object so existing `communicationAdapters["email"]` reads
  // never see a stale adapter. Direct reads should migrate to getAdapter("email").
  get email(): CommunicationProviderAdapter {
    return resolveEmailAdapter();
  },
  set email(_v: CommunicationProviderAdapter) {
    // Allow tests that assign communicationAdapters.email to still work;
    // the next read will still re-resolve from env, so we no-op.
  },
  in_app: inAppAdapter,
  alert: alertAdapter,
} as Record<string, CommunicationProviderAdapter>;

// Test seams — do not use in production code outside tests.
export const __testables = { EmailLogAdapter, ResendEmailAdapter, resolveEmailAdapter };

export function getAdapter(channel: CommunicationChannel): CommunicationProviderAdapter | null {
  if (channel === "email") return resolveEmailAdapter();
  if (channel === "in_app") return inAppAdapter;
  if (channel === "alert") return alertAdapter;
  return null;
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
