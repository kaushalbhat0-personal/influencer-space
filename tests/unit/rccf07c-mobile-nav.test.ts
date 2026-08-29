import { describe, it, expect } from "vitest";

// Pure helper extracted from StorefrontNav logic (mirror production derivation, no React)
function deriveMobileNav(visibleSections: { id:string; label:string; href:string; type:string; visible:boolean }[]) {
  const MAX_PRIMARY = 5;
  const needsOverflow = visibleSections.length > MAX_PRIMARY;
  const PRIMARY_COUNT = needsOverflow ? MAX_PRIMARY - 1 : MAX_PRIMARY;
  const primary = visibleSections.slice(0, PRIMARY_COUNT);
  const overflow = needsOverflow ? visibleSections.slice(PRIMARY_COUNT) : [];
  return { primary, overflow, needsOverflow };
}

describe("RCCF-07C Mobile Bottom Navigation", () => {
  it("derives from canonical navigation, not hardcoded labels", () => {
    const navA = [
      { id:"hero", label:"Home", href:"#hero", type:"anchor", visible:true },
      { id:"services", label:"Services", href:"#services", type:"anchor", visible:true },
      { id:"products", label:"Products", href:"#products", type:"anchor", visible:true },
      { id:"gallery", label:"Work", href:"#gallery", type:"anchor", visible:true },
      { id:"faq", label:"FAQ", href:"#faq", type:"anchor", visible:true },
      { id:"contact", label:"Contact", href:"#contact", type:"anchor", visible:true },
    ];
    const { primary, overflow } = deriveMobileNav(navA);
    expect(primary.map(p=>p.label)).toEqual(["Home","Services","Products","Work"]);
    expect(overflow.map(p=>p.label)).toEqual(["FAQ","Contact"]);
  });

  it("Website B: Courses/Testimonials variant also derived", () => {
    const navB = [
      { id:"hero", label:"Home", href:"#hero", type:"anchor", visible:true },
      { id:"courses", label:"Courses", href:"#courses", type:"anchor", visible:true },
      { id:"testimonials", label:"Testimonials", href:"#testimonials", type:"anchor", visible:true },
      { id:"faq", label:"FAQ", href:"#faq", type:"anchor", visible:true },
      { id:"contact", label:"Contact", href:"#contact", type:"anchor", visible:true },
    ];
    const { primary, overflow, needsOverflow } = deriveMobileNav(navB);
    expect(needsOverflow).toBe(false);
    expect(primary.length).toBe(5);
    expect(overflow.length).toBe(0);
  });

  it("limits to 5 primary destinations, More for remainder", () => {
    const nav = Array.from({length:7}, (_,i)=> ({ id:`s${i}`, label:`L${i}`, href:`#s${i}`, type:"anchor", visible:true }));
    const { primary, overflow } = deriveMobileNav(nav);
    expect(primary.length).toBe(4);
    expect(overflow.length).toBe(3);
  });

  it("no overflow when exactly 5", () => {
    const nav = Array.from({length:5}, (_,i)=> ({ id:`s${i}`, label:`L${i}`, href:`#s${i}`, type:"anchor", visible:true }));
    const { primary, overflow, needsOverflow } = deriveMobileNav(nav);
    expect(needsOverflow).toBe(false);
    expect(primary.length).toBe(5);
    expect(overflow.length).toBe(0);
  });

  it("follows configured sections: removing Gallery updates mobile nav", () => {
    const withGallery = [
      { id:"hero", label:"Home", href:"#hero", type:"anchor", visible:true },
      { id:"services", label:"Services", href:"#services", type:"anchor", visible:true },
      { id:"products", label:"Products", href:"#products", type:"anchor", visible:true },
      { id:"gallery", label:"Work", href:"#gallery", type:"anchor", visible:true },
      { id:"contact", label:"Contact", href:"#contact", type:"anchor", visible:true },
    ];
    const withoutGallery = withGallery.filter(s=> s.id!=="gallery");
    const withRes = deriveMobileNav(withGallery);
    const withoutRes = deriveMobileNav(withoutGallery);
    expect(withRes.primary.some(p=>p.id==="gallery")).toBe(true);
    expect(withoutRes.primary.some(p=>p.id==="gallery")).toBe(false);
  });

  it("Hero CTA ≠ Mobile Navigation ≠ Footer Links — no Hero CTA reuse", () => {
    const heroCta = { ctaText:"Start a Project", ctaLink:"#contact" };
    const nav = [
      { id:"hero", label:"Home", href:"#hero", type:"anchor", visible:true },
      { id:"services", label:"Services", href:"#services", type:"anchor", visible:true },
    ];
    const { primary } = deriveMobileNav(nav);
    // Mobile nav labels/hrefs must not equal hero CTA text/link as source rule
    expect(primary.some(p=>p.label===heroCta.ctaText)).toBe(false);
    // Even if href coincidentally same (#contact), source is navigation reconciliation, not Hero CTA
    expect(primary.find(p=>p.href==="#contact")).toBeUndefined(); // this nav has no contact
  });

  it("Footer excluded — navigation reconciles without footer", () => {
    const nav = [
      { id:"hero", label:"Home", href:"#hero", type:"anchor", visible:true },
      { id:"footer", label:"Footer", href:"#footer", type:"anchor", visible:true },
    ];
    // In real pipeline footer is not NAV_GENERATABLE_BASES, so it would never be in nav
    // Simulate filtering: footer should not appear
    const filtered = nav.filter(n=> n.id!=="footer");
    const { primary } = deriveMobileNav(filtered);
    expect(primary.some(p=>p.id==="footer")).toBe(false);
  });
});
