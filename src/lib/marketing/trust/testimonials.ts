import type { TrustTestimonial } from "./types";

const PLACEHOLDER_AVATAR = "/placeholder-avatar.svg";

export const SEED_TESTIMONIALS: TrustTestimonial[] = [
  {
    id: "t-1",
    name: "Priya Sharma",
    role: "Fitness Creator",
    avatar: PLACEHOLDER_AVATAR,
    platform: "Instagram",
    category: "Fitness",
    quote:
      "CreatorStore built my entire storefront from my Instagram in under 2 minutes. I was selling workout plans within an hour. The AI got my brand colors and style perfectly.",
    businessOutcome: "First sale within 1 hour of signup",
    rating: 5,
    featured: true,
  },
  {
    id: "t-2",
    name: "Arun Kumar",
    role: "Tech YouTuber",
    avatar: PLACEHOLDER_AVATAR,
    platform: "YouTube",
    category: "Technology",
    quote:
      "I've been on YouTube for 3 years and always wanted a website that felt like me. CreatorStore analyzed my channel and built a storefront that matched my video style. My merch sales went up 3x.",
    businessOutcome: "3x merch sales in first month",
    revenue: "₹1.2L/month",
    rating: 5,
    featured: true,
  },
  {
    id: "t-3",
    name: "Neha Patel",
    role: "Digital Artist",
    avatar: PLACEHOLDER_AVATAR,
    platform: "Instagram",
    category: "Art & Design",
    quote:
      "The drag-and-drop builder is incredible. I rearranged everything exactly how I wanted without touching code. UPI payments make checkout seamless for my Indian audience.",
    businessOutcome: "Zero-code storefront launch",
    rating: 5,
    featured: true,
  },
  {
    id: "t-4",
    name: "Rahul Verma",
    role: "Course Creator",
    avatar: PLACEHOLDER_AVATAR,
    platform: "YouTube",
    category: "Education",
    quote:
      "I was paying for a separate website builder, course platform, and payment processor. CreatorStore replaced all three. The AI-generated SEO made my course pages rank within weeks.",
    businessOutcome: "Replaced 3 tools with one platform",
    revenue: "₹85K/month",
    rating: 5,
    featured: false,
  },
  {
    id: "t-5",
    name: "Divya Iyer",
    role: "Lifestyle Creator",
    avatar: PLACEHOLDER_AVATAR,
    platform: "Instagram",
    category: "Lifestyle",
    quote:
      "The analytics dashboard showed me exactly which products sell best, where my traffic comes from, and how my storefront performs. It's like having a business partner that never sleeps.",
    businessOutcome: "Data-driven product decisions",
    rating: 4,
    featured: false,
  },
  {
    id: "t-6",
    name: "Vikram Singh",
    role: "Agency Owner",
    avatar: PLACEHOLDER_AVATAR,
    platform: "Agency",
    category: "Agency",
    quote:
      "We manage 15 creator clients and CreatorStore's agency platform is a game-changer. White-label dashboards and the ability to generate storefronts in minutes dropped our onboarding time from weeks to hours.",
    businessOutcome: "Client onboarding reduced from weeks to hours",
    rating: 5,
    featured: false,
  },
  {
    id: "t-7",
    name: "Anjali Desai",
    role: "Yoga Instructor",
    avatar: PLACEHOLDER_AVATAR,
    platform: "YouTube",
    category: "Health & Wellness",
    quote:
      "My students kept asking where they could book sessions and buy my guides. CreatorStore gave me a professional website with booking, payments, and digital products — all from my YouTube channel URL.",
    businessOutcome: "Automated booking + payments",
    rating: 5,
    featured: false,
  },
  {
    id: "t-8",
    name: "Karan Mehta",
    role: "Podcaster",
    avatar: PLACEHOLDER_AVATAR,
    platform: "YouTube",
    category: "Entertainment",
    quote:
      "I needed a way to sell merch and accept donations without sounding like I was begging. CreatorStore made it professional. My storefront looks like a real brand, not a link-in-bio page.",
    businessOutcome: "Professional brand presence",
    revenue: "₹40K/month",
    rating: 4,
    featured: false,
  },
];
