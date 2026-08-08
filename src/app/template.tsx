// RCCF-IMPLEMENTATION-73 Phase 13: the root template previously wrapped every
// route (including the public storefront) in a framer-motion client animation,
// shipping ~40KB+ of framer-motion to every page and ignoring
// prefers-reduced-motion. A static wrapper keeps markup identical with zero
// client animation cost on the storefront and all marketing pages.
export default function Template({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
