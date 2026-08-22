// @vitest-environment jsdom
/**
 * RCCF-72.18D.5.2-C — Creator Fulfillment Controls (drawer UI)
 *
 * Consumer-layer coverage on top of D.5.2-A truth + D.5.2-B drawer:
 *   - controls appear ONLY for eligible physical fulfillments
 *   - candidate buttons follow the CANONICAL machine per current status
 *     (illegal transitions are not even rendered)
 *   - mutation UX: busy state prevents double-submit, every outcome ends in a
 *     server-truth refresh, failures surface safe messages only
 *   - tracking stays optional (empty inputs send undefined)
 *   - digital orders render no shipping controls
 *   - refund truth and address remain truthful through refreshes
 *   - credential safety across the whole rendered surface
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  getCreatorOrderDetail: vi.fn(),
  updateFulfillmentStatus: vi.fn(),
}));

vi.mock("@/actions/order.actions", () => ({
  getCreatorOrderDetail: h.getCreatorOrderDetail,
}));
vi.mock("@/actions/fulfillment.actions", () => ({
  updateFulfillmentStatus: h.updateFulfillmentStatus,
}));

import { OrdersTable } from "@/app/admin/orders/_components/orders-table";
import type { CreatorOrderDetailView } from "@/actions/order.actions";

const TABLE_ROWS = [
  {
    id: "ord-1",
    productName: "Bass Preset Pack",
    amount: 999,
    status: "COMPLETED",
    fanEmail: "buyer@example.com",
    razorpayOrderId: "order_X1",
    createdAt: new Date("2026-07-30T00:00:00Z").toISOString(),
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
      status: "NONE",
      refundedPaise: 0,
      remainingRefundablePaise: 99900,
      providerRefundId: null,
      refundedAt: null,
    },
    fulfillment: {
      id: "ful-1",
      type: "physical",
      status: "pending",
      trackingNumber: null,
      courier: null,
      carrierNotes: null,
      shippedAt: null,
      deliveredAt: null,
      timeline: [{ status: "pending", at: "2026-07-30T00:00:00.000Z" }],
    },
    shippingAddress: {
      id: "addr-1",
      name: "Buyer Name",
      line1: "12 MG Road",
      city: "Mumbai",
      state: "Maharashtra",
      pin: "400001",
      country: "India",
    },
    ...over,
  };
}

function openDrawer() {
  const rows = screen.getAllByRole("row");
  const dataRow = rows.find((r) => r.textContent?.includes("Bass Preset Pack"))!;
  fireEvent.click(dataRow);
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RCCF-72.18D.5.2-C — control eligibility", () => {
  it("renders canonical progression controls for a pending physical order (no illegal jump to delivered)", async () => {
    h.getCreatorOrderDetail.mockResolvedValue({ ok: true, order: makeDetail({ fulfillment: makeDetail().fulfillment }) });
    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawer();
    await waitFor(() => expect(screen.getByTestId("fulfillment-controls")).toBeTruthy());

    // Canonical machine: pending → preparing | packed | shipped (progression set)
    expect(screen.getByRole("button", { name: "Mark as Preparing" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mark as Packed" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mark as Shipped" })).toBeTruthy();
    // PENDING → DELIVERED is ILLEGAL — must not be offered by the UI.
    expect(screen.queryByRole("button", { name: "Mark as Delivered" })).toBeNull();
    // Cancellation lifecycle is a deferred RCCF — not part of C controls.
    expect(screen.queryByRole("button", { name: /Cancel/i })).toBeNull();
  });

  it("offers exactly the legal next step for a shipped order (delivered only)", async () => {
    const d = makeDetail();
    d.fulfillment = { ...d.fulfillment!, status: "shipped", trackingNumber: "TRK123", courier: "BlueDart" };
    h.getCreatorOrderDetail.mockResolvedValue({ ok: true, order: d });
    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawer();
    await waitFor(() => expect(screen.getByTestId("fulfillment-controls")).toBeTruthy());

    expect(screen.queryByRole("button", { name: "Mark as Shipped" })).toBeNull();
    expect(screen.getByRole("button", { name: "Mark as Delivered" })).toBeTruthy();
  });

  it("renders NO progression controls once delivered (terminal for progression)", async () => {
    const d = makeDetail();
    d.fulfillment = { ...d.fulfillment!, status: "delivered", deliveredAt: "2026-08-05T00:00:00.000Z" };
    h.getCreatorOrderDetail.mockResolvedValue({ ok: true, order: d });
    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawer();
    await waitFor(() => expect(screen.getByTestId("order-detail-body")).toBeTruthy());
    expect(screen.queryByTestId("fulfillment-controls")).toBeNull();
    expect(screen.getAllByText("Delivered").length).toBeGreaterThan(0);
  });

  it("renders NO shipping controls for a digital order", async () => {
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
    openDrawer();
    await waitFor(() => expect(screen.getByTestId("order-detail-body")).toBeTruthy());
    expect(screen.queryByTestId("fulfillment-controls")).toBeNull();
    expect(screen.queryByText("Manage fulfillment")).toBeNull();
  });
});

describe("RCCF-72.18D.5.2-C — mutation UX", () => {
  it("ships with typed tracking values, then refreshes server truth", async () => {
    const before = makeDetail();
    h.getCreatorOrderDetail
      .mockResolvedValueOnce({ ok: true, order: before })
      .mockResolvedValueOnce({
        ok: true,
        order: (() => {
          const after = makeDetail();
          after.fulfillment = { ...after.fulfillment!, status: "shipped", trackingNumber: "AWB-77", courier: "Delhivery", shippedAt: "2026-08-02T10:00:00.000Z" };
          return after;
        })(),
      });
    h.updateFulfillmentStatus.mockResolvedValue({ success: true });

    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawer();
    await waitFor(() => expect(screen.getByTestId("fulfillment-controls")).toBeTruthy());

    fireEvent.change(screen.getByPlaceholderText("e.g. AWB 123456"), { target: { value: "AWB-77" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. BlueDart"), { target: { value: "Delhivery" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark as Shipped" }));

    await waitFor(() =>
      expect(h.updateFulfillmentStatus).toHaveBeenCalledWith("ful-1", {
        status: "shipped",
        trackingNumber: "AWB-77",
        courier: "Delhivery",
      }),
    );
    // Server-truth refresh: the projection is re-read after the mutation.
    await waitFor(() => expect(h.getCreatorOrderDetail).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Marked as Shipped"));
    expect(h.updateFulfillmentStatus).toHaveBeenCalledTimes(1);
  });

  it("treats tracking as OPTIONAL: empty inputs send undefined, never fabricated data", async () => {
    h.getCreatorOrderDetail.mockResolvedValue({ ok: true, order: makeDetail() });
    h.updateFulfillmentStatus.mockResolvedValue({ success: true });
    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawer();
    await waitFor(() => expect(screen.getByTestId("fulfillment-controls")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Mark as Shipped" }));
    await waitFor(() =>
      expect(h.updateFulfillmentStatus).toHaveBeenCalledWith("ful-1", {
        status: "shipped",
        trackingNumber: undefined,
        courier: undefined,
      }),
    );
  });

  it("blocks double-submission while a mutation is in flight", async () => {
    h.getCreatorOrderDetail.mockResolvedValue({ ok: true, order: makeDetail() });
    h.updateFulfillmentStatus.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawer();
    await waitFor(() => expect(screen.getByTestId("fulfillment-controls")).toBeTruthy());

    const ship = screen.getByRole("button", { name: "Mark as Shipped" }) as HTMLButtonElement;
    fireEvent.click(ship);
    fireEvent.click(ship); // suppressed while busy
    expect(h.updateFulfillmentStatus).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", { name: "Mark as Preparing" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows a safe error AND the refreshed server state on rejection (stale transition UX)", async () => {
    const staleThenCurrent = [
      { ok: true, order: makeDetail() }, // initial open: pending
      {
        ok: true,
        order: (() => {
          const cancelled = makeDetail();
          cancelled.fulfillment = { ...cancelled.fulfillment!, status: "cancelled" };
          return cancelled; // someone else already cancelled it
        })(),
      },
    ];
    h.getCreatorOrderDetail.mockImplementation(() => Promise.resolve(staleThenCurrent.shift() ?? { ok: false }));
    h.updateFulfillmentStatus.mockResolvedValue({
      success: false,
      error: "This fulfillment was just updated elsewhere. The latest state is shown.",
    });

    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawer();
    await waitFor(() => expect(screen.getByTestId("fulfillment-controls")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Mark as Shipped" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("just updated elsewhere");
    // Truth refresh happened: the drawer now renders the ACTUAL persisted state.
    await waitFor(() => expect(h.getCreatorOrderDetail).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getAllByText("Cancelled").length).toBeGreaterThan(0));
  });

  it("never leaks raw server noise when the action throws", async () => {
    h.getCreatorOrderDetail.mockResolvedValue({ ok: true, order: makeDetail() });
    h.updateFulfillmentStatus.mockRejectedValue(new Error("prisma: P2025 connection refused"));
    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawer();
    await waitFor(() => expect(screen.getByTestId("fulfillment-controls")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Mark as Shipped" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Could not update this order.");
    expect(alert.textContent).not.toMatch(/prisma|P\d{4}/);
  });
});

describe("RCCF-72.18D.5.2-C — truth preservation around controls", () => {
  it("keeps the address and refund truth visible alongside the controls", async () => {
    const d = makeDetail();
    d.refund = { status: "PARTIAL", refundedPaise: 2500, remainingRefundablePaise: 97400, providerRefundId: "rfnd_1", refundedAt: "2026-08-02T00:00:00.000Z" };
    h.getCreatorOrderDetail.mockResolvedValue({ ok: true, order: d });
    const { container } = render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawer();
    await waitFor(() => expect(screen.getByTestId("fulfillment-controls")).toBeTruthy());

    expect(screen.getByText("Shipping address")).toBeTruthy();
    expect(screen.getByText("12 MG Road")).toBeTruthy();
    expect(screen.getByText("Partially refunded")).toBeTruthy();

    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain("providerkey");
    expect(html).not.toContain("providersecret");
    expect(html).not.toContain("paymentaccountid");
    expect(html).not.toContain('"tenantid"');
    expect(html).not.toContain("encrypted");
  });
});
