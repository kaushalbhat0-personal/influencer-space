// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";

// RCCF-70.6.5.1 — unified admin topbar publish control.
//
// Behavior + source-truth tests. The control must:
//  - reuse the canonical publishWebsite()/getPublishStatus() server actions,
//  - take NO tenant/website/agency parameters (tenant comes from the session),
//  - hide itself when the site is live (state "published"),
//  - show a concise inline error (no new notification framework),
//  - guard against duplicate publish clicks,
//  - add no new server action, prisma path, or publishing service.

const h = vi.hoisted(() => ({
  mockPublishWebsite: vi.fn(),
  mockGetPublishStatus: vi.fn(),
  mockRouterRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/dashboard",
  useRouter: () => ({ refresh: h.mockRouterRefresh }),
}));

vi.mock("@/actions/publish.actions", () => ({
  publishWebsite: h.mockPublishWebsite,
  getPublishStatus: h.mockGetPublishStatus,
}));

const LIVE_STATUS = { state: "live", storefrontUrl: "/testcreator" };

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  h.mockPublishWebsite.mockResolvedValue({ success: true });
  h.mockGetPublishStatus.mockResolvedValue({ success: true, status: LIVE_STATUS });
});

import { AdminPublishControl } from "@/app/admin/_components/admin-publish-control";

describe("RCCF-70.6.5.1 — publish control behavior", () => {
  it("A. hides the Publish button when the site is live", () => {
    render(<AdminPublishControl status="published" size="md" />);
    expect(screen.getByText("Live")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /publish/i })).toBeNull();
  });

  it("B. shows the status badge and a Publish button when unpublished", () => {
    render(<AdminPublishControl status="draft" size="md" />);
    expect(screen.getByText("Draft")).toBeTruthy();
    expect(screen.getByRole("button", { name: /publish/i })).toBeTruthy();
  });

  it("B2. shows 'Changes pending' plus a Publish button when the site is outdated", () => {
    render(<AdminPublishControl status="outdated" size="md" />);
    expect(screen.getByText("Changes pending")).toBeTruthy();
    expect(screen.getByRole("button", { name: /publish/i })).toBeTruthy();
  });

  it("C. publishes via the canonical action, disabling the button and showing 'Publishing...'", async () => {
    render(<AdminPublishControl status="draft" size="md" />);
    fireEvent.click(screen.getByRole("button", { name: /publish/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /publishing\.\.\./i })).toBeTruthy());
    expect(h.mockPublishWebsite).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", { name: /publishing\.\.\./i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("D. refreshes status after success; re-rendered live hides the button", async () => {
    const { rerender } = render(<AdminPublishControl status="draft" size="md" />);
    fireEvent.click(screen.getByRole("button", { name: /publish/i }));
    await waitFor(() => expect(h.mockGetPublishStatus).toHaveBeenCalledTimes(1));
    expect(h.mockPublishWebsite).toHaveBeenCalledTimes(1);
    expect(h.mockRouterRefresh).toHaveBeenCalledTimes(1);
    rerender(<AdminPublishControl status="published" size="md" />);
    expect(screen.queryByRole("button", { name: /publish/i })).toBeNull();
    expect(screen.getByText("Live")).toBeTruthy();
  });

  it("E. shows a concise inline error on failure, keeps the state retryable, and does not refresh status", async () => {
    h.mockPublishWebsite.mockResolvedValue({ success: false, error: "Publish quota exceeded" });
    render(<AdminPublishControl status="outdated" size="md" />);
    expect(screen.getByText("Changes pending")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /publish/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByText(/quota exceeded/i)).toBeTruthy();
    expect(h.mockGetPublishStatus).not.toHaveBeenCalled();
    expect(h.mockRouterRefresh).not.toHaveBeenCalled();
    const retry = screen.getByRole("button", { name: /publish/i });
    expect((retry as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(retry);
    expect(h.mockPublishWebsite).toHaveBeenCalledTimes(2);
  });

  it("F. guards against duplicate clicks during publishing", async () => {
    render(<AdminPublishControl status="draft" size="md" />);
    const btn = screen.getByRole("button", { name: /publish/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    await waitFor(() => expect(h.mockPublishWebsite).toHaveBeenCalledTimes(1));
  });

  it("sm variant renders an icon-only button with an accessible label", () => {
    render(<AdminPublishControl status="draft" size="sm" />);
    expect(screen.getByRole("button", { name: "Publish website" })).toBeTruthy();
  });
});

describe("RCCF-70.6.5.1 — source truths", () => {
  const controlSource = readFileSync("src/app/admin/_components/admin-publish-control.tsx", "utf8");

  it("G. passes no tenant/website/agency parameters to publishWebsite()", () => {
    expect(controlSource).toContain("publishWebsite()");
    expect(controlSource).not.toMatch(/publishWebsite\(\s*\w/);
    expect(controlSource).not.toContain("tenantId");
    expect(controlSource).not.toContain("websiteId");
    expect(controlSource).not.toContain("agencyId");
  });

  it("H. the Builder still publishes through the same canonical action", () => {
    const workspaceSource = readFileSync("src/features/builder/components/workspace.tsx", "utf8");
    expect(workspaceSource).toContain('publishWebsite } from "@/actions/publish.actions"');
    expect(workspaceSource).toContain("publishWebsite()");
  });

  it("I. adds no new server-side publish path", () => {
    expect(controlSource).not.toContain('"use server"');
    expect(controlSource).not.toContain("prisma.");
    expect(controlSource).not.toContain("PublishingService");
    const actionsSource = readFileSync("src/actions/publish.actions.ts", "utf8");
    expect(actionsSource).toContain('"use server"');
    expect(actionsSource).toContain("export async function publishWebsite");
  });
});