
export interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  content: string;
  platform?: string;
  featured?: boolean;
}

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

const PLACEHOLDER_AVATAR = "/placeholder-avatar.svg";

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "testimonial-1",
    name: "Priya Sharma",
    role: "Fitness Creator",
    avatar: PLACEHOLDER_AVATAR,
    content:
      "CreatorStore built my entire storefront from my Instagram in under 2 minutes. I was selling workout plans within an hour. The AI got my brand colors and style perfectly — I barely had to customize anything.",
    platform: "Instagram",
    featured: true,
  },
  {
    id: "testimonial-2",
    name: "Arun Kumar",
    role: "Tech YouTuber",
    avatar: PLACEHOLDER_AVATAR,
    content:
      "I've been on YouTube for 3 years and always wanted a website that felt like me. CreatorStore analyzed my channel and built a storefront that matched my video style. My merch sales went up 3x in the first month.",
    platform: "YouTube",
    featured: true,
  },
  {
    id: "testimonial-3",
    name: "Neha Patel",
    role: "Digital Artist",
    avatar: PLACEHOLDER_AVATAR,
    content:
      "The drag-and-drop builder is incredible. I could rearrange everything exactly how I wanted without touching code. My customers love the clean storefront, and UPI payments make checkout seamless for my Indian audience.",
    platform: "Instagram",
    featured: true,
  },
  {
    id: "testimonial-4",
    name: "Rahul Verma",
    role: "Course Creator",
    avatar: PLACEHOLDER_AVATAR,
    content:
      "I was paying for a separate website builder, course platform, and payment processor. CreatorStore replaced all three. The AI-generated SEO was a bonus — my course pages started ranking within weeks.",
    platform: "YouTube",
  },
  {
    id: "testimonial-5",
    name: "Divya Iyer",
    role: "Lifestyle Creator",
    avatar: PLACEHOLDER_AVATAR,
    content:
      "What surprised me most was the analytics dashboard. I can see exactly which products are selling, where my traffic comes from, and how my storefront performs. It's like having a business partner that never sleeps.",
    platform: "Instagram",
  },
  {
    id: "testimonial-6",
    name: "Vikram Singh",
    role: "Agency Owner",
    avatar: PLACEHOLDER_AVATAR,
    content:
      "We manage 15 creator clients and CreatorStore's agency platform is a game-changer. White-label dashboards, centralized billing, and the ability to generate storefronts for new clients in minutes. Our onboarding time dropped from weeks to hours.",
    platform: "Agency",
  },
];

export const CREATOR_STATS: CreatorStat[] = [
  {
    label: "Storefronts Generated",
    value: "10,000+",
    description: "AI-powered storefronts built from creator content",
  },
  {
    label: "Creators Onboarded",
    value: "5,000+",
    description: "Active creators using CreatorStore daily",
  },
  {
    label: "Platforms Supported",
    value: "8",
    description: "YouTube, Instagram, TikTok, X, LinkedIn, Twitch, and more",
  },
  {
    label: "Setup Time",
    value: "<2 min",
    description: "From profile URL to live storefront",
  },
];

export const FEATURES_HERO_DATA = {
  title: "Everything you need to run your creator business",
  subtitle:
    "CreatorStore is more than a website. It's a complete business platform — AI-generated, fully customizable, and built to scale.",
};

export const ABOUT_HERO_DATA = {
  title: "We believe every creator deserves a real business platform",
  subtitle:
    "CreatorStore was founded to give creators the same powerful tools that enterprises have — personalized, automated, and affordable.",
  mission:
    "To democratize creator commerce by making enterprise-grade business infrastructure accessible to every creator, regardless of size or technical skill.",
  story: [
    "CreatorStore started with a simple observation: creators pour their hearts into content but have no easy way to turn that into a real business. Existing tools were either too complex (build a website from scratch), too limited (link-in-bio pages), or too expensive (enterprise platforms).",
    "We built CreatorStore to bridge that gap. Our AI analyzes your existing content — your videos, posts, style, and audience — and generates a complete business platform tailored to you. Not a template. Not a generic page. A real business, built from your content.",
    "Today, thousands of creators use CreatorStore to sell products, manage orders, grow their audience, and run their entire business — all from one platform. We're proud to be the infrastructure that powers the creator economy.",
  ],
  values: [
    {
      title: "Creator First",
      description:
        "Every decision starts with what's best for creators. We build tools we'd want to use ourselves.",
    },
    {
      title: "AI-Powered, Human-Controlled",
      description:
        "AI handles the heavy lifting, but creators always stay in control. Customize everything, or change nothing.",
    },
    {
      title: "Simple by Default, Powerful When Needed",
      description:
        "Our platform works out of the box, but scales with you as your business grows. From solo creator to agency.",
    },
    {
      title: "India-Ready, Global-Ready",
      description:
        "Built for Indian creators with UPI, INR pricing, and local support — but designed for global scale.",
    },
  ],
};

export const FAQ_CATEGORIES = [
  {
    id: "getting-started",
    label: "Getting Started",
    items: [
      {
        q: "How does the AI build my storefront?",
        a: "Paste your YouTube, Instagram, or creator profile URL. Our AI analyzes your content, brand colors, niche, audience, and social links — then generates a complete storefront with products, checkout, and SEO. No manual entry needed.",
      },
      {
        q: "What platforms do you support?",
        a: "YouTube, Instagram, TikTok, X (Twitter), LinkedIn, Twitch, and any website URL. If your content lives online, CreatorStore can work with it.",
      },
      {
        q: "How long does it take to get started?",
        a: "From pasting your URL to having a live storefront, most creators are up and running in under 2 minutes. The AI generation takes about 30-60 seconds.",
      },
      {
        q: "Do I need technical skills?",
        a: "Not at all. CreatorStore is designed for creators who want to focus on content, not code. The AI generates everything automatically, and the visual builder lets you customize without touching HTML or CSS.",
      },
    ],
  },
  {
    id: "storefront",
    label: "Storefront & Builder",
    items: [
      {
        q: "What does the AI generate?",
        a: "The AI generates a complete storefront including: hero section, product pages, navigation, checkout flow, color scheme based on your brand, SEO metadata, social links, and content layout optimized for your niche.",
      },
      {
        q: "Can I customize the generated storefront?",
        a: "Yes. The visual drag-and-drop builder lets you rearrange sections, change themes, edit content, add products, and customize every detail. Changes preview in real time.",
      },
      {
        q: "Can I use my own domain?",
        a: "Yes. Creator Pro, Elite, and all Agency plans include custom domain support with free SSL. You can also use a CreatorStore subdomain for free.",
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
        a: "Digital products (ebooks, templates, presets), courses, memberships, coaching sessions, physical merchandise, event tickets, donations and tips, and affiliate links.",
      },
      {
        q: "How do payments work?",
        a: "CreatorStore uses Razorpay for payment processing. Your customers can pay via UPI (BHIM, Google Pay, PhonePe, Paytm), credit/debit cards, net banking, and wallets. Payouts go directly to your linked account.",
      },
      {
        q: "What are the transaction fees?",
        a: "The Starter plan has a 10% platform fee per transaction. The Pro plan at Rs.999/month reduces this to 5%. Higher plans have even lower fees. There are no setup fees or hidden charges.",
      },
      {
        q: "Can I offer subscriptions or memberships?",
        a: "Yes. CreatorStore supports recurring payments for memberships, subscriptions, and installment-based courses. Set your own pricing and billing cycles.",
      },
    ],
  },
  {
    id: "agency",
    label: "Agency Features",
    items: [
      {
        q: "Can agencies use CreatorStore?",
        a: "Yes. Agency plans support multi-client workspaces, white-label branding, team collaboration, and centralized analytics. Generate storefronts for clients in minutes.",
      },
      {
        q: "Can I white-label CreatorStore?",
        a: "Yes. Higher-tier agency plans include white-label options — remove CreatorStore branding and present a custom-branded dashboard to your clients.",
      },
      {
        q: "How does client management work?",
        a: "Each client gets their own workspace with isolated storefront, products, orders, and analytics. You control permissions, billing, and can manage everything from a single dashboard.",
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
        q: "Is there a free plan?",
        a: "Yes. The Starter plan is free and includes AI storefront generation, digital products, and basic analytics. Upgrade when you need more features or lower transaction fees.",
      },
      {
        q: "How do refunds work?",
        a: "You can cancel your subscription anytime. Order refunds for physical products are handled on a case-by-case basis. Digital product refunds follow our refund policy. Standard refund processing takes 7-10 business days.",
      },
    ],
  },
];
