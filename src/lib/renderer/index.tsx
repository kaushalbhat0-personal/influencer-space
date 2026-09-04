"use client";

import { componentRegistry } from "@/lib/registry/components";
import { responsiveResolver } from "@/lib/responsive/resolver";

/** Renders a component from the registry using its OWN renderer. No switch statements. */
export function ComponentRenderer({
  componentId,
  props = {},
  elementId,
  viewport = "desktop",
  previewMode = false,
}: {
  componentId: string;
  props?: Record<string, unknown>;
  elementId?: string;
  viewport?: "desktop" | "tablet" | "mobile";
  /** RCCF-LAUNCH-TRACK-06: signals Builder preview so commerce renderers stay inert. */
  previewMode?: boolean;
}) {
  const def = componentRegistry.get(componentId);
  if (!def) {
    // RCCF-VISUAL-01L: unknown moduleIds in a published snapshot (stale content)
    // must not render a red error block on the public storefront. Log for
    // trace (server) and render a muted placeholder in prod.
    if (process.env.NODE_ENV === "production") {
      console.error(`[Renderer] Unknown component: ${componentId}`);
      return null;
    }
    return (
      <div className="rounded border border-dashed border-red-500/30 p-4 text-center text-xs text-red-400">
        Unknown component: {componentId}
      </div>
    );
  }

  const Renderer = def.renderer;
  if (!Renderer) {
    return (
      <div className="rounded border border-white/10 bg-zinc-900/30 p-6">
        <p className="text-xs font-medium text-zinc-400">{def.name}</p>
        <p className="mt-1 text-xs text-zinc-600">{def.description}</p>
        <p className="mt-2 text-[10px] text-zinc-700">v{def.version} · no renderer registered</p>
      </div>
    );
  }

  // Resolve responsive values for the active viewport
  const resolvedProps = responsiveResolver.resolve(props, viewport);

  return <Renderer props={resolvedProps} elementId={elementId} definition={def} previewMode={previewMode} />;
}

/** Renders a list of component instances — used by template rendering and page preview. */
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
