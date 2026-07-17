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

  const domain = agencyDomain
    ? `${agencyDomain}.creatorshop.io`
    : "creatorshop.io";

  return `creator_${handle}@${domain}`;
}
