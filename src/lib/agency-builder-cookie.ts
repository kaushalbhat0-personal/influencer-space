import crypto from "crypto";

const COOKIE_NAME = "__agency_client";
const COOKIE_TTL = 60 * 60; // 1 hour — builder session window
const CURRENT_VERSION = 1;

function getKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required");
  return crypto.createHash("sha256").update(secret).digest();
}

export interface AgencyBuilderPayload {
  v: number;
  tenantId: string;
  agencyId: string;
  uid: string;
  iat: number;
  exp: number;
}

export function encodeAgencyBuilderCookie(payload: Omit<AgencyBuilderPayload, "v" | "iat" | "exp">): string {
  const data: AgencyBuilderPayload = {
    v: CURRENT_VERSION,
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + COOKIE_TTL,
  };
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64url");
}

export function decodeAgencyBuilderCookie(cookie: string): AgencyBuilderPayload | null {
  try {
    const key = getKey();
    const combined = Buffer.from(cookie, "base64url");
    const iv = combined.subarray(0, 12);
    const tag = combined.subarray(12, 28);
    const encrypted = combined.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = decipher.update(encrypted) + decipher.final("utf8");
    const data = JSON.parse(decrypted) as AgencyBuilderPayload;
    if (data.v !== CURRENT_VERSION) return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export function getAgencyBuilderCookieName(): string {
  return COOKIE_NAME;
}

export function getAgencyBuilderCookieTtl(): number {
  return COOKIE_TTL;
}

export function getAgencyBuilderCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_TTL,
  };
}

export const __testables = {
  encode: encodeAgencyBuilderCookie,
  decode: decodeAgencyBuilderCookie,
  COOKIE_NAME,
  COOKIE_TTL,
};
