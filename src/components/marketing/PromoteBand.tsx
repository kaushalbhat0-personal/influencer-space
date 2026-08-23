import { AtSign, Video, Megaphone, ExternalLink } from "lucide-react";

/**
 * RCCF-MKT-02-R1 — Section 5: Promote.
 * "Give everything you share a home." Social links, brand links, campaigns,
 * and external destinations live on your site instead of scattering across
 * bios and stories. Quiet band — no invented claims.
 */
const DESTINATIONS = [
  { icon: AtSign, label: "Social profiles", note: "Every platform you're on, in one place" },
  { icon: Video, label: "Latest content", note: "Pull your newest videos and posts into your feed" },
  { icon: Megaphone, label: "Brand & campaign links", note: "Sponsored work gets a real page, not a story that expires" },
  { icon: ExternalLink, label: "Anywhere else you live", note: "Link out to podcasts, shops, newsletters — anything" },
] as const;

export function PromoteBand() {
  return (
    <section id="promote" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Give everything you share{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                a home
              </span>
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-400 sm:text-lg">
              Your audience finds you everywhere. Your links, content, and
              campaigns should lead back to one address — yours.
            </p>
          </div>

          {/* Destination list */}
          <div className="space-y-3" role="list" aria-label="What you can promote from your home">
            {DESTINATIONS.map((d) => (
              <div
                key={d.label}
                className="flex items-start gap-4 rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/40 px-4 py-3.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                  <d.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{d.label}</p>
                  <p className="text-xs text-zinc-500">{d.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
