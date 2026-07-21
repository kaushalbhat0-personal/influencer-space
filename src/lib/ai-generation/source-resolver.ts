/**
 * Source Resolver v1.0.0
 *
 * Parses creator URLs and detects the platform.
 * Returns a normalized ResolvedSource with platform, identifier, and confidence.
 */

import type { ResolvedSource, CreatorPlatform } from "./types";
import { BaseAppService } from "@/lib/application/base";
import type { ServiceResult } from "@/lib/application/types";

const PLATFORM_PATTERNS: Array<{
  platform: CreatorPlatform;
  patterns: RegExp[];
  identifierExtractor: (match: RegExpMatchArray) => string;
}> = [
  {
    platform: "youtube",
    patterns: [
      /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/@([a-zA-Z0-9_-]+)/,
      /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/([a-zA-Z0-9_-]+)/,
      /youtu\.be\/([a-zA-Z0-9_-]+)/,
    ],
    identifierExtractor: (m) => m[1] ?? "",
  },
  {
    platform: "instagram",
    patterns: [
      /instagram\.com\/([a-zA-Z0-9_.]+)\/?$/,
      /instagram\.com\/([a-zA-Z0-9_.]+)\/(?:reel|p|tv|stories)/,
      /instagram\.com\/([a-zA-Z0-9_.]+)/,
    ],
    identifierExtractor: (m) => m[1] ?? "",
  },
  {
    platform: "google_business",
    patterns: [
      /google\.com\/maps\/place\/([^/]+)/,
      /google\.com\/business\/profile/,
    ],
    identifierExtractor: (m) => m[1] ?? "",
  },
  {
    platform: "tiktok",
    patterns: [
      /tiktok\.com\/@([a-zA-Z0-9_.]+)/,
    ],
    identifierExtractor: (m) => m[1] ?? "",
  },
];

const HANDLE_PATTERNS: Array<{
  platform: CreatorPlatform;
  prefixes: string[];
  minLength: number;
}> = [
  { platform: "youtube", prefixes: ["@", "channel/", "c/", "user/"], minLength: 3 },
  { platform: "instagram", prefixes: ["@"], minLength: 3 },
  { platform: "tiktok", prefixes: ["@"], minLength: 3 },
];

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.match(/^https?:\/\//)) return trimmed;
  if (trimmed.startsWith("@")) {
    const afterAt = trimmed.slice(1);
    if (afterAt.match(/^[a-zA-Z0-9_.-]+$/)) return `https://www.youtube.com/@${afterAt}`;
  }
  return trimmed;
}

export class SourceResolver extends BaseAppService {
  constructor() {
    super("SourceResolver");
  }

  resolve(rawInput: string): ServiceResult<ResolvedSource> {
    try {
      const input = normalizeUrl(rawInput);

      for (const { platform, patterns, identifierExtractor } of PLATFORM_PATTERNS) {
        for (const pattern of patterns) {
          const match = input.match(pattern);
          if (match) {
            const identifier = identifierExtractor(match);
            if (!identifier) continue;

            const isHandle = !input.match(/^https?:\/\//) || input.includes("@");

            return this.success({
              platform,
              identifier,
              normalizedUrl: input.match(/^https?:\/\//)
                ? input
                : `https://${input}`,
              confidence: isHandle ? 0.8 : 0.95,
              rawInput,
            });
          }
        }
      }

      for (const { platform, prefixes } of HANDLE_PATTERNS) {
        for (const prefix of prefixes) {
          if (input.startsWith(prefix)) {
            return this.success({
              platform,
              identifier: input,
              normalizedUrl: input,
              confidence: 0.6,
              rawInput,
            });
          }
        }
      }

      if (input.match(/^[a-zA-Z0-9_.-]+$/)) {
        return this.success({
          platform: "manual",
          identifier: input,
          normalizedUrl: input,
          confidence: 0.4,
          rawInput,
        });
      }

      return this.failed(
        new Error(`Could not detect platform from input: "${rawInput}"`),
        "Source"
      );
    } catch (error) {
      return this.failed(error, "Source");
    }
  }
}

export const sourceResolver = new SourceResolver();
