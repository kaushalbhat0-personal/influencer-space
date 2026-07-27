const COMPAT_MAP: Record<string, string> = {
  hero: "hero.default",
  about: "about.default",
  gallery: "gallery.grid",
  products: "products.grid",
  timeline: "timeline.default",
  links: "links.default",
  footer: "footer.default",
  testimonials: "testimonials.default",
  faq: "faq.default",
  contact: "contact.default",
  newsletter: "newsletter.default",
  pricing: "pricing.default",
  courses: "courses.default",
};

export function resolveModuleId(type: string): string {
  if (type.includes(".")) return type;
  return COMPAT_MAP[type.toLowerCase()] ?? type;
}

export function moduleIdToDisplayName(moduleId: string): string {
  const name = moduleId.includes(".") ? moduleId.split(".")[0] : moduleId;
  return name.charAt(0).toUpperCase() + name.slice(1);
}
