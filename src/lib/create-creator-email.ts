// src/lib/create-creator-email.ts

export function generateCreatorEmail(
  youtubeHandle: string,
  agencyDomain?: string,
): string {
  const cleaned = youtubeHandle
    .replace(/^@/, "")
    .trim()
    .toLowerCase();

  const sanitized = cleaned.replace(/[^a-z0-9_-]/g, "");

  const handle = sanitized || `creator_${Date.now().toString(36)}`;

  const baseDomain = process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN || process.env.PLATFORM_BASE_DOMAIN || "creatorspace.app";
  const domain = agencyDomain
    ? `${agencyDomain}.${baseDomain}`
    : baseDomain;

  return `creator_${handle}@${domain}`;
}
