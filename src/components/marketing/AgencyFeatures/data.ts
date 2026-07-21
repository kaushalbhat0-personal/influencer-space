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
      { icon: Shield, title: "Permissions", body: "Control what each team member can edit per client." },
      { icon: UserCheck, title: "Team Members", body: "Grow your agency. Add staff with seat-based billing." },
    ],
  },
  {
    id: "operate",
    label: "Operate",
    description: "Build, customize, and publish for every client.",
    items: [
      { icon: Pencil, title: "Builder Access", body: "Edit any client website with the visual builder." },
      { icon: Rocket, title: "Publishing", body: "Publish updates instantly. Roll back anytime." },
      { icon: CheckSquare, title: "Approvals", body: "Send previews. Get client sign-off before going live." },
      { icon: Store, title: "Store Management", body: "Manage products, orders, and inventory per client." },
    ],
  },
  {
    id: "grow",
    label: "Grow",
    description: "Track performance across your entire portfolio.",
    items: [
      { icon: BarChart3, title: "Cross-Client Analytics", body: "Compare revenue, traffic, and conversion across creators." },
      { icon: IndianRupee, title: "Revenue Splitting", body: "Automated splits. Razorpay Route handles the math." },
      { icon: TrendingUp, title: "Performance Reports", body: "Export-ready reports for client reviews." },
      { icon: FileText, title: "White-Label", body: "Your agency brand on every dashboard and report." },
    ],
  },
];
