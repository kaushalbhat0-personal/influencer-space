import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/marketing/messaging";

const FOOTER_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refunds" },
  { href: "/contact", label: "Contact" },
  { href: "/about", label: "About" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/showcase", label: "Showcase" },
  { href: "/blog", label: "Blog" },
  { href: "/admin/login", label: "Admin" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-white/5 px-4 py-10 text-center text-xs text-zinc-600 sm:text-sm">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-zinc-500">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="transition-colors hover:text-indigo-400"
          >
            {CONTACT_EMAIL}
          </a>
          <span className="hidden sm:inline">·</span>
          <span>Pune, Maharashtra, India</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-zinc-400"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p className="mt-4">
          &copy; {new Date().getFullYear()} CreatorStore. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
