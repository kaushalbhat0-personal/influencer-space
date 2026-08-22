// @vitest-environment jsdom
/**
 * RCCF-72.18D.5.2-B — Creator Order Detail UI
 *
 * Consumer-layer coverage on top of the D.5.2-A truth layer:
 *   - row click opens the drawer; detail fetch is LAZY (one call per open,
 *     zero calls on render — no N+1)
 *   - loading / error / not-found states are safe and truthful
 *   - refund truth renders with D.5.1 semantics (actual refunded paise)
 *   - fulfillment truth renders (status label, tracking, timeline)
 *   - shipping address renders ONLY for physical orders
 *   - credential safety: nothing secret is ever rendered
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  getCreatorOrderDetail: vi.fn(),
}));

vi.mock("@/actions/order.actions", () => ({
  getCreatorOrderDetail: h.getCreatorOrderDetail,
}));

import { OrdersTable } from "@/app/admin/orders/_components/orders-table";
import type { CreatorOrderDetailView } from "@/actions/order.actions";
import type { OrderRow } from "@/actions/order.types";

const TABLE_ROWS: OrderRow[] = [
  {
    id: "ord-1",
    productName: "Bass Preset Pack",
    amount: 999,
    status: "COMPLETED",
    fanEmail: "buyer@example.com",
    razorpayOrderId: "order_X1",
    createdAt: new Date("2026-07-30T00:00:00Z").toISOString(),
  },
  {
    id: "ord-2",
    productName: "Sample Pack Vol. 2",
    amount: 499,
    status: "PENDING",
    fanEmail: "guest@example.com",
    razorpayOrderId: "order_X2",
    createdAt: new Date("2026-08-01T00:00:00Z").toISOString(),
  },
];

function makeDetail(over: Partial<CreatorOrderDetailView> = {}): CreatorOrderDetailView {
  return {
    id: "ord-1",
    amount: 999,
    originalCapturedPaise: 99900,
    status: "COMPLETED",
    commerceMode: "ONLINE",
    productName: "Bass Preset Pack",
    productType: "physical",
    customerEmail: "buyer@example.com",
    createdAt: "2026-07-30T00:00:00.000Z",
    razorpayOrderId: "order_X1",
    razorpayPaymentId: "pay_X1",
    refund: {
      status: "PARTIAL",
      refundedPaise: 2500,
      remainingRefundablePaise: 97400,
      providerRefundId: "rfnd_1",
      refundedAt: "2026-08-02T00:00:00.000Z",
    },
    fulfillment: {
      id: "ful-1",
      type: "physical",
      status: "shipped",
      trackingNumber: "TRK123",
      courier: "BlueDart",
      carrierNotes: null,
      shippedAt: "2026-08-01T10:00:00.000Z",
      deliveredAt: null,
      timeline: [
        { status: "pending", at: "2026-07-30T00:00:00.000Z" },
        { status: "shipped", at: "2026-08-01T10:00:00.000Z", by: "creator" },
      ],
    },
    shippingAddress: {
      id: "addr-1",
      name: "Buyer Name",
      phone: "+91 98765 43210",
      line1: "12 MG Road",
      line2: undefined,
      city: "Mumbai",
      state: "Maharashtra",
      pin: "400001",
      country: "India",
      instructions: undefined,
    },
    ...over,
  };
}

function openDrawerForFirstRow() {
  const rows = screen.getAllByRole("row");
  // Row 0 is the header row; the first data row contains the first order.
  const dataRow = rows.find((r) => r.textContent?.includes("Bass Preset Pack"))!;
  fireEvent.click(dataRow);
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RCCF-72.18D.5.2-B — drawer opening & lazy loading", () => {
  it("does not fetch any order detail on list render (no eager N+1)", () => {
    render(<OrdersTable orders={TABLE_ROWS} />);
    expect(h.getCreatorOrderDetail).not.toHaveBeenCalled();
  });

  it("fetches detail lazily exactly once when a row is clicked", async () => {
    let resolve!: (v: ReturnType<typeof Object>) => void;
    h.getCreatorOrderDetail.mockImplementation(() => new Promise((res) => { resolve = res; }));

    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawerForFirstRow();

    expect(h.getCreatorOrderDetail).toHaveBeenCalledTimes(1);
    expect(h.getCreatorOrderDetail).toHaveBeenCalledWith("ord-1");
    resolve({ ok: true, order: makeDetail() });
    await waitFor(() => expect(screen.getByTestId("order-detail-body")).toBeTruthy());
  });

  it("shows a loading state while the detail request is in flight", async () => {
    h.getCreatorOrderDetail.mockImplementation(() => new Promise(() => {}));
    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawerForFirstRow();
    expect(screen.getAllByText("Loading order…").length).toBeGreaterThan(0);
  });
});

describe("RCCF-72.18D.5.2-B — order truth rendering", () => {
  it("renders physical order truth: payment, refund math, fulfillment, tracking, address", async () => {
    h.getCreatorOrderDetail.mockResolvedValue({ ok: true, order: makeDetail() });
    const { container } = render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawerForFirstRow();

    await waitFor(() => expect(screen.getByTestId("order-detail-body")).toBeTruthy());

    // Order identity + canonical paid vocabulary
    expect(screen.getAllByText("Bass Preset Pack").length).toBeGreaterThan(0);
    expect(screen.getByText("Paid")).toBeTruthy();
    expect(screen.getAllByText("buyer@example.com").length).toBeGreaterThan(0); // table row + drawer fact
    expect(screen.getAllByText("₹999").length).toBeGreaterThan(0); // table cell + drawer fact (formatCurrency en-IN)

    // Refund block — D.5.1 semantics (actual paise, never "reserved")
    expect(screen.getByText("Partially refunded")).toBeTruthy();
    expect(screen.getByText("Refunded")).toBeTruthy(); // fact label
    expect(screen.getByText("₹25")).toBeTruthy();
    expect(screen.getByText("Remaining refundable")).toBeTruthy();
    expect(screen.getByText("₹974")).toBeTruthy();
    expect(screen.getByText("rfnd_1")).toBeTruthy();

    // Fulfillment block — canonical statusLabel vocabulary (badge + fact label + timeline)
    expect(screen.getAllByText("Shipped").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/TRK123/)).toBeTruthy();
    expect(screen.getByText(/BlueDart/)).toBeTruthy();
    const timeline = screen.getByRole("list"); // <ol> timeline
    expect(timeline.textContent).toContain("Pending");
    expect(timeline.children.length).toBe(2);

    // Physical-only address
    expect(screen.getByText("Shipping address")).toBeTruthy();
    expect(screen.getByText("12 MG Road")).toBeTruthy();
    expect(screen.getByText("Mumbai, Maharashtra, 400001")).toBeTruthy();

    // Credential safety across the whole rendered surface
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain("secret");
    expect(html).not.toContain("credential");
    expect(html).not.toContain("providerkey");
    expect(html).not.toContain("paymentaccountid");
    expect(html).not.toContain('"tenantid"');
  });

  it("never renders an address section for digital orders", async () => {
    h.getCreatorOrderDetail.mockResolvedValue({
      ok: true,
      order: makeDetail({
        productType: "digital",
        shippingAddress: null,
        fulfillment: {
          id: "ful-2", type: "digital", status: "ready", trackingNumber: null, courier: null,
          carrierNotes: null, shippedAt: null, deliveredAt: null, timeline: [],
        },
      }),
    });
    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawerForFirstRow();

    await waitFor(() => expect(screen.getByTestId("order-detail-body")).toBeTruthy());
    expect(screen.queryByText("Shipping address")).toBeNull();
    expect(screen.getByText("Ready to download")).toBeTruthy();
  });

  it("shows truthful empty states for missing fulfillment and missing address", async () => {
    h.getCreatorOrderDetail.mockResolvedValue({
      ok: true,
      order: makeDetail({
        status: "PENDING",
        fulfillment: null,
        shippingAddress: null,
        refund: { status: "NONE", refundedPaise: 0, remainingRefundablePaise: 99900, providerRefundId: null, refundedAt: null },
      }),
    });
    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawerForFirstRow();

    await waitFor(() => expect(screen.getByTestId("order-detail-body")).toBeTruthy());
    expect(screen.getByText("Fulfillment starts once payment completes.")).toBeTruthy();
    expect(screen.getByText("No shipping address submitted yet.")).toBeTruthy();
    expect(screen.getByText("No refund")).toBeTruthy();
  });

  it("renders every canonical refund state without inventing labels", async () => {
    const states: Array<[string, string]> = [
      ["NONE", "No refund"],
      ["PENDING", "Refund in progress"],
      ["PARTIAL", "Partially refunded"],
      ["REFUNDED", "Refunded"],
      ["FAILED", "Refund failed"],
    ];
    for (const [status, label] of states) {
      h.getCreatorOrderDetail.mockResolvedValue({
        ok: true,
        order: makeDetail({ refund: { status, refundedPaise: 0, remainingRefundablePaise: 99900, providerRefundId: null, refundedAt: null } }),
      });
      render(<OrdersTable orders={TABLE_ROWS} />);
      openDrawerForFirstRow();
      await waitFor(() => expect(screen.getByTestId("order-detail-body")).toBeTruthy());
      // The REFUNDED badge text can collide with the "Refunded" fact label — count occurrences.
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      cleanup();
    }
  });
});

describe("RCCF-72.18D.5.2-B — failure & isolation surfaces", () => {
  it("shows a safe error message when the detail action fails", async () => {
    h.getCreatorOrderDetail.mockRejectedValue(new Error("prisma: connection refused")); // raw server noise must not leak
    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawerForFirstRow();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Could not load this order.");
    expect(alert.textContent).not.toContain("prisma");
  });

  it("treats foreign/unauthorized orders as not found (tenant-isolation surface)", async () => {
    h.getCreatorOrderDetail.mockResolvedValue({ ok: false, error: "Order not found", code: "NOT_FOUND" });
    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawerForFirstRow();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Order not found.");
  });

  it("closes on Escape and stops rendering the drawer", async () => {
    h.getCreatorOrderDetail.mockResolvedValue({ ok: true, order: makeDetail() });
    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawerForFirstRow();
    await waitFor(() => expect(screen.getByTestId("order-detail-body")).toBeTruthy());

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("order-detail-body")).toBeNull();
  });
});
