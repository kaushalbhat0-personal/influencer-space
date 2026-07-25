import {
  Package, Image as ImageIcon, Globe, Settings, ShoppingBag,
  Link2, Trophy, Gamepad2, MessageSquare, CreditCard, Sparkles,
} from "lucide-react";
import type { ActivityEntry, ActivityIconStyle } from "./types";

export const ACTIVITY_ICON_CONFIG: Record<string, ActivityIconStyle> = {
  product: { icon: ShoppingBag, bg: "bg-s8ul-cyan/10", color: "text-s8ul-cyan" },
  order: { icon: Package, bg: "bg-green-500/10", color: "text-green-400" },
  gallery: { icon: ImageIcon, bg: "bg-purple-500/10", color: "text-purple-400" },
  milestone: { icon: Trophy, bg: "bg-amber-500/10", color: "text-amber-400" },
  game: { icon: Gamepad2, bg: "bg-pink-500/10", color: "text-pink-400" },
  link: { icon: Link2, bg: "bg-blue-500/10", color: "text-blue-400" },
  message: { icon: MessageSquare, bg: "bg-indigo-500/10", color: "text-indigo-400" },
  domain: { icon: Globe, bg: "bg-emerald-500/10", color: "text-emerald-400" },
  billing: { icon: CreditCard, bg: "bg-amber-500/10", color: "text-amber-400" },
  setting: { icon: Settings, bg: "bg-zinc-500/10", color: "text-zinc-400" },
  publish: { icon: Sparkles, bg: "bg-s8ul-cyan/10", color: "text-s8ul-cyan" },
};

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function createActivityEntry(
  id: string,
  type: string,
  title: string,
  timestamp: number
): ActivityEntry {
  const style = ACTIVITY_ICON_CONFIG[type] ?? ACTIVITY_ICON_CONFIG.setting;
  return {
    id,
    type,
    title,
    time: timeAgo(new Date(timestamp)),
    timestamp,
    icon: style.icon,
    iconBg: style.bg,
    iconColor: style.color,
  };
}

export function activityFromAuditAction(action: string): ActivityIconStyle | null {
  if (action.includes("product")) return ACTIVITY_ICON_CONFIG.product;
  if (action.includes("order") || action.includes("payment")) return ACTIVITY_ICON_CONFIG.order;
  if (action.includes("gallery") || action.includes("image")) return ACTIVITY_ICON_CONFIG.gallery;
  if (action.includes("milestone") || action.includes("timeline")) return ACTIVITY_ICON_CONFIG.milestone;
  if (action.includes("domain")) return ACTIVITY_ICON_CONFIG.domain;
  if (action.includes("billing") || action.includes("subscription")) return ACTIVITY_ICON_CONFIG.billing;
  if (action.includes("publish")) return ACTIVITY_ICON_CONFIG.publish;
  if (action.includes("setting") || action.includes("profile")) return ACTIVITY_ICON_CONFIG.setting;
  return null;
}

export function formatAuditAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
