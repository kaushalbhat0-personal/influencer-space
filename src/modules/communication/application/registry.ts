// ── Communication — Canonical Registry ─────────────────────
// RCCF-TRACK-02 Phase 2. Every communication is declarative. No business logic
// here; runtimes only reference these ids (or the event wiring maps events).

import type { CommunicationDefinition } from "../domain/types";
import { BRAND } from "@/lib/marketing/messaging";

export const COMMUNICATION_REGISTRY: CommunicationDefinition[] = [
  // ── Commerce ───────────────────────────────────────────────
  { id: "order.confirmed", name: "Order Confirmed", audience: "creator", priority: "high", channel: "in_app", category: "orders", retries: 3, throttle: null, requiredData: ["orderId"], template: { subject: "New order {{orderId}}", body: "You received a new order {{orderId}}. View it in your Orders page." } },
  { id: "order.customer_confirmed", name: "Customer Order Confirmation", audience: "customer", priority: "high", channel: "email", category: "orders", retries: 3, throttle: null, requiredData: ["orderId", "productName", "amount", "storeName", "orderStatusUrl"], template: { subject: "Your order {{orderId}} from {{storeName}} confirmed — ₹{{amount}}", body: "Thank you for your purchase!\n\nOrder: {{orderId}}\nProduct: {{productName}}\nAmount: ₹{{amount}}\nStore: {{storeName}}\n\nTrack your order:\n{{orderStatusUrl}}\n\nIf you have questions, contact the seller via their storefront." } },
  { id: "payment.received", name: "Payment Received", audience: "creator", priority: "high", channel: "in_app", category: "payments", retries: 3, throttle: null, requiredData: ["amount"], template: { subject: "Payment received", body: "A payment of ₹{{amount}} was received." } },
  { id: "download.ready", name: "Download Ready", audience: "creator", priority: "medium", channel: "in_app", category: "orders", retries: 2, throttle: null, requiredData: ["orderId"], template: { subject: "Download ready for {{orderId}}", body: "A download link was generated for order {{orderId}}. Share it with your customer." } },
  { id: "shipment.update", name: "Shipping Update", audience: "creator", priority: "medium", channel: "in_app", category: "orders", retries: 2, throttle: null, requiredData: ["orderId", "status"], template: { subject: "Order {{orderId}} is {{status}}", body: "Order {{orderId}} moved to {{status}}." } },

  // ── Subscription / billing ─────────────────────────────────
  { id: "subscription.trial_ending", name: "Trial Ending", audience: "creator", priority: "high", channel: "email", category: "billing", retries: 3, throttle: "1d", requiredData: ["plan", "days"], template: { subject: "Your {{plan}} trial ends soon", body: "Your {{plan}} trial ends in {{days}} day(s). Add a payment method to keep your plan." } },
  { id: "subscription.failed_payment", name: "Failed Payment", audience: "creator", priority: "high", channel: "email", category: "billing", retries: 3, throttle: "1d", requiredData: ["plan"], template: { subject: "Payment failed for {{plan}}", body: "We couldn't charge your {{plan}} subscription. Update your payment method to avoid interruption." } },
  { id: "commission.ready", name: "Commission Ready", audience: "agency", priority: "medium", channel: "in_app", category: "billing", retries: 2, throttle: null, requiredData: ["amount"], template: { subject: "Commission earned", body: "You earned ₹{{amount}} in subscription commission." } },

  // ── Customer success / growth ──────────────────────────────
  { id: "success.first_sale", name: "First Sale", audience: "creator", priority: "high", channel: "in_app", category: "customer_success", retries: 2, throttle: null, requiredData: [], template: { subject: "🎉 First sale!", body: "Congratulations — your first sale! Keep it going." } },
  { id: "success.website_published", name: "Website Published", audience: "creator", priority: "medium", channel: "in_app", category: "website", retries: 2, throttle: null, requiredData: [], template: { subject: "Your website is live", body: "Your website is published and live for visitors." } },

  // ── Partner team (RCCF-54) ─────────────────────────────────
  // Capability-accurate: the role label must never overclaim permissions.
  // The accept URL carries the opaque token — never raw IDs or authorization
  // internals. Expiry is server-derived and rendered for the invitee.
  { id: "team.invitation", name: "Team Invitation", audience: "agency", priority: "high", channel: "email", category: "system", retries: 3, throttle: null, requiredData: ["agencyName", "roleLabel", "acceptUrl", "expiryDate"], template: { subject: `You're invited to join {{agencyName}} on ${BRAND.name}`, body: `You're invited to join {{agencyName}} on ${BRAND.name}.\n\nRole: {{roleLabel}}\n\nAccept invitation:\n{{acceptUrl}}\n\nThis invitation expires on {{expiryDate}}.` } },

  // ── Prospect claim (RCCF-PILOT-02) ──────────────────────────
  // Branded prospect claim email — sent via platform Resend (no tenant
  // verification required). Preview URL is the published storefront; claim URL
  // is the existing /claim-invite?token=&email= flow. After this template is
  // delivered, the agency still retains the manual copy fallback.
  { id: "claim.invitation", name: "Prospect Claim Invitation", audience: "customer", priority: "high", channel: "email", category: "system", retries: 3, throttle: null, requiredData: ["agencyName", "prospectName", "previewUrl", "claimUrl", "expiryDate"], template: { subject: `Your website is ready — claim it on ${BRAND.name}`, body: `Hi {{prospectName}},\n\n{{agencyName}} built you a website on ${BRAND.name}.\n\nPreview your site:\n{{previewUrl}}\n\nClaim your workspace (set your password):\n{{claimUrl}}\n\nThis invitation expires on {{expiryDate}}.\n\nIf you did not expect this, you can ignore this email.` } },

  // ── Admin alerts ───────────────────────────────────────────
  { id: "alert.failed_generation", name: "Failed Generation", audience: "super_admin", priority: "high", channel: "alert", category: "system", retries: 3, throttle: "1h", requiredData: ["error"], template: { subject: "Generation failed", body: "A generation failed: {{error}}." } },
  { id: "alert.webhook_failure", name: "Webhook Failure", audience: "super_admin", priority: "high", channel: "alert", category: "system", retries: 3, throttle: "1h", requiredData: ["error"], template: { subject: "Webhook failure", body: "A webhook failed: {{error}}." } },
  { id: "alert.communication_failure", name: "Communication Failure", audience: "super_admin", priority: "medium", channel: "alert", category: "system", retries: 2, throttle: "1h", requiredData: ["templateId", "error"], template: { subject: "Communication failed", body: "Delivery of {{templateId}} failed: {{error}}." } },
];

export const COMMUNICATION_BY_ID: Record<string, CommunicationDefinition> = Object.fromEntries(
  COMMUNICATION_REGISTRY.map((c) => [c.id, c]),
);
