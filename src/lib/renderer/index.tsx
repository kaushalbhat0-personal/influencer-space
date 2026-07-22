"use client";

import { componentRegistry } from "@/lib/registry/components";
import type { ComponentDefinition } from "@/lib/registry/components";

/** Renders a component from the registry by its ID. No switch statements. */
export function ComponentRenderer({
  componentId,
  props = {},
  registry = componentRegistry,
}: {
  componentId: string;
  props?: Record<string, unknown>;
  registry?: typeof componentRegistry;
}) {
  const def = registry.get(componentId);
  if (!def) {
    return <div className="rounded border border-dashed border-red-500/30 p-4 text-center text-xs text-red-400">Unknown component: {componentId}</div>;
  }
  return <DefaultRenderer definition={def} props={props} />;
}

/** Renders a list of component instances. */
export function SectionRenderer({
  sections,
}: {
  sections: { componentId: string; props?: Record<string, unknown> }[];
}) {
  return (
    <>
      {sections.map((sec, i) => (
        <ComponentRenderer key={`${sec.componentId}-${i}`} componentId={sec.componentId} props={sec.props} />
      ))}
    </>
  );
}

function DefaultRenderer({ definition, props }: { definition: ComponentDefinition; props: Record<string, unknown> }) {
  const merged = { ...definition.defaultProps, ...props } as Record<string, unknown>;

  switch (definition.type) {
    case "hero":
      return <HeroRenderer definition={definition} props={merged} />;
    case "about":
      return <AboutRenderer props={merged} />;
    case "gallery":
      const imgArr = Array.isArray(merged.images) ? merged.images : [];
      return <div className="p-4 text-center text-zinc-500">Gallery: {imgArr.length} images</div>;
    case "products":
      return <div className="p-4 text-center text-zinc-500">Products section</div>;
    case "timeline":
      return <div className="p-4 text-center text-zinc-500">Timeline</div>;
    case "links":
      return <div className="p-4 text-center text-zinc-500">Social Links</div>;
    case "footer":
      return (
        <footer className="border-t border-white/10 py-8 text-center text-sm text-zinc-600">
          <p>{String(merged.copyright ?? "")}</p>
        </footer>
      );
    default:
      return (
        <div className="rounded border border-white/10 bg-zinc-900/30 p-6">
          <p className="text-xs text-zinc-500">{definition.name}</p>
          <p className="text-xs text-zinc-600 mt-1">{definition.description}</p>
        </div>
      );
  }
}

function HeroRenderer({ props }: { definition: ComponentDefinition; props: Record<string, unknown> }) {
  const p = props as Record<string, string>;
  return (
    <div className="relative flex min-h-[50vh] items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black px-4">
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
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          {p.title || ""}
        </h1>
        {p.subtitle && (
          <p className="mt-4 text-lg text-zinc-400">{p.subtitle}</p>
        )}
        {p.cta && (
          <div className="mt-8">
            <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-secondary,#00f5ff)] px-6 py-3 text-sm font-semibold text-black">
              {p.cta}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function AboutRenderer({ props }: { props: Record<string, unknown> }) {
  const p = props as Record<string, string>;
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="text-2xl font-bold text-white">{p.title || "About"}</h2>
      {p.content && <p className="mt-4 text-zinc-400">{p.content}</p>}
      {p.imageUrl && (
        <img src={p.imageUrl} alt="" className="mx-auto mt-6 h-32 w-32 rounded-full object-cover" />
      )}
    </div>
  );
}
