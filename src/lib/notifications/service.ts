import { platformEventBus } from "@/lib/events";
import type { PlatformEvent, EventType, PlatformEventPayloads } from "@/lib/events";
import type { Notification } from "@/components/layout/NotificationCenter";
import { formatCurrency } from "@/lib/utils";

type EventMapper = (event: PlatformEvent) => Omit<Notification, "id" | "read" | "createdAt"> | null;

const EVENT_NOTIFICATION_MAP: Partial<Record<EventType, EventMapper>> = {
  PaymentCaptured: (e) => {
    const p = e.payload as PlatformEventPayloads["PaymentCaptured"];
    return {
      title: "Payment Received",
      description: `Payment of ${formatCurrency(p.amount / 100)} captured for ${p.planCode}.`,
      action: { label: "View Billing", href: "/admin/billing" },
    };
  },
  WebsitePublished: (e) => {
    const p = e.payload as PlatformEventPayloads["WebsitePublished"];
    return {
      title: "Website Published",
      description: `Website published as version ${p.version}.`,
      action: { label: "View Website", href: p.storefrontUrl },
    };
  },
  CreatorProvisioned: (e) => {
    const p = e.payload as PlatformEventPayloads["CreatorProvisioned"];
    return {
      title: "Creator Provisioned",
      description: `${p.creatorName}'s workspace is ready.`,
      action: { label: "Open Builder", href: "/builder" },
    };
  },
  SubscriptionActivated: (e) => {
    const p = e.payload as PlatformEventPayloads["SubscriptionActivated"];
    return {
      title: "Subscription Active",
      description: `${p.planCode} plan is now active.`,
      action: { label: "View Billing", href: "/admin/billing" },
    };
  },
  SubscriptionCancelled: (e) => {
    const p = e.payload as PlatformEventPayloads["SubscriptionCancelled"];
    return {
      title: "Subscription Cancelled",
      description: `${p.planCode} plan was cancelled.`,
    };
  },
  PartnerAssigned: (e) => {
    const p = e.payload as PlatformEventPayloads["PartnerAssigned"];
    return {
      title: "Client Assigned",
      description: `New client "${p.workspaceName}" assigned to your agency.`,
      action: { label: "View Clients", href: "/agency/clients" },
    };
  },
  CommissionCreated: (e) => {
    const p = e.payload as PlatformEventPayloads["CommissionCreated"];
    return {
      title: "Commission Earned",
      description: `Commission of ${formatCurrency(p.partnerShare / 100)} earned.`,
      action: { label: "View Commission", href: "/agency/analytics" },
    };
  },
  PayoutCreated: (e) => {
    const p = e.payload as PlatformEventPayloads["PayoutCreated"];
    return {
      title: "Payout Initiated",
      description: `Payout of ${formatCurrency(p.amount / 100)} is being processed.`,
      action: { label: "View Payouts", href: "/agency/analytics" },
    };
  },
  PayoutCompleted: (e) => {
    const p = e.payload as PlatformEventPayloads["PayoutCompleted"];
    return {
      title: "Payout Completed",
      description: `Payout of ${formatCurrency(p.amount / 100)} completed.`,
      action: { label: "View Payouts", href: "/agency/analytics" },
    };
  },
  InviteAccepted: (e) => {
    const p = e.payload as PlatformEventPayloads["InviteAccepted"];
    return {
      title: "Invite Accepted",
      description: `${p.email} accepted their invite.`,
    };
  },
};

export class NotificationService {
  private notifications: Notification[] = [];
  private maxNotifications = 100;
  private unsubs: (() => void)[] = [];

  start(): void {
    const entries = Object.entries(EVENT_NOTIFICATION_MAP) as [EventType, EventMapper][];
    for (let i = 0; i < entries.length; i++) {
      const [eventType, mapper] = entries[i];
      const unsub = platformEventBus.subscribe(eventType, (event) => {
        const partial = mapper(event);
        if (!partial) return;
        this.addNotification({
          id: `notif_${event.id}`,
          ...partial,
          read: false,
          createdAt: event.timestamp,
        });
      });
      this.unsubs.push(unsub);
    }
  }

  stop(): void {
    for (let i = 0; i < this.unsubs.length; i++) {
      this.unsubs[i]();
    }
    this.unsubs = [];
  }

  getAll(): Notification[] {
    return [...this.notifications];
  }

  getUnread(): Notification[] {
    return this.notifications.filter((n) => !n.read);
  }

  markAllRead(): void {
    for (let i = 0; i < this.notifications.length; i++) {
      this.notifications[i].read = true;
    }
  }

  markRead(id: string): void {
    const n = this.notifications.find((n) => n.id === id);
    if (n) n.read = true;
  }

  clear(): void {
    this.notifications = [];
  }

  private addNotification(notification: Notification): void {
    this.notifications.unshift(notification);
    if (this.notifications.length > this.maxNotifications) {
      this.notifications.pop();
    }
  }
}

export const notificationService = new NotificationService();
