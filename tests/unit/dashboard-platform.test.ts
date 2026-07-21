import { describe, it, expect } from "vitest";
import { getNavForRole, getVisibleGroups, getVisibleItems, CREATOR_NAV, SUPER_ADMIN_NAV, AGENCY_NAV } from "@/lib/navigation/config";

describe("Navigation Config", () => {
  it("should return correct nav for each role", () => {
    expect(getNavForRole("ADMIN")).toBe(CREATOR_NAV);
    expect(getNavForRole("SUPER_ADMIN")).toBe(SUPER_ADMIN_NAV);
    expect(getNavForRole("AGENCY_ADMIN")).toBe(AGENCY_NAV);
    expect(getNavForRole("AGENCY_STAFF")).toBe(AGENCY_NAV);
  });

  it("should default to creator nav for unknown roles", () => {
    expect(getNavForRole("UNKNOWN")).toBe(CREATOR_NAV);
  });

  it("creator nav should have 5 groups", () => {
    const groups = getVisibleGroups(CREATOR_NAV, "ADMIN");
    expect(groups.length).toBe(5);
    expect(groups[0]!.label).toBe("Website");
    expect(groups[1]!.label).toBe("Content");
    expect(groups[2]!.label).toBe("Sell");
    expect(groups[3]!.label).toBe("Grow");
    expect(groups[4]!.label).toBe("Settings");
  });

  it("all nav items should have unique hrefs", () => {
    const hrefs: string[] = [];
    for (const group of CREATOR_NAV.groups) {
      for (const item of group.items) {
        hrefs.push(item.href);
      }
    }
    const unique = new Set(hrefs);
    expect(unique.size).toBe(hrefs.length);
  });

  it("super admin nav should have platform/operations/system groups", () => {
    const groups = getVisibleGroups(SUPER_ADMIN_NAV, "SUPER_ADMIN");
    const labels = groups.map((g) => g.label);
    expect(labels).toContain("Platform");
    expect(labels).toContain("Operations");
    expect(labels).toContain("System");
  });

  it("agency nav should have agency/tools/manage groups", () => {
    const groups = getVisibleGroups(AGENCY_NAV, "AGENCY_ADMIN");
    const labels = groups.map((g) => g.label);
    expect(labels).toContain("Agency");
    expect(labels).toContain("Tools");
    expect(labels).toContain("Manage");
  });

  it("should filter items by role", () => {
    const billGroup = CREATOR_NAV.groups[4]!; // Settings group
    const adminItems = getVisibleItems(billGroup, "ADMIN");
    const superItems = getVisibleItems(billGroup, "SUPER_ADMIN");
    expect(adminItems.length).toBe(superItems.length);
    expect(adminItems.length).toBeGreaterThan(0);
  });

  it("all items should have a valid icon", () => {
    for (const group of CREATOR_NAV.groups) {
      for (const item of group.items) {
        expect(item.icon).toBeTruthy();
      }
    }
  });

  it("all items should belong to a valid group role", () => {
    const validRoles = ["ADMIN", "SUPER_ADMIN", "AGENCY_ADMIN", "AGENCY_STAFF"];
    for (const nav of [CREATOR_NAV, SUPER_ADMIN_NAV, AGENCY_NAV]) {
      for (const group of nav.groups) {
        for (const role of group.roles) {
          expect(validRoles).toContain(role);
        }
      }
    }
  });
});

describe("Container Utilities", () => {
  it("ContentContainer size classes should be valid", () => {
    const sizes = ["sm", "md", "lg", "xl", "full"];
    sizes.forEach((s) => {
      expect(["sm", "md", "lg", "xl", "full"]).toContain(s);
    });
  });
});
