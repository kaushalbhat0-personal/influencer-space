import { describe, it, expect } from "vitest";
import { toSubdomain } from "@/lib/utils";

describe("toSubdomain", () => {
  it('converts "Mortal Gaming" to "mortal-gaming"', () => {
    expect(toSubdomain("Mortal Gaming")).toBe("mortal-gaming");
  });

  it('converts "S8UL! @Snax" to "s8ul-snax"', () => {
    expect(toSubdomain("S8UL! @Snax")).toBe("s8ul-snax");
  });

  it('converts "Total Gaming" to "total-gaming"', () => {
    expect(toSubdomain("Total Gaming")).toBe("total-gaming");
  });

  it("trims leading/trailing hyphens and whitespace", () => {
    expect(toSubdomain("  -Test-  ")).toBe("test");
  });

  it("collapses multiple hyphens", () => {
    expect(toSubdomain("A--B  C")).toBe("a-b-c");
  });
});
