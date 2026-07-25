import type { PartnerType, PartnerStatus, PartnerRole } from "./constants";
import { PARTNER_TYPES, PARTNER_STATUSES, PARTNER_ROLES } from "./constants";

export function validatePartnerType(value: string): value is PartnerType {
  return (PARTNER_TYPES as readonly string[]).includes(value);
}

export function validatePartnerStatus(value: string): value is PartnerStatus {
  return (PARTNER_STATUSES as readonly string[]).includes(value);
}

export function validatePartnerRole(value: string): value is PartnerRole {
  return (PARTNER_ROLES as readonly string[]).includes(value);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePartnerProfile(data: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (data.businessName !== undefined && typeof data.businessName !== "string") {
    errors.push("businessName must be a string");
  }
  if (data.website !== undefined && data.website !== null && typeof data.website === "string") {
    try { new URL(data.website); } catch { errors.push("website must be a valid URL"); }
  }
  if (data.supportEmail !== undefined && data.supportEmail !== null && typeof data.supportEmail === "string") {
    if (!validateEmail(data.supportEmail)) errors.push("supportEmail must be a valid email");
  }
  if (data.taxIdentifier !== undefined && typeof data.taxIdentifier !== "string") {
    errors.push("taxIdentifier must be a string");
  }
  return errors;
}

export function validateCreatePartner(data: { type: string; businessName: string; email: string }): string[] {
  const errors: string[] = [];
  if (!validatePartnerType(data.type)) errors.push(`Invalid partner type: ${data.type}`);
  if (!data.businessName?.trim()) errors.push("businessName is required");
  if (!validateEmail(data.email)) errors.push("email must be valid");
  return errors;
}

export function validateCreateInvite(data: { email: string; role: string; message?: string }): string[] {
  const errors: string[] = [];
  if (!validateEmail(data.email)) errors.push("email must be valid");
  if (!validatePartnerRole(data.role)) errors.push(`Invalid role: ${data.role}`);
  if (data.message && data.message.length > 500) errors.push("message must be under 500 characters");
  return errors;
}

export function validateWorkspaceAssignment(data: { workspaceId: string; reason: string }): string[] {
  const errors: string[] = [];
  if (!data.workspaceId?.trim()) errors.push("workspaceId is required");
  const validReasons = ["created", "transferred", "claimed", "administrative"];
  if (!validReasons.includes(data.reason)) errors.push(`Invalid reason: ${data.reason}`);
  return errors;
}

export function validateTransferWorkspace(data: { targetPartnerId: string; reason: string }): string[] {
  const errors: string[] = [];
  if (!data.targetPartnerId?.trim()) errors.push("targetPartnerId is required");
  const validReasons = ["administrative", "transferred"];
  if (!validReasons.includes(data.reason)) errors.push(`Invalid reason: ${data.reason}`);
  return errors;
}

export function canTransitionStatus(current: PartnerStatus, target: PartnerStatus): boolean {
  const transitions: Record<PartnerStatus, PartnerStatus[]> = {
    pending: ["active", "suspended", "disabled"],
    active: ["suspended", "disabled", "archived"],
    suspended: ["active", "disabled"],
    disabled: [],
    invited: ["active"],
    archived: [],
  };
  return transitions[current]?.includes(target) ?? false;
}
