/**
 * RCCF-07 — Realistic Template Website: Northstar Studio
 *
 * Creates ONE polished fictional demo website using the EXISTING production
 * rendering pipeline (no second pipeline, no special-case renderer).
 *
 * Tenant: northstar (subdomain "northstar")
 * Template: northstar (hero, services, products, gallery, testimonials,
 *           timeline, faq, contact, newsletter, footer)
 *
 * Run:  npx tsx scripts/seed-northstar.ts
 * Idempotent — re-running wipes and recreates pages + content for that tenant.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";

loadEnvConfig(process.cwd());

const SUBDOMAIN = "northstar";
const TENANT_NAME = "Northstar Studio";
const OWNER_EMAIL = "northstar@northstar.studio";

const HERO_IMAGE = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&h=900&fit=crop";
const HERO_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const HERO_POSTER = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&h=900&fit=crop";

const GALLERY_IMAGES = [
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1497366811353-253cc3d1f26b?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1496171367470-9ed9a570523a?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1497366846888-55c62fa6c9f0?w=800&h=800&fit=crop",
];

const PRODUCT_IMAGES = [
  "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=600&fit=crop",
];

async function main() {
  const url = process.env.DATABASE_URL || process.env.DIRECT_URL || "";
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  // ── Tenant + User ───────────────────────────────────────────────────────
  let tenant = await prisma.tenant.findUnique({ where: { subdomain: SUBDOMAIN } });
  if (!tenant) {
    tenant = await prisma.tenant.create({ data: { name: TENANT_NAME, subdomain: SUBDOMAIN } });
    console.log(`Tenant created: ${tenant.name} (${tenant.id})`);
  } else {
    console.log(`Tenant exists: ${tenant.name}`);
    await prisma.tenant.update({ where: { id: tenant.id }, data: { name: TENANT_NAME } });
  }

  let user = await prisma.user.findFirst({ where: { email: OWNER_EMAIL } });
  if (!user) {
    const password = await bcrypt.hash("northstar123", 12);
    user = await prisma.user.create({
      data: { name: "Northstar Studio", email: OWNER_EMAIL, password, tenantId: tenant.id },
    });
    console.log(`User created: ${OWNER_EMAIL} / northstar123`);
  } else if (user.tenantId !== tenant.id) {
    await prisma.user.update({ where: { id: user.id }, data: { tenantId: tenant.id } });
  }

  // Workspace for publishing gate
  let workspace = await prisma.workspace.findUnique({ where: { tenantId: tenant.id } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        slug: SUBDOMAIN,
        name: TENANT_NAME,
        type: "TENANT",
        tenantId: tenant.id,
        onboardingCompleted: true,
      },
    });
    console.log(`Workspace created: ${workspace.slug}`);
  }

  // ── Website ─────────────────────────────────────────────────────────────
  let website = await prisma.website.findUnique({ where: { tenantId: tenant.id } });
  if (!website) {
    website = await prisma.website.create({
      data: {
        tenantId: tenant.id,
        themePackageId: "com.creatos.neon-dark",
        themeColors: {},
        themeFonts: { heading: "Inter", body: "Inter" },
        themeConfig: {},
      },
    });
    console.log(`Website created: ${website.id}`);
  } else {
    await prisma.website.update({
      where: { id: website.id },
      data: {
        themePackageId: "com.creatos.neon-dark",
        themeColors: {},
        themeFonts: { heading: "Inter", body: "Inter" },
      },
    });
  }

  // Ensure publishStatus exists
  await prisma.publishStatus.upsert({
    where: { websiteId: website.id },
    create: { websiteId: website.id, state: "draft" },
    update: {},
  });

  // ── Brand ───────────────────────────────────────────────────────────────
  await prisma.brand.upsert({
    where: { websiteId: website.id },
    create: {
      websiteId: website.id,
      name: TENANT_NAME,
      tagline: "Design that moves your business forward.",
      bio: "Northstar Studio creates digital experiences, visual systems, and products for ambitious modern brands. Strategy, design, and systems — delivered with clarity.",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
      bannerUrl: HERO_IMAGE,
      socialLinks: [
        { platform: "instagram", url: "https://instagram.com/northstar.studio" },
        { platform: "twitter", url: "https://twitter.com/northstarstudio" },
        { platform: "linkedin", url: "https://linkedin.com/company/northstar-studio" },
        { platform: "dribbble", url: "https://dribbble.com/northstar" },
        { platform: "whatsapp", url: "https://wa.me/919876543210" },
      ],
    },
    update: {
      name: TENANT_NAME,
      tagline: "Design that moves your business forward.",
      bio: "Northstar Studio creates digital experiences, visual systems, and products for ambitious modern brands. Strategy, design, and systems — delivered with clarity.",
    },
  });

  // ── Page Layout: Northstar template ────────────────────────────────────
  await prisma.page.deleteMany({ where: { websiteId: website.id } });
  const page = await prisma.page.create({
    data: {
      websiteId: website.id,
      name: "Home",
      slug: "/",
      order: 0,
      isHome: true,
      theme: "com.creatos.neon-dark",
      config: {},
    },
  });

  const SECTIONS: { name: string; moduleId: string; config?: Record<string, unknown> }[] = [
    { name: "Hero", moduleId: "hero.default" },
    { name: "Services", moduleId: "services.default", config: { columns: 3 } },
    { name: "Products", moduleId: "products.grid", config: { columns: 3 } },
    { name: "Gallery", moduleId: "gallery.grid", config: { columns: 3 } },
    { name: "Testimonials", moduleId: "testimonials.default", config: { columns: 3 } },
    { name: "Timeline", moduleId: "timeline.default" },
    { name: "FAQ", moduleId: "faq.default" },
    { name: "Contact", moduleId: "contact.default" },
    { name: "Newsletter", moduleId: "newsletter.default" },
    { name: "Footer", moduleId: "footer.default", config: { copyright: "© 2026 Northstar Studio — Crafted for ambitious brands. All rights reserved." } },
  ];

  for (let i = 0; i < SECTIONS.length; i++) {
    const sec = SECTIONS[i];
    const section = await prisma.section.create({
      data: {
        pageId: page.id,
        name: sec.name,
        order: i,
        visible: true,
        locked: false,
        config: (sec.config ?? {}) as never,
      },
    });
    await prisma.block.create({
      data: {
        sectionId: section.id,
        moduleId: sec.moduleId,
        order: 0,
        visible: true,
        locked: false,
        config: (sec.config ?? {}) as never,
      },
    });
  }
  console.log(`Layout: ${SECTIONS.length} sections (Northstar)`);

  // ── Navigation (Setting "navigation") ──────────────────────────────────
  const navItems = [
    { id: "hero", label: "Home", href: "#hero", type: "anchor", order: 0, visible: true, generatedFromSection: "hero" },
    { id: "services", label: "Services", href: "#services", type: "anchor", order: 1, visible: true, generatedFromSection: "services" as string },
    { id: "products", label: "Products", href: "#products", type: "anchor", order: 2, visible: true, generatedFromSection: "products" },
    { id: "gallery", label: "Work", href: "#gallery", type: "anchor", order: 3, visible: true, generatedFromSection: "gallery" },
    { id: "timeline", label: "About", href: "#timeline", type: "anchor", order: 4, visible: true, generatedFromSection: "timeline" },
    { id: "faq", label: "FAQ", href: "#faq", type: "anchor", order: 5, visible: true, generatedFromSection: "faq" },
    { id: "contact", label: "Contact", href: "#contact", type: "anchor", order: 6, visible: true, generatedFromSection: "contact" },
  ];
  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: "navigation" } },
    create: { tenantId: tenant.id, key: "navigation", value: navItems as never },
    update: { value: navItems as never },
  });
  console.log(`Navigation: ${navItems.length} items`);

  // ── Hero + SEO Settings ────────────────────────────────────────────────
  const upsertSetting = async (key: string, value: unknown) => {
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key } },
      create: { tenantId: tenant.id, key, value: value as never },
      update: { value: value as never },
    });
  };

  await upsertSetting("hero_data", {
    title: "Design that moves your business forward.",
    subtitle: "Northstar Studio",
    tagline: "Design that moves your business forward.",
    name: "Northstar Studio",
    description: "Northstar Studio creates digital experiences, visual systems, and products for ambitious modern brands. We blend strategy, craft, and systems thinking to ship work that earns attention and drives growth.",
    bio: "Northstar Studio creates digital experiences, visual systems, and products for ambitious modern brands.",
    profilePictureUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    ctaText: "Start a Project",
    ctaLink: "#contact",
    ctaSecondaryText: "View Work",
    ctaSecondaryLink: "#gallery",
    showLiveBadge: false,
    liveBadgeText: "Available for new projects",
    imageUrl: HERO_IMAGE,
    posterUrl: HERO_POSTER,
    backgroundUrl: HERO_IMAGE,
    videoUrl: HERO_VIDEO,
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/northstar.studio", label: "Instagram" },
      { platform: "twitter", url: "https://twitter.com/northstarstudio", label: "X / Twitter" },
      { platform: "linkedin", url: "https://linkedin.com/company/northstar-studio", label: "LinkedIn" },
      { platform: "dribbble", url: "https://dribbble.com/northstar", label: "Dribbble" },
      { platform: "whatsapp", url: "https://wa.me/919876543210", label: "WhatsApp" },
    ],
    videoDesktopAlignment: "center",
    videoMobileAlignment: "center",
    imageDesktopAlignment: "center",
    imageMobileAlignment: "center",
  });
  console.log("Hero: Northstar content");

  // RCCF-07A — Shared site social links (site_social_links) and Footer-owned config (footer_config)
  // Hero CTAs (Start a Project / View Work) do NOT become footer links.
  await upsertSetting("site_social_links", [
    { platform: "instagram", url: "https://instagram.com/northstar.studio", label: "Instagram" },
    { platform: "twitter", url: "https://twitter.com/northstarstudio", label: "X / Twitter" },
    { platform: "linkedin", url: "https://linkedin.com/company/northstar-studio", label: "LinkedIn" },
    { platform: "dribbble", url: "https://dribbble.com/northstar", label: "Dribbble" },
    { platform: "whatsapp", url: "https://wa.me/919876543210", label: "WhatsApp" },
  ]);
  await upsertSetting("footer_config", {
    description: "Northstar Studio creates digital experiences, visual systems, and products for ambitious modern brands. Strategy, design, and systems — delivered with clarity.",
    copyright: "© 2026 Northstar Studio — Crafted for ambitious brands. All rights reserved.",
    columns: [
      { title: "Products", links: [{ label: "Templates", href: "#products" }, { label: "Design Assets", href: "#products" }, { label: "Brand Kits", href: "#products" }, { label: "All Products", href: "#products" }] },
      { title: "Services", links: [{ label: "Brand Strategy", href: "#services" }, { label: "Web Design", href: "#services" }, { label: "Product Design", href: "#services" }, { label: "Creative Direction", href: "#services" }] },
      { title: "Company", links: [{ label: "About", href: "#timeline" }, { label: "Gallery / Work", href: "#gallery" }, { label: "Testimonials", href: "#testimonials" }, { label: "Contact", href: "#contact" }] },
      { title: "Support", links: [{ label: "FAQ", href: "#faq" }, { label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }, { label: "Refunds", href: "/refund" }] },
    ],
  });
  console.log("Footer: site_social_links + footer_config (Footer-owned, Hero CTA isolated)");

  await upsertSetting("seo", {
    title: "Northstar Studio — Design that moves your business forward",
    description: "Northstar Studio is a modern creative studio building digital experiences, visual systems, and products for ambitious brands. Explore our work, products, and services.",
  });

  // ── Testimonials ────────────────────────────────────────────────────────
  await upsertSetting("testimonials", [
    { id: "t1", author: "Aisha Khan", role: "Founder, Bloom & Branch", content: "Northstar rebuilt our entire brand system in 6 weeks. The strategy was sharp, the delivery was flawless, and our conversion jumped 42% after launch.", rating: 5, featured: true, category: "general" },
    { id: "t2", author: "Marcus Chen", role: "CEO, Atlas Labs", content: "The team feels like an extension of ours. They challenged our assumptions, simplified our product story, and shipped a design system our engineers love.", rating: 5, featured: true, category: "general" },
    { id: "t3", author: "Sofia Rivera", role: "Marketing Lead, Evergreen", content: "From discovery to launch, every step was clear and collaborative. Our new site finally matches the ambition of our product — and it shows in the numbers.", rating: 5, featured: false, category: "general" },
  ]);

  // ── FAQ ─────────────────────────────────────────────────────────────────
  await upsertSetting("faq", [
    { id: "f1", question: "What does Northstar Studio specialize in?", answer: "We specialize in brand strategy, web design, product design, and creative direction for modern companies — from early-stage startups to scaling teams.", category: "general" },
    { id: "f2", question: "How long does a typical project take?", answer: "Brand sprints run 3–4 weeks. Full website builds are 6–8 weeks including discovery, design, and implementation. Product design engagements are scoped in phases.", category: "general" },
    { id: "f3", question: "Do you work with startups or only established brands?", answer: "Both. About half our clients are seed-to-Series B startups; the other half are established teams repositioning for their next chapter. The process adapts to your stage.", category: "general" },
    { id: "f4", question: "What’s included in a Brand Kit?", answer: "Our Brand Kits include logo systems, color and typography scales, iconography, brand guidelines, and ready-to-use templates for pitch decks and social.", category: "general" },
    { id: "f5", question: "How do we start a project?", answer: "Reach out via the contact form. We’ll schedule a discovery call, map your goals, and send a clear proposal with scope, timeline, and fixed pricing — no surprises.", category: "general" },
    { id: "f6", question: "Can you integrate with our existing engineering team?", answer: "Yes — we ship design systems with coded components, tokens, and handoff docs. We work directly in your stack or alongside your engineers.", category: "general" },
  ]);

  // ── Gallery (GalleryImage) ─────────────────────────────────────────────
  await prisma.galleryImage.deleteMany({ where: { tenantId: tenant.id } });
  const galleryTitles = [
    "Brand system for Bloom & Branch",
    "Atlas Labs — product design sprint",
    "Editorial system for Evergreen",
    "Northstar Design Tokens — Figma library",
    "E-commerce experience for Archive",
    "Motion study — launch sequence",
    "Brand photography direction",
    "Pitch deck system — Series A kit",
    "Behind the scenes — studio session",
  ];
  await prisma.galleryImage.createMany({
    data: galleryTitles.map((title, i) => ({
      tenantId: tenant.id,
      title,
      description: `Case study ${i + 1} — a Northstar collaboration built for ambitious modern brands.`,
      altText: title,
      imageUrl: GALLERY_IMAGES[i % GALLERY_IMAGES.length] ?? GALLERY_IMAGES[0],
      mediaType: i === 5 ? "video" : "image",
      videoUrl: i === 5 ? HERO_VIDEO : null,
      category: "general",
      order: i,
      isFeatured: i < 3,
    })),
  });
  console.log(`Gallery: ${galleryTitles.length} items (1 video)`);

  // ── Products (6+) ───────────────────────────────────────────────────────
  await prisma.product.deleteMany({ where: { tenantId: tenant.id } });
  const products = [
    { name: "Bloom Brand Kit", description: "Complete brand kit with logo system, palette, typography scale, and social templates. Ships with Figma + guidelines PDF.", price: 24900, category: "Brand Kits" },
    { name: "Northstar Design System", description: "Production-ready design system with tokens, components, and coded React/Tailwind implementation. Built for scaling teams.", price: 39900, category: "Design Systems" },
    { name: "Atlas Web Templates", description: "5 conversion-focused marketing site templates (Next.js + Tailwind). Includes CMS wiring and SEO defaults.", price: 12900, category: "Templates" },
    { name: "Editorial Content System", description: "Notion + Figma system for teams publishing weekly content — editorial calendar, brief templates, and distribution checklists.", price: 8900, category: "Content Systems" },
    { name: "Pitch Deck System — Series A", description: "Investor-ready deck kit with 24 layouts, data-visualization components, and narrative guidance.", price: 15900, category: "Templates" },
    { name: "Icon Archive — 500 Icons", description: "Hand-crafted icon set with 500+ icons in outline + filled styles. Figma + SVG + React package.", price: 6900, category: "Design Assets" },
    { name: "E-commerce Starter Kit", description: "Headless commerce kit with product grids, cart flows, and checkout patterns — built for modern brands.", price: 21900, category: "Templates" },
  ];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: p.name,
        description: p.description,
        price: p.price,
        imageUrl: PRODUCT_IMAGES[i % PRODUCT_IMAGES.length],
        images: [PRODUCT_IMAGES[i % PRODUCT_IMAGES.length]],
        slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        type: "digital",
        status: "PUBLISHED",
        isActive: true,
        isFeatured: i < 3,
        order: i,
      },
    });
  }
  console.log(`Products: ${products.length}`);

  // ── Timeline (5 steps) ──────────────────────────────────────────────────
  await prisma.timelineEvent.deleteMany({ where: { tenantId: tenant.id } });
  const timeline = [
    { year: "01", title: "Discover", description: "We map your business, audience, and ambition. Jobs to be done, competitive landscape, and north-star metrics." },
    { year: "02", title: "Define", description: "Clear strategy: positioning, visual language, and product principles that guide every decision." },
    { year: "03", title: "Design", description: "Iterative design in Figma with weekly reviews — brand, interface, and systems refined together." },
    { year: "04", title: "Build", description: "Coded components, tokens, and CMS wiring. We pair with your engineers or ship the implementation." },
    { year: "05", title: "Launch", description: "QA, performance, accessibility, and analytics. Post-launch we iterate with real data." },
  ];
  for (let i = 0; i < timeline.length; i++) {
    const t = timeline[i];
    await prisma.timelineEvent.create({
      data: { tenantId: tenant.id, year: t.year, title: t.title, description: t.description, order: i },
    });
  }
  console.log(`Timeline: ${timeline.length}`);

  // ── Offerings → Services (coaching) ────────────────────────────────────
  await prisma.offering.deleteMany({ where: { tenantId: tenant.id } });
  const services = [
    { title: "Brand Strategy Sprint", slug: "brand-strategy-sprint", description: "2-week sprint to define positioning, narrative, and visual direction. Deliverable: strategy deck + moodboards.", price: 75000, duration: "2 weeks", category: "Strategy" },
    { title: "Web Design & Build", slug: "web-design-build", description: "Marketing site from concept to launch — design system, Next.js build, CMS, and performance tuning.", price: 250000, duration: "6–8 weeks", category: "Web" },
    { title: "Product Design Partnership", slug: "product-design-partnership", description: "Embedded product design for 8 weeks — flows, UI, tokens, and component library your engineers can ship.", price: 320000, duration: "8 weeks", category: "Product" },
    { title: "Creative Direction Retainer", slug: "creative-direction-retainer", description: "Monthly creative leadership — reviews, art direction, and campaign systems for teams without a full-time CD.", price: 120000, duration: "Monthly", category: "Creative" },
    { title: "Content System Setup", slug: "content-system-setup", description: "Turn ad-hoc publishing into a system — editorial strategy, templates, and distribution workflows for your team.", price: 65000, duration: "3 weeks", category: "Systems" },
  ];
  for (const s of services) {
    await prisma.offering.create({
      data: {
        tenantId: tenant.id,
        type: "coaching",
        title: s.title,
        slug: s.slug,
        description: s.description,
        status: "published",
        price: s.price,
        metadata: { category: s.category, duration: s.duration, imageUrl: GALLERY_IMAGES[0] },
      },
    });
  }
  console.log(`Services: ${services.length}`);

  // ── Clean other collections ────────────────────────────────────────────
  await prisma.game.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.contentFeedItem.deleteMany({ where: { tenantId: tenant.id } });

  // ── Final log ──────────────────────────────────────────────────────────
  const countProducts = await prisma.product.count({ where: { tenantId: tenant.id } });
  const countGallery = await prisma.galleryImage.count({ where: { tenantId: tenant.id } });
  const countTimeline = await prisma.timelineEvent.count({ where: { tenantId: tenant.id } });
  console.log(`\n✓ Northstar Studio ready`);
  console.log(`  tenant: ${tenant.subdomain} (${tenant.id})`);
  console.log(`  website: ${website.id}`);
  console.log(`  page: Home / with ${SECTIONS.length} sections`);
  console.log(`  products: ${countProducts}, gallery: ${countGallery}, timeline: ${countTimeline}`);
  console.log(`  URL: /${SUBDOMAIN}  preview: /${SUBDOMAIN}?preview=true`);
  console.log(`  login: ${OWNER_EMAIL} / northstar123`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
