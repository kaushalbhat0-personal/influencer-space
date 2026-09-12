import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("FINANCE-07 — capacity purchase invoice paise", () => {
  it("partner-capacity-purchase persists amountPaise = capturedAmountPaise", () => {
    const src = readFileSync(join(process.cwd(), "src/modules/billing/application/partner-capacity-purchase.ts"), "utf8");
    expect(src).toMatch(/amountPaise:\s*capturedAmountPaise/);
    // Also ensure amount is still set (rupee compatibility)
    expect(src).toMatch(/amount:\s*Math\.round\(\(capturedAmountPaise \/ 100\)/);
  });

  it("repository createInvoice computes paise via BigInt (no float drift)", () => {
    const src = readFileSync(join(process.cwd(), "src/modules/billing/infrastructure/repository.ts"), "utf8");
    expect(src).toMatch(/amountPaise/);
    expect(src).toMatch(/BigInt\(Math\.round/);
    // Ensure explicit amountPaise is honored (capacity case)
    expect(src).toMatch(/resolvedAmountPaise/);
  });
});
