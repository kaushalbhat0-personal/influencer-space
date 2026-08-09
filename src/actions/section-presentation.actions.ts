"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishingService } from "@/lib/publishing/service";
import { validateSectionPresentation } from "@/modules/section-presentation/application/validate";
import type { SectionPresentation } from "@/modules/section-presentation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = any;

function toJson(val: unknown): JsonValue {
  return JSON.parse(JSON.stringify(val));
}

/**
 * RCCF-IMPLEMENTATION-09B (Phase 1) — Creator-facing Section Presentation
 * management OUTSIDE the Builder.
 *
 * The Builder presentation panel stays as-is; these actions let creators edit
 * the same `Block.config.presentation` shape from a dashboard/admin surface.
 * Presentation is metadata only — canonical section ids and business logic are
 * untouched, exactly like the Builder path.
 *
 * Tenant scoping: a Block is reachable only through Section → Page → Website,
 * and the Website belongs to a tenant. Every action resolves the block through
 * the session tenant so a creator can never touch another tenant's blocks.
 */

/** Resolve a Block owned by the current tenant. Throws otherwise. */
async function requireOwnedBlock(blockId: string): Promise<{ tenantId: string }> {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const block = await prisma.block.findFirst({
    where: { id: blockId, section: { page: { website: { tenantId } } } },
    select: { id: true },
  });
  if (!block) throw new Error("Section not found");
  return { tenantId };
}

/** Merge a validated presentation patch into the block's config JSON. */
async function writePresentation(blockId: string, patch: SectionPresentation | undefined, tenantId: string): Promise<void> {
  if (patch === undefined) return;
  const block = await prisma.block.findUniqueOrThrow({ where: { id: blockId }, select: { config: true } });
  const config = (block.config ?? {}) as Record<string, unknown>;
  const current = (config.presentation as SectionPresentation | undefined) ?? {};
  const next = { ...current, ...patch };
  await prisma.block.update({
    where: { id: blockId },
    data: { config: toJson({ ...config, presentation: next }) },
  });
  // Presentation is part of the draft — flag the snapshot stale until publish.
  await publishingService.markChangesPending(tenantId).catch(() => {});
}

export async function updateSectionPresentation(
  blockId: string,
  presentation: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantId } = await requireOwnedBlock(blockId);
    const { ok, value, errors } = validateSectionPresentation(presentation);
    if (!ok) return { success: false, error: errors.join("; ") };
    if (!value) return { success: false, error: "No presentation fields to update" };
    await writePresentation(blockId, value, tenantId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update section" };
  }
}

/**
 * Reset a presentation property (or all of them when `property` is omitted)
 * back to the canonical default. No data loss — only the metadata override is
 * removed; canonical ids are untouched.
 */
export async function resetSectionPresentation(
  blockId: string,
  property?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantId } = await requireOwnedBlock(blockId);
    const block = await prisma.block.findUniqueOrThrow({ where: { id: blockId }, select: { config: true } });
    const config = (block.config ?? {}) as Record<string, unknown>;
    if (!config.presentation) return { success: true };

    const current = config.presentation as Record<string, unknown>;
    if (property) {
      const next = { ...current };
      delete next[property];
      const presentation = Object.keys(next).length > 0 ? next : undefined;
      await prisma.block.update({
        where: { id: blockId },
        data: { config: toJson({ ...config, presentation }) },
      });
    } else {
      const { presentation: _dropped, ...rest } = config;
      await prisma.block.update({ where: { id: blockId }, data: { config: toJson(rest) } });
    }
    await publishingService.markChangesPending(tenantId).catch(() => {});
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to reset section" };
  }
}
