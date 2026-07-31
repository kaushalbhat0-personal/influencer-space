import { Store, User, GraduationCap, Briefcase, Building2, Utensils, Dumbbell, BookOpen, Camera, Code, Palette, Music, Pen, PenTool, Rocket } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface BusinessCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  suggestedOfferTypes: string[];
  suggestedPages: string[];
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { id: "creator", label: "Creator", icon: User, suggestedOfferTypes: ["digital_download", "membership", "consultation"], suggestedPages: ["home", "products", "about", "contact"] },
  { id: "coach", label: "Coach", icon: GraduationCap, suggestedOfferTypes: ["course", "consultation", "membership"], suggestedPages: ["home", "services", "about", "contact"] },
  { id: "consultant", label: "Consultant", icon: Briefcase, suggestedOfferTypes: ["consultation", "service", "course"], suggestedPages: ["home", "services", "about", "contact"] },
  { id: "freelancer", label: "Freelancer", icon: Pen, suggestedOfferTypes: ["service", "consultation", "digital_download"], suggestedPages: ["home", "services", "portfolio", "contact"] },
  { id: "agency", label: "Agency", icon: Building2, suggestedOfferTypes: ["service", "consultation", "retainer"], suggestedPages: ["home", "services", "about", "contact"] },
  { id: "restaurant", label: "Restaurant", icon: Utensils, suggestedOfferTypes: ["booking", "gift_card", "physical_product"], suggestedPages: ["home", "menu", "about", "contact"] },
  { id: "fitness", label: "Gym / Fitness", icon: Dumbbell, suggestedOfferTypes: ["membership", "booking", "digital_download"], suggestedPages: ["home", "services", "about", "contact"] },
  { id: "teacher", label: "Teacher", icon: BookOpen, suggestedOfferTypes: ["course", "digital_download", "consultation"], suggestedPages: ["home", "courses", "about", "contact"] },
  { id: "photographer", label: "Photographer", icon: Camera, suggestedOfferTypes: ["service", "digital_download", "physical_product"], suggestedPages: ["home", "portfolio", "about", "contact"] },
  { id: "developer", label: "Developer", icon: Code, suggestedOfferTypes: ["service", "digital_download", "consultation"], suggestedPages: ["home", "services", "portfolio", "contact"] },
  { id: "designer", label: "Designer", icon: Palette, suggestedOfferTypes: ["service", "digital_download", "consultation"], suggestedPages: ["home", "portfolio", "services", "contact"] },
  { id: "musician", label: "Musician", icon: Music, suggestedOfferTypes: ["digital_download", "membership", "physical_product"], suggestedPages: ["home", "music", "about", "contact"] },
  { id: "artist", label: "Artist", icon: PenTool, suggestedOfferTypes: ["digital_download", "physical_product", "commission"], suggestedPages: ["home", "gallery", "about", "contact"] },
  { id: "author", label: "Author", icon: BookOpen, suggestedOfferTypes: ["digital_download", "course", "membership"], suggestedPages: ["home", "books", "about", "contact"] },
  { id: "startup", label: "Startup", icon: Rocket, suggestedOfferTypes: ["service", "consultation", "saas"], suggestedPages: ["home", "product", "about", "contact"] },
  { id: "other", label: "Other", icon: Store, suggestedOfferTypes: ["service", "digital_download", "physical_product"], suggestedPages: ["home", "products", "about", "contact"] },
];

export interface OfferType {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  priceHint: string;
}

export const OFFER_TYPES: OfferType[] = [
  { id: "digital_download", label: "Digital Download", description: "E-books, templates, presets, guides", icon: DownloadIcon, priceHint: "e.g. 499" },
  { id: "physical_product", label: "Physical Product", description: "Merch, books, equipment, handcrafted", icon: PackageIcon, priceHint: "e.g. 999" },
  { id: "service", label: "Service", description: "Consulting, coaching, design, development", icon: BriefcaseIcon, priceHint: "e.g. 4999" },
  { id: "course", label: "Course", description: "Online course, workshop, training", icon: GraduationCapIcon, priceHint: "e.g. 2999" },
  { id: "membership", label: "Membership", description: "Paid community, newsletter, subscription", icon: UsersIcon, priceHint: "e.g. 499/month" },
  { id: "consultation", label: "Consultation", description: "1:1 call, session, meeting", icon: PhoneIcon, priceHint: "e.g. 2499" },
  { id: "booking", label: "Booking", description: "Appointment, reservation, class", icon: CalendarIcon, priceHint: "e.g. 999" },
  { id: "community", label: "Community", description: "Paid group, forum, slack/discord", icon: MessageCircleIcon, priceHint: "e.g. 299/month" },
  { id: "event", label: "Event", description: "Workshop, webinar, live show", icon: CalendarCheckIcon, priceHint: "e.g. 1499" },
  { id: "bundle", label: "Bundle", description: "Curated pack of products or services", icon: GiftIcon, priceHint: "e.g. 1999" },
  { id: "gift_card", label: "Gift Card", description: "Store credit, voucher, prepaid", icon: GiftIcon, priceHint: "e.g. 500" },
  { id: "commission", label: "Commission", description: "Custom work, made-to-order", icon: HammerIcon, priceHint: "Starting at 999" },
];

// Import icons for offer types
import { Download as DownloadIcon, Package as PackageIcon, Briefcase as BriefcaseIcon, GraduationCap as GraduationCapIcon, Users as UsersIcon, Phone as PhoneIcon, Calendar as CalendarIcon, MessageCircle as MessageCircleIcon, CalendarCheck as CalendarCheckIcon, Gift as GiftIcon, Hammer as HammerIcon } from "lucide-react";

export interface AcquisitionCapability {
  supportsAvatar: boolean;
  supportsBanner: boolean;
  supportsProducts: boolean;
  supportsServices: boolean;
  supportsSocialLinks: boolean;
  supportsSeo: boolean;
  supportsBranding: boolean;
  supportsAnalytics: boolean;
  supportsMediaImport: boolean;
}

export const FULL_CAPABILITY: AcquisitionCapability = {
  supportsAvatar: true, supportsBanner: true, supportsProducts: true,
  supportsServices: true, supportsSocialLinks: true, supportsSeo: true,
  supportsBranding: true, supportsAnalytics: true, supportsMediaImport: true,
};

export interface BusinessProfile {
  businessName: string;
  ownerName: string;
  category: string;
  industry: string;
  tagline: string;
  description: string;
  audience: string;
  goals: string;
  tone: string;
  offers: BusinessOffer[];
  socialLinks: { platform: string; url: string }[];
  logoUrl?: string;
  coverUrl?: string;
  palette: { primary: string; secondary: string };
  pages: string[];
}

export interface BusinessOffer {
  id: string;
  type: string;
  name: string;
  description: string;
  price: number;
  currency: string;
}

import type { CreatorProfile } from "./types";

/** @deprecated Legacy compatibility — use BusinessProfile directly. */
export function businessProfileToCreatorProfile(profile: BusinessProfile): CreatorProfile {
  return {
    creatorName: profile.ownerName,
    brandName: profile.businessName,
    tagline: profile.tagline,
    bio: profile.description,
    heroTitle: profile.tagline || `Welcome to ${profile.businessName}`,
    aboutText: profile.description,
    tone: profile.tone,
    niche: profile.industry,
    audience: profile.audience,
    products: profile.offers.map((o) => ({ name: o.name, price: o.price, description: o.description })),
    services: profile.offers.filter((o) => ["service", "consultation"].includes(o.type)).map((o) => o.name),
    socialLinks: profile.socialLinks,
    seoTitle: profile.businessName,
    seoDesc: `${profile.businessName} — ${profile.tagline || profile.description?.slice(0, 100) || "Storefront on CreatorStore"}`,
    palette: profile.palette,
    logoUrl: profile.logoUrl,
    faq: [],
    testimonials: [],
    pages: profile.pages,
  };
}

/** Convert legacy CreatorProfile to canonical BusinessProfile. */
export function creatorProfileToBusinessProfile(profile: CreatorProfile): BusinessProfile {
  return {
    businessName: profile.brandName,
    ownerName: profile.creatorName,
    category: "",
    industry: profile.niche,
    tagline: profile.tagline,
    description: profile.bio || profile.aboutText,
    audience: profile.audience,
    goals: "",
    tone: profile.tone,
    offers: profile.products.map((p) => ({
      id: `legacy_${p.name.replace(/\s+/g, "_").toLowerCase()}`,
      type: "service",
      name: p.name,
      description: p.description,
      price: p.price,
      currency: "INR",
    })),
    socialLinks: profile.socialLinks,
    logoUrl: profile.logoUrl,
    palette: profile.palette,
    pages: profile.pages,
  };
}
