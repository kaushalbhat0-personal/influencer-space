import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";

type Provider = "instagram" | "twitch";

/**
 * Exchange an authorization code for tokens, encrypt them, and store on the tenant.
 */
export async function exchangeCodeForToken(
  provider: Provider,
  code: string,
  redirectUri: string,
  tenantId: string,
): Promise<void> {
  const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
  const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];

  if (!clientId || !clientSecret) {
    throw new Error(`${provider} OAuth credentials not configured`);
  }

  const tokenUrl =
    provider === "instagram"
      ? "https://api.instagram.com/oauth/access_token"
      : "https://id.twitch.tv/oauth2/token";

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${provider} token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  const update: Record<string, unknown> = {};

  if (data.access_token) {
    update[`${provider}AccessToken`] = encrypt(data.access_token);
  }
  if (data.refresh_token) {
    update[`${provider}RefreshToken`] = encrypt(data.refresh_token);
  }
  if (data.expires_in) {
    update[`${provider}TokenExpiry`] = new Date(
      Date.now() + data.expires_in * 1000,
    );
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: update as never,
  });
}

/**
 * Retrieve and decrypt a stored access token for a tenant.
 * Returns null if the token is missing or expired.
 */
export async function getDecryptedToken(
  tenantId: string,
  provider: Provider,
): Promise<string | null> {
  const select =
    provider === "instagram"
      ? ({ instagramAccessToken: true, instagramTokenExpiry: true } as const)
      : ({ twitchAccessToken: true, twitchTokenExpiry: true } as const);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select,
  });

  if (!tenant) return null;

  const encrypted =
    provider === "instagram"
      ? (tenant as unknown as Record<string, unknown>).instagramAccessToken
      : (tenant as unknown as Record<string, unknown>).twitchAccessToken;

  const expiry =
    provider === "instagram"
      ? (tenant as unknown as Record<string, unknown>).instagramTokenExpiry
      : (tenant as unknown as Record<string, unknown>).twitchTokenExpiry;

  if (!encrypted || typeof encrypted !== "string") return null;
  if (expiry && expiry instanceof Date && expiry < new Date()) return null;

  try {
    return decrypt(encrypted);
  } catch {
    return null;
  }
}

/**
 * Attempt to refresh an expired token.
 * Currently only Twitch supports app-based refresh flows.
 */
export async function refreshToken(
  tenantId: string,
  provider: Provider,
): Promise<string | null> {
  if (provider === "instagram") {
    // Instagram's long-lived token can be refreshed simply by making a
    // GET request — but that requires the current (possibly expired) token.
    // We attempt a refresh GET; if it fails, the admin must re-connect.
    const current = await getDecryptedToken(tenantId, "instagram");
    if (!current) return null;

    const url = new URL("https://graph.instagram.com/refresh_access_token");
    url.searchParams.set("grant_type", "ig_refresh_token");
    url.searchParams.set("access_token", current);

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = await res.json();
    if (data.access_token) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          instagramAccessToken: encrypt(data.access_token),
          instagramTokenExpiry: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000)
            : undefined,
        },
      });
      return data.access_token;
    }

    return null;
  }

  // Twitch — client-credentials grant (app access token, no user-specific refresh).
  // For user-specific Twitch tokens, this would need a refresh_token grant.
  return null;
}
