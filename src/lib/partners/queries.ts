import type { PartnerType, PartnerStatus } from "./constants";
import type { Partner, PartnerQuery } from "./types";

export interface PartnerFilter {
  search?: string;
  type?: PartnerType;
  status?: PartnerStatus;
  country?: string;
  planCode?: string;
  minWorkspaceCount?: number;
  maxWorkspaceCount?: number;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface PartnerSort {
  by: "name" | "createdAt" | "workspaceCount" | "status";
  order: "asc" | "desc";
}

export function buildPartnerFilter(query: PartnerQuery): PartnerFilter {
  const filter: PartnerFilter = {};
  if (query.search) filter.search = query.search;
  if (query.type) filter.type = query.type;
  if (query.status) filter.status = query.status;
  if (query.country) filter.country = query.country;
  if (query.planCode) filter.planCode = query.planCode;
  if (query.minWorkspaceCount !== undefined) filter.minWorkspaceCount = query.minWorkspaceCount;
  if (query.maxWorkspaceCount !== undefined) filter.maxWorkspaceCount = query.maxWorkspaceCount;
  if (query.createdAfter) filter.createdAfter = new Date(query.createdAfter);
  if (query.createdBefore) filter.createdBefore = new Date(query.createdBefore);
  return filter;
}

export function buildPartnerSort(query: PartnerQuery): PartnerSort {
  return {
    by: query.sortBy ?? "createdAt",
    order: query.sortOrder ?? "desc",
  };
}

export function applyPartnerFilter(partners: Partner[], filter: PartnerFilter): Partner[] {
  let result = [...partners];
  if (filter.search) {
    const q = filter.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.profile.businessName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );
  }
  if (filter.type) result = result.filter((p) => p.type === filter.type);
  if (filter.status) result = result.filter((p) => p.status === filter.status);
  if (filter.country) result = result.filter((p) => p.profile.country === filter.country);
  return result;
}

export function applyPartnerSort(partners: Partner[], sort: PartnerSort): Partner[] {
  const sorted = [...partners];
  sorted.sort((a, b) => {
    let cmp = 0;
    if (sort.by === "name") cmp = a.profile.businessName.localeCompare(b.profile.businessName);
    else if (sort.by === "createdAt") cmp = a.createdAt.localeCompare(b.createdAt);
    else if (sort.by === "status") cmp = a.status.localeCompare(b.status);
    if (sort.order === "desc") cmp = -cmp;
    return cmp;
  });
  return sorted;
}

export function paginatePartners(partners: Partner[], limit = 20, offset = 0): { items: Partner[]; total: number; hasMore: boolean } {
  const total = partners.length;
  const items = partners.slice(offset, offset + limit);
  return { items, total, hasMore: offset + limit < total };
}
