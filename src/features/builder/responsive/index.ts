export type DeviceType = "desktop" | "tablet" | "mobile";

export interface DeviceConfig {
  type: DeviceType;
  width: number;
  height: number;
  label: string;
  icon: string;
}

export const DEVICES: Record<DeviceType, DeviceConfig> = {
  desktop: { type: "desktop", width: 1440, height: 900, label: "Desktop", icon: "Monitor" },
  tablet: { type: "tablet", width: 768, height: 1024, label: "Tablet", icon: "Tablet" },
  mobile: { type: "mobile", width: 375, height: 812, label: "Mobile", icon: "Smartphone" },
};

export interface ResponsiveValue<T> {
  desktop: T;
  tablet?: T;
  mobile?: T;
}

export function getResponsiveValue<T>(rv: ResponsiveValue<T> | undefined, device: DeviceType): T | undefined {
  if (!rv) return undefined;
  if (device === "desktop") return rv.desktop;
  if (device === "tablet") return rv.tablet ?? rv.desktop;
  return rv.mobile ?? rv.tablet ?? rv.desktop;
}

export function setResponsiveValue<T>(
  rv: ResponsiveValue<T>,
  device: DeviceType,
  value: T,
): ResponsiveValue<T> {
  return { ...rv, [device]: value };
}
