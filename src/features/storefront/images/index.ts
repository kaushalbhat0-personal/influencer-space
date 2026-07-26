export interface ResponsiveImageConfig {
  src: string;
  alt: string;
  widths: number[];
  sizes: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
  quality?: number;
  format?: "webp" | "avif" | "original";
}

export function buildSrcSet(src: string, widths: number[], format?: string): string {
  return widths
    .map((w) => {
      const ext = format === "webp" ? ".webp" : format === "avif" ? ".avif" : "";
      const base = src.replace(/\.[^.]+$/, "");
      return `${base}${ext}?w=${w} ${w}w`;
    })
    .join(", ");
}

export function getPlaceholderBlurHash(_src: string): string {
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cfilter%3E%3CfeGaussianBlur stdDeviation='20'/%3E%3C/filter%3E%3Crect width='100' height='100' fill='%2318181b'/%3E%3C/svg%3E")`;
}

export function isCdnReady(url: string): boolean {
  return url.startsWith("https://") || url.startsWith("//");
}

export function getOptimalImageFormat(): "webp" | "avif" {
  if (typeof window === "undefined") return "webp";
  const canvas = document.createElement("canvas");
  if (canvas.toDataURL("image/avif").startsWith("data:image/avif")) return "avif";
  return "webp";
}

export function supportsWebP(): boolean {
  if (typeof window === "undefined") return true;
  const canvas = document.createElement("canvas");
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

export function calculateAspectRatio(width: number, height: number): number {
  return width / height;
}

export function getBestFitWidth(containerWidth: number, breakpoints: number[]): number {
  return breakpoints.find((bp) => bp >= containerWidth) ?? breakpoints[breakpoints.length - 1];
}
