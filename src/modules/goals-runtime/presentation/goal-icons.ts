"use client";

import {
  CalendarCheck, ShoppingBag, BookOpen, Briefcase, Mail, MonitorPlay,
  Users, Images, Target, CalendarClock, Handshake, Palette,
  ShieldCheck, Coins, type LucideIcon,
} from "lucide-react";

export const GOAL_ICONS: Record<string, LucideIcon> = {
  CalendarCheck,
  ShoppingBag,
  BookOpen,
  Briefcase,
  Mail,
  MonitorPlay,
  Users,
  Images,
  Target,
  CalendarClock,
  Handshake,
  Palette,
  ShieldCheck,
  Coins,
};

export function goalIcon(name: string): LucideIcon {
  return GOAL_ICONS[name] ?? Target;
}
