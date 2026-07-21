export interface ComparisonRow {
  id: string;
  label: string;
  without: string;
  with: string;
}

export const COMPARISON: ComparisonRow[] = [
  {
    id: "website",
    label: "Website",
    without: "Separate website builder + hosting",
    with: "AI generates your storefront instantly",
  },
  {
    id: "products",
    label: "Digital Products",
    without: "Gumroad, Teachable, or custom setup",
    with: "Courses, presets, PDFs — all in one place",
  },
  {
    id: "payments",
    label: "Payments",
    without: "Razorpay, Stripe, or UPI — configured manually",
    with: "UPI, cards, net banking — ready out of the box",
  },
  {
    id: "social",
    label: "Social Content",
    without: "Manually updating links in bio every week",
    with: "YouTube and Instagram auto-sync to your storefront",
  },
  {
    id: "analytics",
    label: "Analytics",
    without: "Google Analytics, spreadsheets, guesswork",
    with: "Revenue, visitors, top products — one dashboard",
  },
  {
    id: "domain",
    label: "Branding",
    without: "Free subdomain or expensive custom setup",
    with: "Custom domain, SSL, white-label — included",
  },
  {
    id: "subscriptions",
    label: "Cost",
    without: "₹2,000-5,000+/mo across multiple tools",
    with: "One platform. Start free. Scale when you grow.",
  },
];
