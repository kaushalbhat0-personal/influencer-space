import type { InvoiceFilter } from "./types";

export function validateInvoiceFilter(filter: InvoiceFilter): string[] {
  const errors: string[] = [];
  if (filter.dateFrom && isNaN(Date.parse(filter.dateFrom))) {
    errors.push("Invalid dateFrom format");
  }
  if (filter.dateTo && isNaN(Date.parse(filter.dateTo))) {
    errors.push("Invalid dateTo format");
  }
  if (filter.dateFrom && filter.dateTo && filter.dateFrom > filter.dateTo) {
    errors.push("dateFrom must be before dateTo");
  }
  return errors;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
