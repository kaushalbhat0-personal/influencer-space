import {
  Globe, Palette, Link2,
  Package, GraduationCap, CreditCard, ClipboardList,
  BarChart3, Search, Sparkles, Mail,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface FeatureCard {
  icon: LucideIcon;
  title: string;
  body: string;
  accent: "indigo" | "amber" | "emerald";
}

export interface Pillar {
  id: string;
  label: string;
  description: string;
  items: FeatureCard[];
}

export const PILLARS: Pillar[] = [
  {
    id: "build",
    label: "Build",
    description: "Your website, your brand. AI handles the heavy lifting.",
    items: [
      { icon: Globe, title: "AI Website", body: "Paste a link. Get a complete, branded storefront.", accent: "amber" },
      { icon: Palette, title: "Branding", body: "Custom colors, fonts, and themes. White-label ready.", accent: "indigo" },
      { icon: Link2, title: "Link in Bio", body: "All your social links, products, and content — one page.", accent: "indigo" },
    ],
  },
  {
    id: "sell",
    label: "Sell",
    description: "Products, courses, checkout — everything to monetize your audience.",
    items: [
      { icon: Package, title: "Products", body: "Sell digital downloads, merch, presets, or PDFs.", accent: "indigo" },
      { icon: GraduationCap, title: "Courses", body: "Host and sell video courses with progress tracking.", accent: "indigo" },
      { icon: CreditCard, title: "Checkout", body: "UPI, cards, net banking. Your fans pay however they want.", accent: "indigo" },
      { icon: ClipboardList, title: "Orders", body: "Track purchases, fulfillment, and customer history.", accent: "indigo" },
    ],
  },
  {
    id: "grow",
    label: "Grow",
    description: "Understand your audience. Make smarter decisions.",
    items: [
      { icon: BarChart3, title: "Analytics", body: "Revenue, visitors, top products — all in real time.", accent: "indigo" },
      { icon: Search, title: "SEO", body: "Auto-generated meta tags, sitemaps, and JSON-LD.", accent: "indigo" },
      { icon: Sparkles, title: "AI Insights", body: "Get recommendations to improve your store performance.", accent: "amber" },
      { icon: Mail, title: "Email", body: "Send newsletters and campaigns to your audience.", accent: "indigo" },
    ],
  },
];
