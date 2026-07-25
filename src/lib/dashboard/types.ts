import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface WidgetProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  footer?: ReactNode;
  children: ReactNode;
  variant?: "default" | "compact";
  className?: string;
}

export interface ActivityIconStyle {
  icon: LucideIcon;
  bg: string;
  color: string;
}

export interface ActivityEntry {
  id: string;
  type: string;
  title: string;
  time: string;
  timestamp: number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

export interface HealthCheckItem {
  label: string;
  done: boolean;
  score: number;
  href: string;
}

export interface HealthScoreResult {
  overall: number;
  checks: HealthCheckItem[];
}

export interface QuickStartStep {
  id: string;
  label: string;
  href: string;
  done: boolean;
  estimatedMinutes: number;
}
