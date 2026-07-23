"use client";

import { EditableText } from "@/app/builder/_components/canvas/inline-editor";
import type { ComponentDefinition } from "./types";
import { useFormState } from "react-dom";
import {
  submitStorefrontContact,
  subscribeNewsletter,
  type ContactActionResult,
} from "@/actions/storefront.actions";


interface RendererProps {
  props: Record<string, unknown>;
  elementId?: string;
  definition?: ComponentDefinition;
}

function useVisibility(props: Record<string, unknown>, hasData: boolean): boolean {
  const mode = String(props.visibilityMode || "always");
  if (mode === "hidden") return false;
  if (mode === "auto" && !hasData) return false;
  return true;
}

function EmptyState({ label = "No content yet" }: { label?: string }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 text-center">
      <div className="rounded-lg border border-dashed border-white/10 p-8 text-sm text-zinc-600">
        {label}
      </div>
    </div>
  );
}

/* ─── Hero ─────────────────────────────────────────────── */

export function HeroRenderer({ props, elementId, definition }: RendererProps) {
  const p = props as Record<string, string>;
  const cid = definition?.id || "";
  return (
    <div className="relative flex min-h-[40vh] items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black px-4">
      <div className="relative z-10 max-w-2xl text-center">
        {Boolean(p.showLiveBadge) && (
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="text-sm font-semibold uppercase tracking-wider text-red-400">Live</span>
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          {elementId ? <EditableText componentId={cid} elementId={elementId} fieldKey="title" value={p.title || ""} /> : p.title || ""}
        </h1>
        {(elementId || p.subtitle) && (
          <p className="mt-3 text-base text-zinc-400">
            {elementId ? <EditableText componentId={cid} elementId={elementId} fieldKey="subtitle" value={p.subtitle || ""} /> : p.subtitle}
          </p>
        )}
        {(elementId || p.cta) && (
          <div className="mt-6">
            <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-secondary,#00f5ff)] px-5 py-2.5 text-sm font-semibold text-black">
              {elementId ? <EditableText componentId={cid} elementId={elementId} fieldKey="cta" value={p.cta || ""} /> : p.cta}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── About ────────────────────────────────────────────── */

export function AboutRenderer({ props, elementId, definition }: RendererProps) {
  const p = props as Record<string, string>;
  const cid = definition?.id || "";
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center">
      <h2 className="text-2xl font-bold text-white">
        {elementId ? <EditableText componentId={cid} elementId={elementId} fieldKey="title" value={p.title || "About"} /> : p.title || "About"}
      </h2>
      <div className="mt-4 text-zinc-400">
        {elementId ? <EditableText componentId={cid} elementId={elementId} fieldKey="content" value={p.content || ""} /> : p.content}
      </div>
      {p.imageUrl && <img src={p.imageUrl} alt="" className="mx-auto mt-6 h-32 w-32 rounded-full object-cover" />}
    </div>
  );
}

/* ─── Gallery ──────────────────────────────────────────── */

export function GalleryRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const images = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || "Gallery";
  const columns = Math.min(Math.max(Number(p.columns) || 3, 1), 6);
  if (!useVisibility(props, images.length > 0)) return null;

  if (images.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-6 text-center text-2xl font-bold text-white">{title}</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` } as React.CSSProperties}>
          {images.slice(0, 12).map((img: Record<string, unknown>, i: number) => (
            <div key={i} className="aspect-square overflow-hidden rounded-lg bg-zinc-800">
              {img.url ? <img src={img.url as string} alt={String(img.caption || "")} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-zinc-700">Image</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add images to your gallery" />;
}

/* ─── Products ─────────────────────────────────────────── */

export function ProductsRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const products = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Products");
  const columns = Math.min(Math.max(Number(p.columns) || 3, 1), 6);
  if (!useVisibility(props, products.length > 0)) return null;

  if (products.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-6 text-center text-2xl font-bold text-white">{title}</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` } as React.CSSProperties}>
          {products.map((prod: Record<string, unknown>, idx: number) => (
            <div key={idx} className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
              {prod.imageUrl ? <img src={String(prod.imageUrl)} alt={String(prod.name || "")} className="mb-2 aspect-video w-full rounded object-cover" /> : <div className="mb-2 aspect-video rounded bg-zinc-800" />}
              <p className="text-sm font-medium text-zinc-300">{String(prod.name || "")}</p>
              <p className="text-xs text-zinc-500">{prod.price ? `₹${Number(prod.price).toLocaleString()}` : ""}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add products in Dashboard" />;
}

/* ─── Timeline ─────────────────────────────────────────── */

export function TimelineRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const milestones = (p.resolvedData as Record<string, string>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Timeline");
  if (!useVisibility(props, milestones.length > 0)) return null;

  if (milestones.length > 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">{title}</h2>
        <div className="space-y-6">
          {milestones.map((m: Record<string, string>, i: number) => (
            <div key={i} className="relative border-l-2 border-zinc-800 pl-6">
              <div className="absolute -left-2.5 top-0 h-5 w-5 rounded-full border-2 border-zinc-800 bg-zinc-950" />
              <p className="text-xs font-semibold text-s8ul-cyan">{m.year}</p>
              <p className="mt-1 text-sm font-medium text-white">{m.title || m.name}</p>
              <p className="text-xs text-zinc-500">{m.description || ""}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add milestones to your timeline" />;
}

/* ─── Social Links ─────────────────────────────────────── */

export function LinksRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const links = (p.resolvedData as Record<string, string>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Connect With Me");
  if (!useVisibility(props, links.length > 0)) return null;

  if (links.length > 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <h2 className="mb-6 text-xl font-bold text-white">{title}</h2>
        <div className="space-y-3">
          {links.map((link: Record<string, string>, i: number) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-white/10 transition-colors">
              <span>{link.platform || link.label || "Link"}</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add your social links" />;
}

/* ─── Footer ───────────────────────────────────────────── */

export function FooterRenderer({ props, elementId, definition }: RendererProps) {
  const p = props as Record<string, string>;
  const cid = definition?.id || "";
  return (
    <footer className="border-t border-white/10 py-8 text-center text-sm text-zinc-600">
      {elementId ? <EditableText componentId={cid} elementId={elementId} fieldKey="copyright" value={p.copyright || "© All rights reserved"} /> : p.copyright || "© All rights reserved"}
    </footer>
  );
}

/* ─── Testimonials ─────────────────────────────────────── */

export function TestimonialsRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const items = (p.resolvedData as Record<string, string>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Testimonials");
  const columns = Math.min(Math.max(Number(p.columns) || 3, 1), 6);
  if (!useVisibility(props, items.length > 0)) return null;

  if (items.length > 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">{title}</h2>
        <div className="grid gap-4 sm:grid-cols-2" style={{ gridTemplateColumns: `repeat(${Math.min(columns, items.length)}, 1fr)` } as React.CSSProperties}>
          {items.map((item: Record<string, string>, i: number) => (
            <div key={i} className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                  {(item.name || "?")[0]}
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-300">{item.name || "Anonymous"}</p>
                  {item.handle && <p className="text-[10px] text-zinc-600">{item.handle}</p>}
                </div>
              </div>
              <p className="text-xs italic text-zinc-400">{item.content || item.message || ""}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add testimonials from your fans" />;
}

/* ─── FAQ ──────────────────────────────────────────────── */

export function FaqRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const items = (p.resolvedData as Record<string, string>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "FAQ");
  if (!useVisibility(props, items.length > 0)) return null;

  if (items.length > 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="mb-6 text-center text-2xl font-bold text-white">{title}</h2>
        <div className="space-y-3">
          {items.map((item: Record<string, string>, i: number) => (
            <details key={i} className="group rounded-lg border border-white/10 bg-zinc-900/50">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-zinc-300">
                {item.question || item.q}
                <svg className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="border-t border-white/5 px-4 py-3 text-xs text-zinc-500">{item.answer || item.a}</div>
            </details>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add frequently asked questions" />;
}

/* ─── Contact ──────────────────────────────────────────── */

const initialContactState: ContactActionResult = { success: false };

export function ContactRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const tenantId = String(props.tenantId || "");
  const [state, action] = useFormState(submitStorefrontContact, initialContactState);

  if (state.success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold text-white">{p.title || "Get In Touch"}</h2>
        <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-6">
          <p className="text-sm text-zinc-400">Thanks for reaching out! I&apos;ll get back to you soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h2 className="mb-2 text-center text-2xl font-bold text-white">{p.title || "Get In Touch"}</h2>
      <p className="mb-6 text-center text-sm text-zinc-500">Have a question or want to collaborate? Reach out!</p>
      <form action={async (fd) => {
        fd.set("tenantId", tenantId);
        action(fd);
      }} className="space-y-4">
        <input type="hidden" name="tenantId" value={tenantId} />
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Name</label>
          <input name="name" required maxLength={200} className="w-full rounded-lg border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" placeholder="Your name" />
          {state.fieldErrors?.name && <p className="mt-1 text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Email</label>
          <input name="email" type="email" required maxLength={200} className="w-full rounded-lg border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" placeholder="your@email.com" />
          {state.fieldErrors?.email && <p className="mt-1 text-xs text-red-400">{state.fieldErrors.email[0]}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Message</label>
          <textarea name="message" required minLength={10} maxLength={5000} rows={4} className="w-full resize-none rounded-lg border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" placeholder="Your message..." />
          {state.fieldErrors?.message && <p className="mt-1 text-xs text-red-400">{state.fieldErrors.message[0]}</p>}
        </div>
        {state.error && <p className="text-xs text-red-400">{state.error}</p>}
        <button type="submit" className="w-full rounded-lg bg-[var(--brand-secondary,#00f5ff)] px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90">Send Message</button>
      </form>
    </div>
  );
}

/* ─── Newsletter ───────────────────────────────────────── */

const initialNewsletterState: ContactActionResult = { success: false };

export function NewsletterRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const tenantId = String(props.tenantId || "");
  const [state, action] = useFormState(subscribeNewsletter, initialNewsletterState);

  if (state.success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold text-white">{p.title || "Subscribe"}</h2>
        <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-6">
          <p className="text-sm text-zinc-400">You&apos;re subscribed! Stay tuned for updates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <h2 className="mb-2 text-2xl font-bold text-white">{p.title || "Subscribe"}</h2>
      <p className="mb-6 text-sm text-zinc-500">Stay updated with the latest content and announcements.</p>
      <form action={async (fd) => {
        fd.set("tenantId", tenantId);
        action(fd);
      }} className="flex gap-2">
        <input type="hidden" name="tenantId" value={tenantId} />
        <input name="email" type="email" required className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" placeholder={p.placeholder || "Your email"} />
        <button type="submit" className="rounded-lg bg-[var(--brand-secondary,#00f5ff)] px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90">{p.buttonText || "Subscribe"}</button>
      </form>
      {state.error && <p className="mt-2 text-xs text-red-400">{state.error}</p>}
      {state.fieldErrors?.email && <p className="mt-2 text-xs text-red-400">{state.fieldErrors.email[0]}</p>}
    </div>
  );
}

/* ─── Pricing ──────────────────────────────────────────── */

export function PricingRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const plans = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Plans");
  if (!useVisibility(props, plans.length > 0)) return null;

  if (plans.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">{title}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan: Record<string, unknown>, i: number) => {
            const isPopular = Boolean(plan.isPopular);
            return (
              <div key={i} className={`relative rounded-lg border ${isPopular ? "border-s8ul-cyan/30 bg-s8ul-cyan/5" : "border-white/10 bg-zinc-900/50"} p-6 text-center`}>
                {isPopular && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-s8ul-cyan px-3 py-0.5 text-[10px] font-semibold text-black">Popular</span>}
                <p className="text-sm font-medium text-zinc-400">{String(plan.name || "")}</p>
                <p className="mt-2 text-3xl font-bold text-white">{typeof plan.price === "number" ? `₹${plan.price.toLocaleString()}` : String(plan.price || "")}</p>
                <p className="mt-1 text-xs text-zinc-500">{String(plan.description || plan.desc || "")}</p>
                {!!plan.cta && (
                  <button className={`mt-4 w-full rounded-lg ${isPopular ? "bg-s8ul-cyan text-black" : "border border-white/10 text-zinc-300"} px-4 py-2 text-sm font-semibold`}>
                    {String(plan.cta)}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add pricing plans" />;
}

/* ─── Courses ──────────────────────────────────────────── */

export function CoursesRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const courses = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Courses");
  if (!useVisibility(props, courses.length > 0)) return null;

  if (courses.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">{title}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course: Record<string, unknown>, i: number) => (
            <div key={i} className="overflow-hidden rounded-lg border border-white/10 bg-zinc-900/50">
              {course.imageUrl ? (
                <img src={String(course.imageUrl)} alt={String(course.title || "")} className="aspect-video w-full object-cover" />
              ) : (
                <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900" />
              )}
              <div className="p-4">
                <p className="text-xs font-semibold text-s8ul-cyan">{(String(course.category || "")).toUpperCase() || "COURSE"}</p>
                <p className="mt-1 text-sm font-medium text-white">{String(course.title || "")}</p>
                {!!course.description && <p className="mt-1 text-xs text-zinc-500">{String(course.description)}</p>}
                {!!course.price && <p className="mt-2 text-sm font-semibold text-zinc-200">{typeof course.price === "number" ? `₹${course.price.toLocaleString()}` : String(course.price)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add your courses" />;
}

/* ─── Embed: Spotify ───────────────────────────────────── */

export function SpotifyRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const url = p.url || "";
  if (!useVisibility(props, Boolean(url))) return null;

  const src = url.match(/spotify\.com\/(track|album|playlist|episode)\/(\S+)/)?.[0]
    ? url.replace(/^.*(spotify\.com\/(track|album|playlist|episode)\/\S+).*$/, "https://open.$1")
    : "";

  if (src) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <iframe
          src={src.includes("?") ? `${src}&utm_source=generator` : `${src}?utm_source=generator`}
          width="100%"
          height={p.height || "352"}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl"
        />
      </div>
    );
  }

  return <EmptyState label="Add a Spotify track URL" />;
}

/* ─── Embed: YouTube ───────────────────────────────────── */

export function YouTubeRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const url = p.url || "";
  if (!useVisibility(props, Boolean(url))) return null;

  const videoId = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || "";
  const src = videoId
    ? `https://www.youtube.com/embed/${videoId}${p.autoplay ? "?autoplay=1" : ""}`
    : "";

  if (src) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="aspect-video overflow-hidden rounded-xl">
          <iframe
            src={src}
            width="100%"
            height="100%"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="h-full w-full"
          />
        </div>
      </div>
    );
  }

  return <EmptyState label="Add a YouTube video URL" />;
}

/* ─── Social: Discord ──────────────────────────────────── */

export function DiscordRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const serverId = p.serverId || "";
  const label = p.label || "Join Discord";
  if (!useVisibility(props, Boolean(serverId))) return null;

  if (serverId) {
    const inviteUrl = p.inviteUrl || `https://discord.gg/${serverId}`;
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="rounded-lg bg-indigo-900/20 p-6">
          <p className="text-3xl">💬</p>
          <p className="mt-2 text-sm font-medium text-zinc-300">Discord Community</p>
          <p className="mt-1 text-xs text-zinc-500">Join the conversation</p>
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            {label}
          </a>
        </div>
      </div>
    );
  }

  return <EmptyState label="Connect your Discord server" />;
}

/* ─── Social: Instagram ────────────────────────────────── */

export function InstagramRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const username = String(p.username || "");
  const limit = Math.min(Math.max(Number(p.limit) || 6, 1), 30);
  if (!useVisibility(props, Boolean(username))) return null;

  if (username) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="mb-4 text-center text-sm font-medium text-zinc-400">
          <a
            href={`https://instagram.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-zinc-200"
          >
            @{username}
          </a>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
            <div key={i} className="aspect-square rounded bg-gradient-to-br from-pink-900/30 to-purple-900/30 flex items-center justify-center text-xs text-zinc-600">
              📷
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[10px] text-zinc-600">
          <a href={`https://instagram.com/${username}`} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">View on Instagram</a>
        </p>
      </div>
    );
  }

  return <EmptyState label="Connect your Instagram account" />;
}
