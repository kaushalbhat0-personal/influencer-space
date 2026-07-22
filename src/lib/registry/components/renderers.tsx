"use client";

import { EditableText } from "@/app/builder/_components/canvas/inline-editor";
import type { ComponentDefinition } from "./types";

interface RendererProps {
  props: Record<string, unknown>;
  elementId?: string;
  definition?: ComponentDefinition;
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
  const images = Array.isArray(p.images) ? p.images : [];
  const columns = Math.min(Math.max(Number(p.columns) || 3, 1), 6);
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h2 className="mb-6 text-center text-2xl font-bold text-white">Gallery</h2>
      {images.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-zinc-600">Add images to your gallery</div>
      ) : (
        <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {images.slice(0, 6).map((img: Record<string, unknown>, i: number) => (
            <div key={i} className="aspect-square overflow-hidden rounded-lg bg-zinc-800">
              {img.url ? <img src={img.url as string} alt={String(img.caption || "")} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-zinc-700">Image {i + 1}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Products ─────────────────────────────────────────── */

export function ProductsRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const columns = Math.min(Math.max(Number(p.columns) || 3, 1), 6);
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h2 className="mb-6 text-center text-2xl font-bold text-white">Products</h2>
      <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {[1, 2, 3].slice(0, columns).map((i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
            <div className="mb-2 aspect-video rounded bg-zinc-800" />
            <p className="text-sm font-medium text-zinc-300">Product {i}</p>
            <p className="text-xs text-zinc-500">₹{(i * 499).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Timeline ─────────────────────────────────────────── */

export function TimelineRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const milestones = [
    { year: "2023", title: "Started", desc: "Began the journey" },
    { year: "2024", title: "First Milestone", desc: "Reached 10K followers" },
    { year: "2025", title: "Growing", desc: "Expanded to new platforms" },
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="mb-8 text-center text-2xl font-bold text-white">{p.title || "Timeline"}</h2>
      <div className="space-y-6">
        {milestones.map((m, i) => (
          <div key={i} className="relative border-l-2 border-zinc-800 pl-6">
            <div className="absolute -left-2.5 top-0 h-5 w-5 rounded-full border-2 border-zinc-800 bg-zinc-950" />
            <p className="text-xs font-semibold text-s8ul-cyan">{m.year}</p>
            <p className="mt-1 text-sm font-medium text-white">{m.title}</p>
            <p className="text-xs text-zinc-500">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Social Links ─────────────────────────────────────── */

export function LinksRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const links = [
    { platform: "YouTube", url: "#", color: "bg-red-600" },
    { platform: "Instagram", url: "#", color: "bg-pink-600" },
    { platform: "Twitter", url: "#", color: "bg-blue-500" },
    { platform: "Discord", url: "#", color: "bg-indigo-600" },
  ];
  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <h2 className="mb-6 text-xl font-bold text-white">{p.title || "Connect With Me"}</h2>
      <div className="space-y-3">
        {links.map((link, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-lg ${link.color}/10 px-4 py-3 text-sm font-medium text-zinc-300`}>
            <div className={`h-2 w-2 rounded-full ${link.color}`} />
            {link.platform}
          </div>
        ))}
      </div>
    </div>
  );
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
  const p = props as Record<string, string>;
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h2 className="mb-8 text-center text-2xl font-bold text-white">{p.title || "Testimonials"}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-zinc-800" />
              <div>
                <p className="text-xs font-medium text-zinc-300">Creator Fan</p>
                <p className="text-[10px] text-zinc-600">@fan_{i}</p>
              </div>
            </div>
            <p className="text-xs italic text-zinc-400">Amazing content! Keep up the great work. 🌟</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── FAQ ──────────────────────────────────────────────── */

export function FaqRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const items = [
    { q: "How can I support you?", a: "Check out the products and links section." },
    { q: "Do you take requests?", a: "Contact me through the contact form." },
    { q: "Where can I find your content?", a: "Follow me on social media platforms." },
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="mb-6 text-center text-2xl font-bold text-white">{p.title || "FAQ"}</h2>
      <div className="space-y-3">
        {items.map((item, i) => (
          <details key={i} className="group rounded-lg border border-white/10 bg-zinc-900/50">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-zinc-300">{item.q}</summary>
            <div className="border-t border-white/5 px-4 py-3 text-xs text-zinc-500">{item.a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}

/* ─── Contact ──────────────────────────────────────────── */

export function ContactRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <h2 className="mb-2 text-2xl font-bold text-white">{p.title || "Get In Touch"}</h2>
      <p className="mb-6 text-sm text-zinc-500">Have a question or want to collaborate? Reach out!</p>
      <div className="space-y-3 text-left">
        <div className="rounded-lg border border-white/10 bg-zinc-900/50 px-4 py-3">
          <p className="text-xs text-zinc-500">Email</p>
          <p className="text-sm text-zinc-300">{p.email || "creator@example.com"}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-zinc-900/50 px-4 py-3">
          <p className="mb-2 text-xs text-zinc-500">Message</p>
          <textarea className="w-full resize-none rounded border border-white/5 bg-zinc-800 px-3 py-2 text-xs text-zinc-300" rows={3} placeholder="Your message..." />
        </div>
      </div>
    </div>
  );
}

/* ─── Newsletter ───────────────────────────────────────── */

export function NewsletterRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <h2 className="mb-2 text-2xl font-bold text-white">{p.title || "Subscribe"}</h2>
      <p className="mb-6 text-sm text-zinc-500">Stay updated with the latest content and announcements.</p>
      <div className="flex gap-2">
        <input type="email" placeholder={p.placeholder || "Your email"} className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 placeholder-zinc-700" />
        <button className="rounded-lg bg-s8ul-cyan px-4 py-2.5 text-sm font-semibold text-black">{p.buttonText || "Subscribe"}</button>
      </div>
    </div>
  );
}

/* ─── Pricing ──────────────────────────────────────────── */

export function PricingRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const plans = [
    { name: "Starter", price: 0, desc: "Get started with basic access" },
    { name: "Pro", price: 499, desc: "Unlock premium content" },
    { name: "Enterprise", price: 999, desc: "Full access + priority support" },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h2 className="mb-8 text-center text-2xl font-bold text-white">{p.title || "Plans"}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, i) => (
          <div key={i} className={`rounded-lg border ${i === 1 ? "border-s8ul-cyan/30 bg-s8ul-cyan/5" : "border-white/10 bg-zinc-900/50"} p-6 text-center`}>
            <p className="text-sm font-medium text-zinc-400">{plan.name}</p>
            <p className="mt-2 text-3xl font-bold text-white">₹{plan.price.toLocaleString()}</p>
            <p className="mt-1 text-xs text-zinc-500">{plan.desc}</p>
            <button className={`mt-4 w-full rounded-lg ${i === 1 ? "bg-s8ul-cyan text-black" : "border border-white/10 text-zinc-300"} px-4 py-2 text-sm font-semibold`}>Choose Plan</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Courses ──────────────────────────────────────────── */

export function CoursesRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h2 className="mb-8 text-center text-2xl font-bold text-white">{p.title || "Courses"}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-white/10 bg-zinc-900/50">
            <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900" />
            <div className="p-4">
              <p className="text-xs font-semibold text-s8ul-cyan">COURSE {i}</p>
              <p className="mt-1 text-sm font-medium text-white">Course Title {i}</p>
              <p className="mt-1 text-xs text-zinc-500">Learn the fundamentals and advanced techniques.</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Embed: Spotify ───────────────────────────────────── */

export function SpotifyRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="rounded-lg bg-green-900/20 p-6 text-center">
        <p className="mb-2 text-3xl">🎵</p>
        <p className="text-sm font-medium text-zinc-300">Spotify Player</p>
        <p className="mt-1 text-xs text-zinc-500">{p.url || "No track URL configured"}</p>
      </div>
    </div>
  );
}

/* ─── Embed: YouTube ───────────────────────────────────── */

export function YouTubeRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="aspect-video rounded-lg bg-red-900/20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl">▶</p>
          <p className="mt-2 text-sm text-zinc-400">{p.url ? "YouTube Video" : "No video URL configured"}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Social: Discord ──────────────────────────────────── */

export function DiscordRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <div className="rounded-lg bg-indigo-900/20 p-6">
        <p className="text-3xl">💬</p>
        <p className="mt-2 text-sm font-medium text-zinc-300">Discord Community</p>
        <p className="mt-1 text-xs text-zinc-500">{p.serverId ? `Server: ${p.serverId}` : "Connect your Discord server"}</p>
        <button className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">{p.label || "Join Discord"}</button>
      </div>
    </div>
  );
}

/* ─── Social: Instagram ────────────────────────────────── */

export function InstagramRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const limit = Math.min(Math.max(Number(p.limit) || 6, 1), 30);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="mb-4 text-center text-sm font-medium text-zinc-400">{p.username ? `@${p.username}` : "Instagram Feed"}</p>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
          <div key={i} className="aspect-square rounded bg-gradient-to-br from-pink-900/30 to-purple-900/30" />
        ))}
      </div>
    </div>
  );
}
