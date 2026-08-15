"use client";

import {
  LayoutDashboard, Wand2, Sparkles, Image as ImageIcon, Rss, Trophy, UserCheck,
  HelpCircle, Link2, Gamepad as GamepadIcon, ShoppingBag, Briefcase, BookOpen,
  Package, Users, CalendarDays, Landmark, Layout, Paintbrush, LayoutTemplate,
  Palette, Menu, BarChart3, MessageSquare, Brain, Target, User, Search, Globe,
  CreditCard, Bell, Puzzle, ExternalLink, LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * RCCF-70.6.2 — client-side icon presentation registry.
 *
 * Keys are the Lucide `displayName` values emitted by the server as `iconKey`
 * (see `toNavWire` in `src/lib/capabilities/nav-visibility.ts`). The server
 * projects only key strings; this client module owns the actual icon rendering,
 * so no React component ever crosses the Server → Client boundary.
 */
export const adminNavIconRegistry = {
  LayoutDashboard,
  Wand2,
  Sparkles,
  Image: ImageIcon,
  Rss,
  Trophy,
  UserCheck,
  HelpCircle,
  Link2,
  Gamepad: GamepadIcon,
  ShoppingBag,
  Briefcase,
  BookOpen,
  Package,
  Users,
  CalendarDays,
  Landmark,
  Layout,
  Paintbrush,
  LayoutTemplate,
  Palette,
  Menu,
  BarChart3,
  MessageSquare,
  Brain,
  Target,
  User,
  Search,
  Globe,
  CreditCard,
  Bell,
  Puzzle,
  ExternalLink,
  LogOut,
} as const;

export type AdminNavIconRegistry = typeof adminNavIconRegistry;

export const FALLBACK_NAV_ICON: LucideIcon = Menu;

/** Resolve an iconKey to a Lucide icon, never crashing on an unknown key. */
export function resolveAdminNavIcon(iconKey: string): LucideIcon {
  const icon = adminNavIconRegistry[iconKey as keyof AdminNavIconRegistry];
  return icon ?? FALLBACK_NAV_ICON;
}
