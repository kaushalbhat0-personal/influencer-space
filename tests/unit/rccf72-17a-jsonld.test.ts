import { describe, it, expect } from "vitest";
import { serializeJsonLd } from "@/lib/storefront/json-ld";

describe("serializeJsonLd (RCCF-72.17A SEC-01)", () => {
  it("escapes script-terminating sequences so they cannot break out of the script element", () => {
    const payload = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: '</script><script>alert("xss")</script>',
    };
    const out = serializeJsonLd(payload);
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<script>");
    expect(out).toContain("\\u003c/script\\u003e");
  });

  it("keeps a malicious value valid JSON (decodes back to the original string)", () => {
    const payload = { name: '</script><script>alert(1)</script>' };
    const out = serializeJsonLd(payload);
    expect(() => JSON.parse(out)).not.toThrow();
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>');
  });

  it("escapes quotes and ampersands safely", () => {
    const payload = { name: 'He said "hi" & <b>left</b>' };
    const out = serializeJsonLd(payload);
    expect(out).not.toContain("<b>");
    expect(JSON.parse(out).name).toBe('He said "hi" & <b>left</b>');
  });

  it("preserves Unicode content", () => {
    const payload = { name: "Café — टेस्ट 🚀" };
    const out = serializeJsonLd(payload);
    expect(JSON.parse(out).name).toBe("Café — टेस्ट 🚀");
  });

  it("handles normal SEO content and empty values", () => {
    const payload = { name: "Example Creator", description: "", url: "https://example.com" };
    const out = serializeJsonLd(payload);
    expect(JSON.parse(out).name).toBe("Example Creator");
    expect(JSON.parse(out).description).toBe("");
  });

  it("escapes U+2028/U+2029 line separators", () => {
    const payload = { name: "line\u2028separator\u2029here" };
    const out = serializeJsonLd(payload);
    expect(out).toContain("\\u2028");
    expect(out).toContain("\\u2029");
    expect(JSON.parse(out).name).toBe("line\u2028separator\u2029here");
  });

  it("escapes every '<' occurrence, including multiple and mixed-case script closers", () => {
    const payload = { name: "</SCRiPT> </script x> <<<" };
    const out = serializeJsonLd(payload);
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe("</SCRiPT> </script x> <<<");
  });
});