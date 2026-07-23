import crypto from "crypto";

const COOKIE_NAME = "__workspace";
const CURRENT_VERSION = 1;
const COOKIE_TTL = 7 * 24 * 60 * 60; // 7 days

function getEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for workspace cookie");
  return crypto.createHash("sha256").update(secret).digest();
}

export interface WorkspaceCookiePayload {
  v: 1;
  wid: string;
  role: string;
  type: string;
  iat: number;
  exp: number;
}

export class WorkspaceCookie {
  static encode(payload: Omit<WorkspaceCookiePayload, "v" | "iat" | "exp">): string {
    const data: WorkspaceCookiePayload = {
      v: CURRENT_VERSION,
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + COOKIE_TTL,
    };
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, tag, encrypted]);
    return combined.toString("base64url");
  }

  static decode(cookie: string): WorkspaceCookiePayload | null {
    try {
      const key = getEncryptionKey();
      const combined = Buffer.from(cookie, "base64url");
      const iv = combined.subarray(0, 16);
      const tag = combined.subarray(16, 32);
      const encrypted = combined.subarray(32);
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      const decrypted = decipher.update(encrypted) + decipher.final("utf8");
      const data = JSON.parse(decrypted) as WorkspaceCookiePayload;
      if (data.v !== CURRENT_VERSION) return null;
      if (data.exp < Math.floor(Date.now() / 1000)) return null;
      return data;
    } catch {
      return null;
    }
  }

  static get cookieName(): string {
    return COOKIE_NAME;
  }

  static get cookieOptions(): { httpOnly: boolean; secure: boolean; sameSite: "lax"; path: string; maxAge: number } {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_TTL,
    };
  }
}
