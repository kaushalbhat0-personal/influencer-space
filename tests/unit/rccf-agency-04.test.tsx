import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function read(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

describe("RCCF-AGENCY-04 — Agency Workspace Pilot UX", () => {
  it("AGENCY_NAV uses agency-neutral labels and no misleading New badges", async () => {
    const { AGENCY_NAV } = await import("@/lib/navigation/config");
    const labels = AGENCY_NAV.groups.flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toContain("New Client Website");
    expect(labels).not.toContain("Creator Import");
    // No badges on agency nav — remove fake new tags
    const badges = AGENCY_NAV.groups.flatMap((g) => g.items.map((i) => i.badge).filter(Boolean));
    expect(badges.length).toBe(0);
  });

  it("Dashboard is agency-oriented, capacity surfaced, primary CTA clear", () => {
    const content = read("src/app/agency/page.tsx");
    expect(content).toContain("Agency Workspace");
    expect(content).toContain("Build and manage client websites");
    expect(content).toContain("New Client Website");
    expect(content).toContain('href="/agency/generate"');
    expect(content).not.toContain("Creator Import");
    expect(content).toContain("getAgencyClientCapacity");
    expect(content).toContain("Capacity");
    expect(content).toContain("No client websites yet");
    expect(content).toContain("Create Client Website");
    // Header should not be generic Manage your clients...
    expect(content).not.toContain("Manage your clients and their websites.");
  });

  it("Clients page is client-website oriented with actionable empty", () => {
    const content = read("src/app/agency/clients/page.tsx");
    expect(content).toContain("All your managed client websites");
    expect(content).toContain("New Client Website");
    expect(content).toContain('href="/agency/generate"');
    expect(content).not.toContain("All your managed creator clients");
    expect(content).toContain("No client websites yet");
  });

  it("Websites and Domains use Client terminology and actionable empties", () => {
    const websites = read("src/app/agency/websites/page.tsx");
    expect(websites).toContain("All managed client websites");
    expect(websites).toContain("No client websites yet");
    expect(websites).toContain("Create Client Website");
    const table = read("src/app/agency/websites/_components/websites-table.tsx");
    expect(table).toContain('header: "Client"');
    expect(table).not.toContain('header: "Creator"');
    expect(table).toContain('header: "Status"');
    const domains = read("src/app/agency/domains/page.tsx");
    expect(domains).toContain("Custom domains across your client websites");
    expect(domains).toContain('label="Client Websites"');
    expect(domains).toContain("No client websites yet");
    expect(domains).toContain("Create Client Website");
    expect(domains).toContain("overflow-x-auto");
    expect(domains).not.toContain("Managed Creators");
  });

  it("Billing is client-website oriented, policy honest", () => {
    const content = read("src/app/agency/billing/page.tsx");
    expect(content).toContain("Your partner plan and the client websites you manage");
    expect(content).not.toContain("creators you manage");
    expect(content).toContain('label="Client Websites"');
    expect(content).toContain('label="Client Subscriptions"');
    expect(content).toContain("Client Subscription Policy");
    expect(content).toContain("Every client pays");
    expect(content).toContain("subscriptions billed by");
    expect(content).not.toContain("Creator Subscription Policy");
    expect(content).toContain("No client subscriptions yet");
  });

  it("Analytics empty is actionable and client-website oriented", () => {
    const content = read("src/app/agency/analytics/page.tsx");
    expect(content).toContain("No client websites yet");
    expect(content).not.toContain("onboard creators");
    expect(content).toContain("Create your first client website");
  });

  it("Agency tables header duplication fixed", () => {
    const clientsTable = read("src/app/agency/_components/agency-clients-table.tsx");
    // Should have Client and Client Status, not duplicate Client
    expect(clientsTable).toContain('header: "Client Status"');
    const headers = [...clientsTable.matchAll(/header:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(headers.filter((h) => h === "Client").length).toBe(1);
  });

  it("Generate page is New Client Website, not Creator Import", () => {
    const page = read("src/app/agency/generate/page.tsx");
    expect(page).toContain("New Client Website");
    expect(page).not.toContain("Creator Import");
    expect(page).toContain("we intelligently build the site");
    const client = read("src/app/agency/generate/_components/creator-import-client.tsx");
    expect(client).toContain("New Client Website");
    expect(client).toContain("Client Business Name");
    expect(client).toContain("Client Contact Email");
    expect(client).toContain("Client Source");
    expect(client).not.toContain("Creator Import");
    // How it works should be client-oriented
    expect(client).toContain("Give Pendallo information about the client");
  });

  it("Revenue and Success sections have actionable empty states", () => {
    const revenue = read("src/app/agency/_components/agency-revenue-section.tsx");
    expect(revenue).toContain("Recurring revenue appears after you onboard clients");
    expect(revenue).toContain("Create Client Website");
    expect(revenue).toContain("client subscriptions only");
    expect(revenue).not.toContain("creator subscriptions only");
    const success = read("src/app/agency/_components/agency-success-section.tsx");
    expect(success).toContain("Client success insights appear");
    expect(success).toContain("Create Client Website");
  });

  it("Mobile: layout has responsive container and no overflow hacks", () => {
    const layout = read("src/app/agency/layout.tsx");
    expect(layout).toContain("min-w-0");
    const sidebar = read("src/components/layout/Sidebar.tsx");
    expect(sidebar).toContain("hidden lg:flex");
    expect(sidebar).toContain("fixed top-3 left-3 z-50");
    expect(sidebar).toContain("lg:hidden");
  });

  it("Authorization preserved: canMutate / requireAgencyActive not removed", () => {
    const billing = read("src/app/agency/billing/page.tsx");
    expect(billing).toContain("canMutate");
    const clientsDetail = read("src/app/agency/clients/[id]/page.tsx");
    expect(clientsDetail).toContain("assertAgencyOwnsTenant");
    const portal = read("src/app/agency/portal/[tenantId]/page.tsx");
    expect(portal).toContain("assertAgencyOwnsTenant");
  });
});
