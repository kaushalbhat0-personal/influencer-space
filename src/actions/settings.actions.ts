"use server";
import type { SettingsActionState } from "./settings.types";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { SettingsService } from "@/services/settings.service";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { captureError } from "@/lib/observability/error-tracker";
import { afterContentChange } from "@/lib/publishing/content-change";
import { assertAnyCapability } from "@/modules/billing/application/capability-gates";
import { mediaService } from "@/lib/media/service";

async function requireAuth(tenantId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN" && session.user.tenantId !== tenantId) {
    throw new Error("Forbidden");
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * RCCF-72.12 — conservative technical-error classifier for hero write failures
 * (same rule as `publish-error-messages.ts`): known product-readable sentences
 * pass through verbatim; raw Prisma/DB/provider internals collapse to a safe
 * generic message so creators never see validation/database internals, stack
 * traces, or zod messages. Never returns an empty string.
 */
const HERO_SAVE_TECHNICAL_HINTS = [
  "prisma",
  "sql",
  "database",
  "postgres",
  "relation",
  "query",
  "connection",
  "socket",
  "econnrefused",
  "econnreset",
  "etimedout",
  "enotfound",
  "eaddrinfo",
  "timeout",
  "timed out",
  "provider",
  "stack trace",
  "internal server error",
  "constraint",
  "foreign key",
  "unique constraint",
  "typeerror",
  "referenceerror",
  "is not a function",
  "is not defined",
  "cannot read properties",
  "failed to parse",
  "failed to fetch",
];

const HERO_SAVE_GENERIC_ERROR = "Unable to save your hero settings. Please try again.";

function safeHeroSaveError(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message) return HERO_SAVE_GENERIC_ERROR;
  const lower = message.toLowerCase();
  if (HERO_SAVE_TECHNICAL_HINTS.some((hint) => lower.includes(hint))) {
    return HERO_SAVE_GENERIC_ERROR;
  }
  return message;
}

const HERO_SAVE_VALIDATION_ERROR =
  "Unable to save your hero settings. Please review your changes and try again.";

/**
 * RCCF-67.3 — the hero video must be ASSET-BACKED. A raw client-supplied URL
 * can never become a hero-video authority: the referenced asset must exist,
 * belong to the session tenant, be ACTIVE, and pass the canonical RCCF-59 hero
 * validation (12 MB / 15 s / MP4-QuickTime, server-verified bytes + duration).
 * Clearing the video (empty/null) is always allowed.
 */
async function assertHeroVideoWrite(tenantId: string, sparse: Record<string, unknown>): Promise<void> {
  const videoUrl = sparse.videoUrl;
  const videoAssetId = sparse.videoAssetId;

  const settingVideoUrl = typeof videoUrl === "string" ? videoUrl : "";
  const settingVideoAssetId = typeof videoAssetId === "string" ? videoAssetId : "";

  // No video change (absent or clearing) — nothing to enforce.
  if (!settingVideoUrl && !settingVideoAssetId) return;

  // A raw URL without an owned, validated asset is rejected.
  if (!settingVideoAssetId || !UUID_RE.test(settingVideoAssetId)) {
    throw new Error("Hero video must reference an uploaded asset.");
  }

  await mediaService.assertHeroVideoAsset(tenantId, settingVideoAssetId);
}

/**
 * RCCF-72.12 — NULL / OPTIONAL SEMANTICS for hero writes.
 *
 * The persistence contract (`SettingsService.patchHeroData` JSONB merge) treats
 * JSON `null` as "remove this key" — the canonical way a creator CLEARS a hero
 * field. The action layer then normalizes empty strings to JSON null so cleared
 * FormData/state values reach the same delete-key path.
 *
 * Canonical states at the action boundary:
 *   - field OMITTED (undefined)  → leave unchanged (sparse patch, no key sent).
 *   - field = null               → explicit CLEAR → JSON null → key removed.
 *   - field = "" (empty string)  → normalized to JSON null → same CLEAR result.
 *
 * Every string hero field is therefore `nullable().optional()` so the server
 * explicitly accepts the cleared state instead of relying on client coercion
 * (72.1-F1: an absent profile picture was sent as explicit `null` and rejected
 * by `z.string().optional()`, so "Save Identity" always failed with
 * "Invalid hero data").
 */
const heroPartialSchema = z.object({
  videoUrl: z.string().nullable().optional(),
  posterUrl: z.string().nullable().optional(),
  videoAssetId: z.string().nullable().optional(),
  posterAssetId: z.string().nullable().optional(),
  backgroundUrl: z.string().nullable().optional(),
  backgroundAssetId: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  profilePictureUrl: z.string().nullable().optional(),
  profilePictureAssetId: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  tagline: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  ctaText: z.string().nullable().optional(),
  ctaLink: z.string().nullable().optional(),
  ctaSecondaryText: z.string().nullable().optional(),
  ctaSecondaryLink: z.string().nullable().optional(),
  liveBadgeText: z.string().nullable().optional(),
  showLiveBadge: z.preprocess(
    (v) => {
      if (v === "on" || v === "true") return true;
      if (v === "false") return false;
      return v;
    },
    z.boolean().optional(),
  ),
  socialLinks: z.array(z.object({
    platform: z.string(),
    url: z.string(),
    label: z.string().optional(),
  })).optional(),
  videoDesktopAlignment: z.enum(["top", "center", "bottom"]).optional(),
  videoMobileAlignment: z.enum(["top", "center", "bottom"]).optional(),
  imageDesktopAlignment: z.enum(["top", "center", "bottom"]).optional(),
  imageMobileAlignment: z.enum(["top", "center", "bottom"]).optional(),
}).partial();

const socialChannelSchema = z.object({
  youtubeChannelId: z.string().optional(),
  twitchChannelId: z.string().optional(),
});

const apiKeysSchema = z.object({
  youtubeApiKey: z.string().optional(),
  instagramApiKey: z.string().optional(),
});

export async function updateHeroData(
  tenantId: string,
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const rawData: Record<string, unknown> = {};
  for (const [key, value] of Array.from(formData.entries())) {
    rawData[key] = value;
  }

  const parsed = heroPartialSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: HERO_SAVE_VALIDATION_ERROR,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const sparseData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    // RCCF-72.12 — only OMITTED fields mean "leave unchanged". Empty strings
    // become JSON null (and explicit null passes through unchanged) so the
    // JSONB merge removes the key, letting creators clear hero fields that
    // were previously sticky.
    if (value === undefined) continue;
    sparseData[key] = value === "" ? null : value;
  }

  try {
    await requireAuth(tenantId);

    // RCCF-67.3: a raw client URL can never become the hero-video authority.
    await assertHeroVideoWrite(tenantId, sparseData);

    await prisma.$transaction(async (tx) => {
      await SettingsService.patchHeroData(tenantId, sparseData, tx);
      await logAction(
        tenantId,
        "updateHeroData",
        { fields: Object.keys(sparseData) },
        tx,
      );
    });

    revalidatePath("/");
    revalidatePath("/admin/settings");
    await afterContentChange(tenantId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return { success: false, error: error.message };
    }
    captureError(error, { service: "settings-actions", operation: "updateHeroData" });
    return { success: false, error: safeHeroSaveError(error) };
  }
}

export async function updateHeroPartial(
  tenantId: string,
  partial: Record<string, unknown>,
): Promise<SettingsActionState> {
  const parsed = heroPartialSchema.safeParse(partial);
  if (!parsed.success) {
    return {
      success: false,
      error: HERO_SAVE_VALIDATION_ERROR,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const sparseData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    // RCCF-72.12 — only OMITTED fields mean "leave unchanged". Empty strings
    // become JSON null (and explicit null passes through unchanged) so the
    // JSONB merge removes the key, letting creators clear hero fields that
    // were previously sticky.
    if (value === undefined) continue;
    sparseData[key] = value === "" ? null : value;
  }

  if (Object.keys(sparseData).length === 0) {
    return { success: true };
  }

  try {
    await requireAuth(tenantId);

    // RCCF-67.3: a raw client URL can never become the hero-video authority.
    await assertHeroVideoWrite(tenantId, sparseData);

    await prisma.$transaction(async (tx) => {
      await SettingsService.patchHeroData(tenantId, sparseData, tx);
      await logAction(
        tenantId,
        "updateHeroPartial",
        { fields: Object.keys(sparseData) },
        tx,
      );
    });

    revalidatePath("/");
    revalidatePath("/admin/settings");
    await afterContentChange(tenantId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return { success: false, error: error.message };
    }
    captureError(error, { service: "settings-actions", operation: "updateHeroPartial" });
    return { success: false, error: safeHeroSaveError(error) };
  }
}

/**
 * Hero owns all social/streaming links. This is the SINGLE writer for
 * hero_data.socialLinks — used by both the Hero settings form and the Links
 * admin page (which is presentation-only).
 */
export async function updateHeroSocialLinks(
  tenantId: string,
  links: Array<{ platform: string; url: string; label?: string }>,
): Promise<SettingsActionState> {
  const safeLinks = links
    .filter((l) => l.platform && l.url && l.url.trim())
    .map((l) => ({ platform: l.platform, url: l.url.trim(), label: (l.label ?? "").trim() || undefined }));

  try {
    await requireAuth(tenantId);
    await prisma.$transaction(async (tx) => {
      await SettingsService.patchHeroData(tenantId, { socialLinks: safeLinks }, tx);
      await logAction(tenantId, "updateHeroSocialLinks", { count: safeLinks.length }, tx);
    });
    revalidatePath("/");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/links");
    await afterContentChange(tenantId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return { success: false, error: error.message };
    }
    captureError(error, { service: "settings-actions", operation: "updateHeroSocialLinks" });
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}

export async function updateSocialChannels(
  tenantId: string,
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  // Only include fields that were actually submitted so saving one channel
  // never wipes an unrelated channel (e.g. saving YouTube must not clear Twitch).
  const updates: { youtubeChannelId?: string; twitchChannelId?: string } = {};
  const youtubeChannelId = (formData.get("youtubeChannelId") as string) ?? "";
  const twitchChannelId = (formData.get("twitchChannelId") as string) ?? "";
  if (formData.has("youtubeChannelId")) updates.youtubeChannelId = youtubeChannelId.trim();
  if (formData.has("twitchChannelId")) updates.twitchChannelId = twitchChannelId.trim();

  if (Object.keys(updates).length === 0) {
    return { success: true };
  }

  const parsed = socialChannelSchema.safeParse(updates);
  if (!parsed.success) {
    return { success: false, error: "Invalid channel ID" };
  }

  try {
    await requireAuth(tenantId);
    await assertAnyCapability({
      tenantId,
      capabilities: ["api_access", "webhooks", "live_social_sync"],
    });
    await SettingsService.updateTenantChannels(tenantId, parsed.data);
    revalidatePath("/");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/integrations");
    await afterContentChange(tenantId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return { success: false, error: error.message };
    }
    captureError(error, { service: "settings-actions", operation: "updateSocialChannels" });
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}

export async function updateApiKeys(
  tenantId: string,
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const rawData = {
    youtubeApiKey: (formData.get("youtubeApiKey") as string) || "",
    instagramApiKey: (formData.get("instagramApiKey") as string) || "",
  };

  const parsed = apiKeysSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await requireAuth(tenantId);

    await assertAnyCapability({
      tenantId,
      capabilities: ["api_access", "webhooks", "live_social_sync"],
    });

    const updates: { youtubeApiKey?: string; instagramApiKey?: string } = {};
    if (parsed.data.youtubeApiKey) updates.youtubeApiKey = parsed.data.youtubeApiKey;
    if (parsed.data.instagramApiKey) updates.instagramApiKey = parsed.data.instagramApiKey;

    if (Object.keys(updates).length > 0) {
      await SettingsService.updateTenantApiKeys(tenantId, updates);
    }

    revalidatePath("/admin/settings");
    revalidatePath("/admin/integrations");
    await afterContentChange(tenantId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return { success: false, error: error.message };
    }
    captureError(error, { service: "settings-actions", operation: "updateApiKeys" });
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}

const integrationPlatformSchema = z.enum(["youtube", "instagram"]);

/**
 * Clear a single integration's tenant-scoped configuration. Only YouTube and
 * Instagram are supported today; other platforms return an error. This never
 * touches hero/social-link data or unrelated Tenant fields.
 */
export async function clearIntegration(
  tenantId: string,
  platform: string,
): Promise<SettingsActionState> {
  const parsed = integrationPlatformSchema.safeParse(platform);
  if (!parsed.success) {
    return { success: false, error: "Unsupported integration" };
  }

  try {
    await requireAuth(tenantId);
    await assertAnyCapability({
      tenantId,
      capabilities: ["api_access", "webhooks", "live_social_sync"],
    });
    await SettingsService.clearTenantIntegration(tenantId, parsed.data);
    revalidatePath("/admin/integrations");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return { success: false, error: error.message };
    }
    captureError(error, { service: "settings-actions", operation: "clearIntegration" });
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}

const themeConfigSchema = z.object({
  primary: z.string().optional(),
  secondary: z.string().optional(),
  accent: z.string().optional(),
  font: z.string().optional(),
  borderRadius: z.string().optional(),
  layoutDensity: z.enum(["compact", "comfortable", "spacious"]).optional(),
});

export type ThemeConfigInput = Partial<z.infer<typeof themeConfigSchema>>;

export async function updateThemeConfig(
  tenantId: string,
  data: ThemeConfigInput,
): Promise<SettingsActionState> {
  const parsed = themeConfigSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Invalid theme config" };
  }

  const sparseData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined && value !== null && value !== "") {
      sparseData[key] = value;
    }
  }

  if (Object.keys(sparseData).length === 0) return { success: true };

  try {
    await requireAuth(tenantId);

    await prisma.$transaction(async (tx) => {
      await SettingsService.patchThemeConfig(tenantId, sparseData, tx);
      await logAction(tenantId, "updateThemeConfig", { fields: Object.keys(sparseData) }, tx);
    });

    revalidatePath("/admin/appearance");
    revalidatePath("/");
    await afterContentChange(tenantId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return { success: false, error: error.message };
    }
    captureError(error, { service: "settings-actions", operation: "updateThemeConfig" });
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}



