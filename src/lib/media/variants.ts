export type MediaVariant =
  | "avatar"
  | "hero"
  | "gallery"
  | "product"
  | "card"
  | "thumbnail"
  | "logo"
  | "banner"
  | "original";

export interface VariantConfig {
  width: number;
  height: number;
  sizes: string;
  priority?: boolean;
  fill?: boolean;
  aspectRatio?: string;
  className?: string;
}

const VARIANT_MAP: Record<MediaVariant, VariantConfig> = {
  avatar: {
    width: 128,
    height: 128,
    sizes: "128px",
    className: "rounded-full object-cover",
  },
  hero: {
    width: 1600,
    height: 900,
    sizes: "(max-width: 768px) 100vw, 1600px",
    fill: true,
    className: "object-cover",
  },
  gallery: {
    width: 800,
    height: 800,
    sizes: "(max-width: 768px) 50vw, 25vw",
    aspectRatio: "1/1",
    className: "object-cover",
  },
  product: {
    width: 600,
    height: 600,
    sizes: "(max-width: 768px) 100vw, 33vw",
    aspectRatio: "1/1",
    className: "object-cover",
  },
  card: {
    width: 400,
    height: 300,
    sizes: "(max-width: 768px) 100vw, 33vw",
    aspectRatio: "4/3",
    className: "object-cover rounded-lg",
  },
  thumbnail: {
    width: 150,
    height: 150,
    sizes: "150px",
    className: "object-cover rounded",
  },
  logo: {
    width: 80,
    height: 80,
    sizes: "80px",
    className: "object-contain rounded-full",
  },
  banner: {
    width: 1200,
    height: 400,
    sizes: "100vw",
    fill: true,
    className: "object-cover",
  },
  original: {
    width: 1920,
    height: 1080,
    sizes: "100vw",
    fill: true,
    className: "object-contain",
  },
};

export function getVariant(variant: MediaVariant): VariantConfig {
  return VARIANT_MAP[variant] ?? VARIANT_MAP.original;
}

export function resolveImageProps(
  variant: MediaVariant,
  overrides?: Partial<VariantConfig>,
): VariantConfig {
  // Merge variant defaults with overrides. `undefined` override values must
  // NOT clobber the variant defaults — otherwise a caller that passes
  // `{ width: undefined, fill: undefined }` silently disables the variant's
  // required dimensions and Next/Image throws "missing required width".
  const merged: VariantConfig = { ...getVariant(variant) };
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== undefined) {
        (merged as unknown as Record<string, unknown>)[key] = value;
      }
    }
  }
  return merged;
}
