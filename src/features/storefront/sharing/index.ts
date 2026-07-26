export function generateShareUrl(domain: string, slug: string): string {
  const base = `https://${domain}`;
  return slug === "home" ? base : `${base}/${slug}`;
}

export function generateOpenGraphImageUrl(
  title: string,
  tagline?: string,
  avatarUrl?: string | null,
): string {
  const params = new URLSearchParams({ title });
  if (tagline) params.set("tagline", tagline);
  if (avatarUrl) params.set("avatar", avatarUrl);
  return `/api/og?${params.toString()}`;
}

export function generateQrCodeDataUrl(url: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(url)}`;
}

export function getSocialShareLinks(url: string, title: string): Record<string, string> {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
  };
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return Promise.resolve(false);
  return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
}
