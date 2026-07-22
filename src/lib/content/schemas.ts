import { z } from "zod";

/// Each schema maps directly to Builder component fields — no rendering data.

export const HeroContentSchema = z.object({
  title: z.string().describe("Hero headline — 5-10 words"),
  subtitle: z.string().nullable().describe("Supporting text — 10-20 words"),
  ctaText: z.string().nullable().describe("Primary call-to-action button text"),
  ctaLink: z.string().nullable().describe("CTA destination URL"),
  alignment: z.enum(["left", "center", "right"]).default("center"),
  showLiveBadge: z.boolean().default(false),
});

export const AboutContentSchema = z.object({
  title: z.string().default("About"),
  content: z.string().describe("2-4 sentences about the creator"),
  imageUrl: z.string().nullable(),
});

export const FaqContentSchema = z.object({
  title: z.string().default("FAQ"),
  items: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).min(1).max(20),
});

export const SeoContentSchema = z.object({
  title: z.string().describe("SEO title — 50-60 characters"),
  description: z.string().describe("Meta description — 150-160 characters"),
  keywords: z.array(z.string()).max(10),
});

export const CtaContentSchema = z.object({
  primaryText: z.string().nullable(),
  primaryLink: z.string().nullable(),
  secondaryText: z.string().nullable(),
  secondaryLink: z.string().nullable(),
});

export const NewsletterContentSchema = z.object({
  title: z.string().default("Subscribe"),
  placeholder: z.string().default("Your email"),
  buttonText: z.string().default("Subscribe"),
});

export const TestimonialContentSchema = z.object({
  title: z.string().default("What People Say"),
  items: z.array(z.object({
    quote: z.string(),
    author: z.string(),
    role: z.string().nullable(),
  })).max(10),
});

export const PricingContentSchema = z.object({
  title: z.string().default("Plans"),
  items: z.array(z.object({
    name: z.string(),
    price: z.number(),
    description: z.string().nullable(),
    features: z.array(z.string()),
  })).max(6),
});

export const LinksContentSchema = z.object({
  title: z.string().default("Connect With Me"),
  items: z.array(z.object({
    platform: z.string(),
    url: z.string(),
    label: z.string().nullable(),
  })).max(12),
});

export const ContactContentSchema = z.object({
  title: z.string().default("Get In Touch"),
  email: z.string().nullable(),
  message: z.string().nullable(),
});

export type HeroContent = z.infer<typeof HeroContentSchema>;
export type AboutContent = z.infer<typeof AboutContentSchema>;
export type FaqContent = z.infer<typeof FaqContentSchema>;
export type SeoContent = z.infer<typeof SeoContentSchema>;
export type CtaContent = z.infer<typeof CtaContentSchema>;
export type NewsletterContent = z.infer<typeof NewsletterContentSchema>;
export type TestimonialContent = z.infer<typeof TestimonialContentSchema>;
export type PricingContent = z.infer<typeof PricingContentSchema>;
export type LinksContent = z.infer<typeof LinksContentSchema>;
export type ContactContent = z.infer<typeof ContactContentSchema>;
