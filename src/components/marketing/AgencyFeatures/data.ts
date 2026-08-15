import {
  Users, Globe2, Shield, UserCheck,
  Pencil, Rocket, CheckSquare, Store,
  BarChart3, IndianRupee, TrendingUp, FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface WorkflowCard {
  icon: LucideIcon;
  title: string;
  body: string;
}

export interface Pillar {
  id: string;
  label: string;
  description: string;
  items: WorkflowCard[];
}

export const PILLARS: Pillar[] = [
  {
    id: "manage",
    label: "Manage",
    description: "One workspace for every creator you work with.",
    items: [
      { icon: Users, title: "Creator Workspaces", body: "Separate dashboards for every client. No logging in and out." },
      { icon: Globe2, title: "Client Accounts", body: "Invite creators, set permissions, manage access." },
      { icon: Shield, title: "Roles", body: "Agency admin and staff roles for your team." },
      { icon: UserCheck, title: "Team Members", body: "Invite staff as agency team members." },
    ],
  },
  {
    id: "operate",
    label: "Operate",
    description: "Build, customize, and publish for every client.",
    items: [
      { icon: Pencil, title: "Client Overview", body: "View each client's health, products, theme, and publish state." },
      { icon: Rocket, title: "Publish Status", body: "Track live and pending publish state across your clients." },
      { icon: CheckSquare, title: "Client Invitations", body: "Onboard clients with passwordless invitation links." },
      { icon: Store, title: "Client Health", body: "Risk scores and usage across your portfolio." },
    ],
  },
  {
    id: "grow",
    label: "Grow",
    description: "Track performance across your entire portfolio.",
    items: [
      { icon: BarChart3, title: "Agency Insights", body: "Monitor client health, publishing state, and recurring commission." },
      { icon: IndianRupee, title: "Revenue Splitting", body: "Automated commission splits on client subscriptions." },
      { icon: TrendingUp, title: "Settlement & Payouts", body: "Track earnings, settlements, and payouts in one place." },
      { icon: FileText, title: "White-Label", body: "Your agency brand on the branded client preview portal (Scale and above)." },
    ],
  },
];
