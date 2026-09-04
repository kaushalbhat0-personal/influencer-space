import Image from "next/image";
import type { MediaVariant } from "@/lib/media/variants";
import { resolveImageProps } from "@/lib/media/variants";

export interface CreatorImageProps {
  src: string | null | undefined;
  alt: string;
  variant?: MediaVariant;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  aspectRatio?: string;
  fallback?: string;
  loading?: "lazy" | "eager";
}

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1' fill='%2318181b'%3E%3Crect width='1' height='1'/%3E%3C/svg%3E";

export function CreatorImage({
  src,
  alt,
  variant = "original",
  priority = false,
  fill,
  width,
  height,
  sizes,
  className,
  aspectRatio,
  fallback,
  loading,
}: CreatorImageProps) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-800 ${className ?? ""}`}
        style={aspectRatio ? { aspectRatio } : undefined}
        role="img"
        aria-label={alt || "Placeholder image"}
      >
        <span className="text-xs text-[var(--text-muted)]">
          {fallback || alt?.[0] || "?"}
        </span>
      </div>
    );
  }

  const resolved = resolveImageProps(variant, { width, height, sizes, className, priority, fill });

  const finalWidth = width ?? resolved.width;
  const finalHeight = height ?? resolved.height;
  const finalFill = fill ?? resolved.fill ?? false;
  const finalSizes = sizes ?? resolved.sizes;
  const finalClassName = `${resolved.className} ${className ?? ""}`.trim();
  const finalLoading = priority ? "eager" : (loading ?? "lazy");

  if (finalFill) {
    return (
      <div
        className={`relative overflow-hidden ${finalClassName}`}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={finalSizes}
          priority={priority}
          loading={finalLoading}
          placeholder="blur"
          blurDataURL={PLACEHOLDER}
          className="h-full w-full object-cover"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = "none";
          }}
        />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={finalWidth}
      height={finalHeight}
      sizes={finalSizes}
      priority={priority}
      loading={finalLoading}
      placeholder="blur"
      blurDataURL={PLACEHOLDER}
      className={finalClassName}
      style={aspectRatio ? { aspectRatio } : undefined}
      onError={(e) => {
        const target = e.currentTarget;
        target.style.display = "none";
      }}
    />
  );
}
