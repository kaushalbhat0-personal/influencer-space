import { describe, it, expect } from "vitest";
import { getFulfillmentStrategy, canTransition, statusLabel, DOWNLOAD_LIMIT, DOWNLOAD_TTL_MS } from "@/modules/fulfillment";

describe("RCCF-TRACK-01 — fulfillment strategies", () => {
  it("declares the right strategy per product type", () => {
    expect(getFulfillmentStrategy("physical").requiresShipping).toBe(true);
    expect(getFulfillmentStrategy("physical").requiresInventory).toBe(true);
    expect(getFulfillmentStrategy("digital").requiresDownload).toBe(true);
    expect(getFulfillmentStrategy("course").requiresDownload).toBe(true);
    expect(getFulfillmentStrategy("service").requiresManualApproval).toBe(true);
    expect(getFulfillmentStrategy("booking").requiresBooking).toBe(true);
    expect(getFulfillmentStrategy("unknown").type).toBe("digital"); // fallback
  });
});

describe("RCCF-TRACK-01 — fulfillment lifecycle", () => {
  const physical = getFulfillmentStrategy("physical");

  it("allows the physical shipping sequence and blocks illegal transitions", () => {
    expect(canTransition(physical, "pending", "preparing")).toBe(true);
    expect(canTransition(physical, "pending", "shipped")).toBe(true);
    expect(canTransition(physical, "preparing", "packed")).toBe(true);
    expect(canTransition(physical, "shipped", "delivered")).toBe(true);
    expect(canTransition(physical, "shipped", "shipped")).toBe(false);
    expect(canTransition(physical, "delivered", "shipped")).toBe(false);
    expect(canTransition(physical, "completed", "pending")).toBe(false);
  });

  it("digital moves pending → ready → completed", () => {
    const digital = getFulfillmentStrategy("digital");
    expect(canTransition(digital, "pending", "ready")).toBe(true);
    expect(canTransition(digital, "ready", "completed")).toBe(true);
    expect(canTransition(digital, "ready", "shipped")).toBe(false);
  });

  it("labels statuses for the UI", () => {
    expect(statusLabel("shipped")).toBe("Shipped");
    expect(statusLabel("ready")).toBe("Ready to download");
    expect(statusLabel("bogus")).toBe("bogus");
  });
});

describe("RCCF-TRACK-01 — download security constants", () => {
  it("enforces a limit and an expiry window", () => {
    expect(DOWNLOAD_LIMIT).toBeGreaterThan(0);
    expect(DOWNLOAD_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
