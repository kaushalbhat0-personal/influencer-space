"use client";

import { componentRegistry } from "@/lib/registry/components";

/** Renders a component from the registry using its OWN renderer. No switch statements. */
export function ComponentRenderer({
  componentId,
  props = {},
}: {
  componentId: string;
  props?: Record<string, unknown>;
}) {
  const def = componentRegistry.get(componentId);
  if (!def) {
    return (
      <div className="rounded border border-dashed border-red-500/30 p-4 text-center text-xs text-red-400">
        Unknown component: {componentId}
      </div>
    );
  }

  const Renderer = def.renderer;
  if (!Renderer) {
    // Fallback when no renderer is registered — show metadata placeholder
    return (
      <div className="rounded border border-white/10 bg-zinc-900/30 p-6">
        <p className="text-xs font-medium text-zinc-400">{def.name}</p>
        <p className="mt-1 text-xs text-zinc-600">{def.description}</p>
        <p className="mt-2 text-[10px] text-zinc-700">v{def.version} · no renderer registered</p>
      </div>
    );
  }

  return <Renderer props={props} />;
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
