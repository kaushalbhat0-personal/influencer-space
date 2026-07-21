/**
 * Platform Contracts v1.0.0
 *
 * Stable public interfaces for all CreatorOS subsystems.
 * Consumers import from here for guaranteed API stability.
 */

export type {
  BuilderAPI,
  ThemeAPI,
  PreviewAPI,
  RenderingAPI,
  PluginAPI,
  TelemetryAPI,
  PlatformDiagnosticsReport,
} from "../api/platform";

export type { ContentAPI } from "@/lib/content/api";

export const PLATFORM_CONTRACT_VERSION = "1.0.0";
