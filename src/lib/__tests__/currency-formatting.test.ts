// ── Currency Formatting — RCCF-LAUNCH-POLISH-06 (Phase 1) ──
// The canonical helper is formatCurrency (Intl.NumberFormat, INR narrowSymbol).
// No renderer concatenates "₹"/"Rs." (that produced the "â‚¹" mojibake). Every
// divergent formatter delegates to this one.

import { describe, it, expect } from "vitest";
import { formatCurrency, formatMinorUnits } from "@/lib/utils";
import { formatCurrency as analyticsFormat } from "@/lib/analytics/date";
import { formatCurrency as billingFormat } from "@/lib/billing/invoice-engine";

describe("formatCurrency (canonical)", () => {
  it("formats INR with the ₹ symbol and en-IN grouping", () => {
    expect(formatCurrency(1999)).toBe("₹1,999");
    expect(formatCurrency(100000)).toBe("₹1,00,000");
  });

  it("shows 0-2 fraction digits (integers without decimals)", () => {
    expect(formatCurrency(1999)).not.toContain(".00");
    expect(formatCurrency(1999.5)).toBe("₹1,999.5");
    expect(formatCurrency(1999.05)).toBe("₹1,999.05");
    expect(formatCurrency(0)).toBe("₹0");
  });

  it("honours an explicit currency code", () => {
    expect(formatCurrency(1999, "USD", "en-US")).toBe("$1,999");
  });

  it("formatMinorUnits divides by 100", () => {
    expect(formatMinorUnits(199900)).toBe("₹1,999");
  });

  it("never emits the mojibake 'â‚¹'", () => {
    expect(formatCurrency(1999)).not.toContain("â‚¹");
    expect(formatCurrency(1999).charCodeAt(0)).toBe(0x20b9); // ₹ U+20B9
  });
});

describe("divergent formatters delegate to the canonical helper", () => {
  it("analytics/date.formatCurrency matches the canonical output", () => {
    expect(analyticsFormat(1999)).toBe(formatCurrency(1999));
    expect(analyticsFormat(1999.5)).toBe(formatCurrency(1999.5));
  });

  it("billing/invoice-engine.formatCurrency matches the canonical output", () => {
    expect(billingFormat(1999)).toBe(formatCurrency(1999));
    expect(billingFormat(1999.5)).toBe(formatCurrency(1999.5));
  });
});
