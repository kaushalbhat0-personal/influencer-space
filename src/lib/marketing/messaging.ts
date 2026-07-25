export const BRAND = {
  name: "CreatorStore",
  tagline: "Turn your content into a business.",
  shortDescription:
    "AI builds your entire creator business from your social profile.",
  description:
    "CreatorStore is an AI-powered creator business platform. Paste your social profile — YouTube, Instagram, TikTok — and our AI generates a complete business website with storefront, products, checkout, analytics, SEO, and a visual drag-and-drop builder. No coding. No templates. Just your content, transformed.",
  foundingYear: 2024,
  location: "Pune, Maharashtra, India",
  email: "support@influencerspace.in",
  appUrl: undefined as string | undefined,
} as const;

export const POSITIONING = {
  is: "An AI-powered creator business platform that builds, manages, and publishes your entire online business from your existing content.",
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
    id: "ai-understands",
    headline: "AI understands your niche",
    body: "Paste your social profile. Our AI analyzes your content, audience, brand, and niche — then generates a complete business platform tailored to you.",
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
    body: "Sell digital products, courses, memberships, coaching, physical merch, event tickets, and more. Native UPI and card checkout via Razorpay.",
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
    id: "ai-intelligence",
    label: "AI Niche Intelligence",
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
      "Digital products, physical goods, courses, memberships, bookings, and more.",
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
      "Orders, customers, analytics, content, and AI assistant — all in one place.",
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
      "AI-generated from your social profile",
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
      "Courses and coaching",
      "Memberships and subscriptions",
      "Event tickets and bookings",
      "Donations and tips",
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
      "Analytics dashboard",
      "Conversion tracking",
    ],
  },
  {
    category: "Management",
    items: [
      "Orders dashboard",
      "Customer management",
      "Product catalog",
      "Content management",
      "AI assistant",
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
