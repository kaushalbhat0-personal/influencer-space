// SEC-07 — guest order helpers (masking + token validation)
export function maskEmail(email: string | null): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const maskedLocal = local.length <= 2 ? `${local[0] ?? ""}***` : `${local[0]}***${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

export function maskPhone(phone: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `******${digits.slice(-4)}`;
}

export function maskLine1(line1: string | null): string {
  if (!line1) return "—";
  if (line1.length <= 8) return `${line1.slice(0, 2)}***`;
  return `${line1.slice(0, 8)}***`;
}

export function isValidGuestToken(token: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(token);
}
