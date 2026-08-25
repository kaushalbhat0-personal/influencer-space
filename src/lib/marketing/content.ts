
export interface CreatorStat {
  label: string;
  value: string;
  description: string;
}

export interface StatItem {
  label: string;
  value: string;
  description?: string;
}

export const CREATOR_STATS: CreatorStat[] = [
  {
    label: "Revenue you keep",
    value: "100%",
    description: "of every sale stays with you — no transaction fees",
  },
  {
    label: "Free trial",
    value: "15 days",
    description: "no credit card required to launch your storefront",
  },
  {
    label: "Platforms you can import from",
    // RCCF-MKT-09 truth fix: the runtime detects exactly six named platforms
    // (YouTube, Instagram, TikTok, X, LinkedIn, Twitch) plus any website URL —
    // the previous "8" was a fabricated statistic.
    value: "6+",
    description: "YouTube, Instagram, TikTok, X, LinkedIn, Twitch, and any website URL",
  },
  {
    label: "Setup time",
    value: "<2 min",
    description: "from profile URL to a live, guided storefront build",
  },
];

export const FEATURES_HERO_DATA = {
  title: "Everything you need to run your creator business",
  subtitle:
    "CreatorStore is more than a website. It's a complete business platform — built from your profile, fully customizable, and built to scale.",
};

export const ABOUT_HERO_DATA = {
  title: "We believe every creator and business deserves a real platform",
  subtitle:
    "CreatorStore was founded to give creators, freelancers, and small businesses the same powerful tools that enterprises have — personalized, automated, and affordable.",
  mission:
    "To democratize online business by making enterprise-grade infrastructure accessible to every creator, freelancer, and business, regardless of size or technical skill.",
  story: [
    "CreatorStore started with a simple observation: creators pour their hearts into content but have no easy way to turn that into a real business. Existing tools were either too complex (build a website from scratch), too limited (link-in-bio pages), or too expensive (enterprise platforms).",
    "We built CreatorStore to bridge that gap. Our platform analyzes your existing content — your videos, posts, style, and audience — and builds a complete business platform tailored to you. Not a template. Not a generic page. A real business, built from your content.",
    "CreatorStore is new, and we grow with the creators who build on it. Every storefront published today runs on the same platform end to end: a website you own, commerce when you want it, and a dashboard that keeps everything in one place. We're building the infrastructure we wished every creator had from day one.",
  ],
  values: [
    {
      title: "Creator First",
      description:
        "Every decision starts with what's best for creators. We build tools we'd want to use ourselves.",
    },
    {
      title: "Automated, Human-Controlled",
      description:
        "The platform handles the heavy lifting, but creators always stay in control. Customize everything, or change nothing.",
    },
    {
      title: "Simple by Default, Powerful When Needed",
      description:
        "Our platform works out of the box, but scales with you as your business grows. From solo creator to agency.",
    },
    {
      title: "India-Ready, Global-Ready",
      description:
        "Built for India with UPI and INR pricing — and designed for creators and businesses everywhere.",
    },
  ],
};

export const FAQ_CATEGORIES = [
  {
    id: "getting-started",
    label: "Getting Started",
    items: [
      {
        q: "How does my storefront get built?",
        a: "Paste your YouTube, Instagram, or creator profile URL. We analyze your content, brand colors, niche, audience, and social links — then build a complete storefront with products, checkout, and SEO. No manual entry needed.",
      },
      {
        q: "What platforms do you support?",
        a: "YouTube, Instagram, TikTok, X (Twitter), LinkedIn, Twitch, and any website URL. If your content lives online, CreatorStore can work with it.",
      },
      {
        q: "How long does it take to get started?",
        a: "From pasting your URL to having a live storefront, most creators are up and running in under 2 minutes. The build takes about 30-60 seconds.",
      },
      {
        q: "Do I need technical skills?",
        a: "Not at all. CreatorStore is designed for creators who want to focus on content, not code. The platform builds everything automatically, and the visual builder lets you customize without touching HTML or CSS.",
      },
    ],
  },
  {
    id: "storefront",
    label: "Storefront & Builder",
    items: [
      {
        q: "What does the platform build?",
        a: "It builds a complete storefront including: hero section, product pages, navigation, checkout flow, color scheme based on your brand, SEO metadata, social links, and content layout optimized for your niche.",
      },
      {
        q: "Can I customize the generated storefront?",
        a: "Yes. The visual drag-and-drop builder lets you rearrange sections, change themes, edit content, add products, and customize every detail. Changes preview in real time.",
      },
      {
        q: "Can I use my own domain?",
        a: "Yes — on Creator Scale, Enterprise, and higher-tier Partner plans, with free SSL. Launch and Growth use a CreatorStore subdomain for free.",
      },
      {
        q: "Is the storefront mobile-friendly?",
        a: "Yes. Every storefront is fully responsive and optimized for mobile devices. Your storefront will look great on phones, tablets, and desktops.",
      },
    ],
  },
  {
    id: "products",
    label: "Products & Payments",
    items: [
      {
        q: "What can I sell?",
        a: "Digital products (ebooks, templates, presets), physical merchandise, services and bookings, and affiliate links. Courses can be showcased on your storefront.",
      },
      {
        q: "How do payments work?",
        a: "CreatorStore uses Razorpay for payment processing. Your customers can pay via UPI (BHIM, Google Pay, PhonePe, Paytm), credit/debit cards, net banking, and wallets. Payouts go directly to your linked account.",
      },
      {
        q: "What does it cost to sell?",
        a: "Creators keep 100% of every sale. CreatorStore never takes a transaction fee — you pay for your plan, and every rupee your customers spend goes to you. See the pricing page for current plan rates.",
      },
      {
        q: "Can I offer subscriptions or memberships?",
        a: "Memberships and subscriptions are on our roadmap and not yet available. You can showcase membership tiers and recurring offers on your storefront today.",
      },
    ],
  },
  {
    id: "agency",
    label: "Agency Features",
    items: [
      {
        q: "Can agencies use CreatorStore?",
        a: "Yes. Partner plans support multi-client workspaces, team collaboration, and agency revenue insights. Generate storefronts for clients in minutes. On Scale and Enterprise plans you can also configure white-label branding (colors, logo, support details) shown on your branded client preview portal.",
      },
      {
        q: "Can I white-label CreatorStore?",
        a: "On Scale and Enterprise plans you can configure your agency's branding — colors, logo, and support details — which is shown on your branded client preview portal. A fully client-facing custom-branded dashboard is on the roadmap but not yet available.",
      },
      {
        q: "How does client management work?",
        a: "Each client gets their own workspace with an isolated storefront, products, and orders. You manage clients and track your recurring commission from a single dashboard.",
      },
    ],
  },
  {
    id: "account",
    label: "Account & Billing",
    items: [
      {
        q: "Can I switch plans later?",
        a: "Upgrade or downgrade anytime. Your data, products, and settings stay exactly as they are. Changes take effect immediately.",
      },
      {
        q: "Who owns my content and data?",
        a: "You do. Your content, products, customer data, and storefront are yours. You can export your data and cancel anytime. We never claim ownership of your content.",
      },
      {
        q: "Is there a free trial?",
        a: "Yes. Creator Launch is a 15-day free trial — no credit card required. Launch your website today and upgrade anytime. After the trial, your site stays live; editing and publishing follow your plan.",
      },
      {
        q: "How do refunds work?",
        a: "You can cancel your subscription anytime. Order refunds for physical products are handled on a case-by-case basis. Digital product refunds follow our refund policy. Standard refund processing takes 7-10 business days.",
      },
    ],
  },
];
