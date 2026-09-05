import { getFooterConfig } from "@/actions/footer.actions";

export const dynamic = "force-dynamic";

export default async function FooterAdminPage() {
  const res = await getFooterConfig();
  const data = res.success && res.data ? res.data : { description: null, copyright: null, columns: [], socialLinks: [] };
  // fallback to defaults if no columns stored
  const columns = data.columns.length > 0 ? data.columns : [
    { title: "Products", links: [{ label: "Templates", href: "#products" }, { label: "Design Assets", href: "#products" }, { label: "Brand Kits", href: "#products" }, { label: "All Products", href: "#products" }] },
    { title: "Services", links: [{ label: "Brand Strategy", href: "#services" }, { label: "Web Design", href: "#services" }, { label: "Product Design", href: "#services" }, { label: "Creative Direction", href: "#services" }] },
    { title: "Company", links: [{ label: "About", href: "#timeline" }, { label: "Gallery / Work", href: "#gallery" }, { label: "Testimonials", href: "#testimonials" }, { label: "Contact", href: "#contact" }] },
    { title: "Support", links: [{ label: "FAQ", href: "#faq" }, { label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }, { label: "Refunds", href: "/refund" }] },
  ];

  const { FooterManager } = await import("./_components/footer-manager");

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="platform-display">Footer</h1>
        <p className="platform-body mt-1.5">Manage footer columns, footer links, legal links, social links, and copyright. Footer is independent from Hero and header Navigation.</p>
      </div>
      <FooterManager initialDescription={data.description} initialCopyright={data.copyright} initialColumns={columns} initialSocialLinks={data.socialLinks} />
    </div>
  );
}
