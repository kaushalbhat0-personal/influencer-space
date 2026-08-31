// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// RCCF-71.4.3 P1-B — the Builder canvas device frame was centered with
// `justify-center` inside an `overflow-auto` container. When the frame (1200px
// desktop / 375px mobile) is wider than the browser viewport, `justify-center`
// distributes the overflow to BOTH sides, but scrollLeft cannot go below 0 —
// so the left overflow (the Hero identity heading, first line) was permanently
// clipped on narrow screens (390/375/320px). Fix: `mx-auto` on the frame with
// `justify-start` on the parent, so when the frame fits it stays centered and
// when it overflows the auto margins collapse to 0 and the left edge remains
// reachable via scroll. The canonical storefront runtime never clipped (its h1
// uses break-words at the real viewport); only the Builder frame container did.

const canvasSrc = readFileSync("src/features/builder/canvas/interactive-canvas.tsx", "utf8");

describe("RCCF-71.4.3 P1-B — Builder canvas frame left edge stays reachable", () => {
  it("no longer centers the frame with justify-center (which clips unreachable left overflow)", () => {
    expect(canvasSrc).not.toMatch(/flex min-h-full items-start justify-center/);
  });

  it("keeps the device frame width fixed via DEVICE_WIDTHS (375/768/1200) so renderers keep container-query breakpoints", () => {
    expect(canvasSrc).toMatch(/DEVICE_WIDTHS\[device\] \?\? 1200/);
    expect(canvasSrc).toContain("mobile: 375");
    expect(canvasSrc).toContain("desktop: 1200");
  });

  it("keeps the canvas scrollable (overflow-auto) so oversized frames are reachable by scroll", () => {
    expect(canvasSrc).toMatch(/overflow-auto/);
  });
});
