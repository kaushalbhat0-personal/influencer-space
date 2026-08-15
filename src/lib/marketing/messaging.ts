/** RCCF-LAUNCH-POLISH-05: the ONLY public contact address. Every marketing
 * surface (footer, contact page, legal pages, schema, metadata) uses this. */
export const CONTACT_EMAIL = "info.micronest@gmail.com";

export const BRAND = {
  name: "CreatorStore",
  tagline: "Turn your content into a business.",
  shortDescription:
    "Turn your social profile into a creator business website.",
  description:
    "CreatorStore turns your social profile into a complete creator business website — storefront, products, orders, analytics, SEO, and a visual drag-and-drop builder. Paste your YouTube, Instagram, or TikTok profile and get a storefront that matches your content and brand.",
  foundingYear: 2024,
  location: "Pune, Maharashtra, India",
  email: CONTACT_EMAIL,
  appUrl: undefined as string | undefined,
} as const;

export const POSITIONING = {
  is: "A creator business platform that builds, manages, and publishes your online business from your existing content.",
  isNot: [
    "A template-based website builder",
    "Just a storefront or e-commerce tool",
    "A link-in-bio page",
    "A Shopify alternative",
    "A social media scheduler",
  ],
  tagline: "More than a website. Your entire creator business.",
} as const;

export const VALUE_PROPOSITIONS = [
  {
    id: "profile-storefront",
    headline: "Built from your profile",
    body: "Paste your social profile. We analyze your content, audience, brand, and niche — then build a complete business platform tailored to you.",
  },
  {
    id: "business-ready",
    headline: "Business-ready, not template-based",
    body: "Every storefront is generated from your actual content. Your brand colors, your products, your style. Nothing generic.",
  },
  {
    id: "visual-builder",
    headline: "Visual drag-and-drop builder",
    body: "Customize every detail with the visual builder. Drag sections, change themes, add products, and preview in real time.",
  },
  {
    id: "commerce-built-in",
    headline: "Commerce built in",
    body: "Sell digital products and physical merch, take service bookings, and collect affiliate commissions. UPI and card checkout via Razorpay.",
  },
  {
    id: "own-your-brand",
    headline: "Own your brand",
    body: "Custom domain with free SSL, your own color scheme, no platform branding on higher plans, and full control over your storefront.",
  },
  {
    id: "publish-anywhere",
    headline: "Publish anywhere",
    body: "Publish to your own domain, a CreatorStore subdomain, or your existing website. One click, instantly live.",
  },
  {
    id: "scale-with-agencies",
    headline: "Scale with agencies",
    body: "Multi-client workspaces, white-label branding, team collaboration, revenue splitting, and cross-client analytics.",
  },
] as const;

export const MESSAGING_PILLARS = [
  {
    id: "profile-intelligence",
    label: "Profile Intelligence",
    description:
      "Your storefront is generated from your actual content — not a template.",
  },
  {
    id: "storefront",
    label: "Complete Storefront",
    description:
      "Website, products, checkout, SEO, analytics — everything included.",
  },
  {
    id: "builder",
    label: "Visual Builder",
    description:
      "Drag-and-drop customization with real-time preview and one-click publish.",
  },
  {
    id: "commerce",
    label: "Full Commerce",
    description:
      "Digital products, physical goods, service bookings, and more.",
  },
  {
    id: "brand",
    label: "Your Brand",
    description:
      "Custom domain, white-label options, and full creative control.",
  },
  {
    id: "dashboard",
    label: "Creator Dashboard",
    description:
      "Orders, customers, analytics, and content — all in one place.",
  },
  {
    id: "agency",
    label: "Agency Platform",
    description:
      "Multi-client management, white-label, team collaboration, and centralized analytics.",
  },
] as const;

export const TARGET_AUDIENCES = {
  primary: [
    { label: "YouTubers", niche: "Video creators with engaged audiences" },
    { label: "Instagram Creators", niche: "Visual storytellers and reels creators" },
    { label: "Educators", niche: "Course creators and digital educators" },
    { label: "Coaches", niche: "1:1 and group coaching professionals" },
    { label: "Consultants", niche: "Service providers and expert consultants" },
    { label: "Streamers", niche: "Live streamers and gaming creators" },
    { label: "Designers", niche: "Digital artists and creative professionals" },
    { label: "Artists", niche: "Musicians, illustrators, and visual artists" },
  ],
  secondary: [
    { label: "Agencies", niche: "Multi-client creator management" },
    { label: "Freelancers", niche: "Independent service providers" },
    { label: "Talent Managers", niche: "Creator representation and management" },
    { label: "Creator Studios", niche: "Production houses and creative studios" },
  ],
} as const;

export const PLATFORM_CAPABILITIES = [
  {
    category: "Storefront",
    items: [
      "Generated from your social profile",
      "Custom domain with free SSL",
      "Mobile-responsive design",
      "SEO optimized structure",
      "Fast loading and secure",
    ],
  },
  {
    category: "Products",
    items: [
      "Digital downloads",
      "Physical merchandise",
      "Service bookings",
      "Affiliate links",
    ],
  },
  {
    category: "Payments",
    items: [
      "UPI (BHIM, Google Pay, PhonePe, Paytm)",
      "Credit and debit cards",
      "Net banking and wallets",
      "Instant payouts",
      "Secure via Razorpay",
    ],
  },
  {
    category: "Marketing",
    items: [
      "SEO optimization",
      "Email capture forms",
      "Social media integration",
      "Order analytics",
    ],
  },
  {
    category: "Management",
    items: [
      "Orders dashboard",
      "Customer management",
      "Product catalog",
      "Content management",
    ],
  },
  {
    category: "Builder",
    items: [
      "Visual drag-and-drop editor",
      "Section-based layout",
      "Theme customization",
      "Real-time preview",
      "One-click publishing",
    ],
  },
  {
    category: "Agency",
    items: [
      "Multi-client workspaces",
      "White-label branding",
      "Team collaboration",
      "Revenue splitting",
      "Cross-client analytics",
    ],
  },
] as const;

export const HERO_OUTPUT_LINES = [
  "Website",
  "Storefront",
  "Products",
  "SEO",
  "Analytics",
  "Builder",
  "Payments",
  "Publishing",
] as const;

export const SOCIAL_PROOF_STATS = {
  storefrontsGenerated: "10,000+",
  creatorsOnboarded: "5,000+",
  processingSpeed: "Under 2 minutes",
  supportedPlatforms: "8",
  paymentProcessing: "Razorpay",
  availability: "99.9% uptime",
} as const;
