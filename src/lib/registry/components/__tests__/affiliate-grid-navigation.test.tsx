// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AffiliateGrid, type AffiliateGridItem } from "@/components/public/AffiliateGrid";

/* jsdom lacks IntersectionObserver / ResizeObserver used by framer-motion. */
class NoopIO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
class NoopRO {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const incrementMock = vi.hoisted(() => vi.fn());
vi.mock("@/actions/affiliate.actions", () => ({ incrementAffiliateClicks: incrementMock }));

beforeEach(() => {
  cleanup();
  (globalThis as Record<string, unknown>).IntersectionObserver = NoopIO;
  (globalThis as Record<string, unknown>).ResizeObserver = NoopRO;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (q: string) => ({ matches: false, media: q, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
  });
  incrementMock.mockReset();
});

const ITEMS: AffiliateGridItem[] = [
  { id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa", title: "Keyboard", url: "https://gear.example.com/keeb", imageUrl: null, clicks: 3 },
];

describe("RCCF-65.3 — AffiliateGrid navigation is independent of tracking", () => {
  it("opens the affiliate URL even when the click increment fails", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    incrementMock.mockRejectedValue(new Error("rate limited"));

    render(<AffiliateGrid affiliates={ITEMS} />);
    fireEvent.click(screen.getByText("Keyboard"));

    // Allow the async handler to settle.
    await new Promise((r) => setTimeout(r, 20));

    expect(openSpy).toHaveBeenCalledWith("https://gear.example.com/keeb", "_blank", "noopener,noreferrer");
    openSpy.mockRestore();
  });

  it("opens the affiliate URL when tracking succeeds", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    incrementMock.mockResolvedValue({ success: true });

    render(<AffiliateGrid affiliates={ITEMS} />);
    fireEvent.click(screen.getByText("Keyboard"));

    await new Promise((r) => setTimeout(r, 20));

    expect(incrementMock).toHaveBeenCalledWith(ITEMS[0].id);
    expect(openSpy).toHaveBeenCalledWith("https://gear.example.com/keeb", "_blank", "noopener,noreferrer");
    openSpy.mockRestore();
  });
});
