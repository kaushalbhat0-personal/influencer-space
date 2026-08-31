import { StorefrontNav } from "./StorefrontNav";
import { TrustIndicators } from "./TrustIndicators";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import { serializeJsonLd } from "@/lib/storefront/json-ld";
import type { PublishedSnapshot } from "@/types/snapshot";

export function StorefrontChrome({ data, isPreview, children }: { data: { snapshot: unknown; tenantId: string; diagnostics: unknown }; isPreview: boolean; children: React.ReactNode }) {
  const snap = data.snapshot as unknown as PublishedSnapshot;
  const doc = snap ? layoutEngine.resolve(snap as unknown as Parameters<typeof layoutEngine.resolve>[0]) : null;
  const nav = doc?.navigation ?? [];
  const jsonLd = doc?.jsonLd ?? [];
  const theme = (doc?.theme ?? {}) as React.CSSProperties;
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded focus:bg-s8ul-cyan focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black">Skip to main content</a>
      <StorefrontNav sections={nav as never} />
      {isPreview && <div className="sticky top-0 z-50 bg-amber-900/80 backdrop-blur-sm text-center py-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-200" role="alert">Preview Mode — changes are not public</div>}
      <main id="main-content" className="@container/main theme-root min-h-screen bg-[var(--surface-root,#0A0A0B)] text-[var(--text-primary,#FAFAFA)] pb-[calc(var(--mobile-nav-height,3.75rem)+env(safe-area-inset-bottom))] md:pb-0" style={theme}>
        {jsonLd.map((ld: Record<string, unknown>, i: number) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(ld) }} />
        ))}
        {children}
      </main>
      <TrustIndicators declaredFacts={snap?.content?.declaredFacts} />
    </>
  );
}
