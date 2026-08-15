"use server";
import type { GameActionState } from "./games.types";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GAMES_ROUTE } from "@/lib/constants";
import { logAction } from "@/lib/audit";
import { afterContentChange } from "@/lib/publishing/content-change";
import { enforceContentLimit } from "@/modules/billing/application/content-limit.enforcement";
import { FEATURE_IDS } from "@/lib/capabilities/constants";

const gameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  logoUrl: z.string().optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  genre: z.string().max(50).optional().or(z.literal("")),
});

async function requireAuth(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!session.user.tenantId) throw new Error("No tenant associated with account");
  return session.user.tenantId;
}

export async function createGame(
  _prevState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  const parsed = gameSchema.safeParse({
    name: formData.get("name"),
    logoUrl: formData.get("logoUrl"),
    description: formData.get("description"),
    genre: formData.get("genre"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const tenantId = await requireAuth();
    const limit = await enforceContentLimit({ tenantId, featureKey: FEATURE_IDS.GAMES });
    if (!limit.ok) return { success: false, error: limit.reason };

    const maxSort = await prisma.game.aggregate({
      where: { tenantId },
      _max: { order: true },
    });

    const result = await prisma.game.create({
      data: {
        tenantId,
        name: parsed.data.name,
        logoUrl: parsed.data.logoUrl || null,
        description: parsed.data.description || null,
        genre: parsed.data.genre || null,
        order: (maxSort._max.order ?? 0) + 1,
      },
    });

    await logAction(tenantId, "createGame", { gameId: result.id, name: result.name });
    revalidatePath(GAMES_ROUTE);
    await afterContentChange(tenantId);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to create game" };
  }
}

export async function updateGame(
  _prevState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  const id = formData.get("id") as string;

  if (!id) {
    return { success: false, error: "Game ID is required" };
  }

  const parsed = gameSchema.safeParse({
    name: formData.get("name"),
    logoUrl: formData.get("logoUrl"),
    description: formData.get("description"),
    genre: formData.get("genre"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const tenantId = await requireAuth();
    // RCCF-63.2 — tenant ownership before mutation. The client-supplied game id
    // is never trusted alone; the game must belong to the authenticated tenant.
    const owned = await prisma.game.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!owned) throw new Error("Game not found");
    await prisma.game.update({
      where: { id: owned.id },
      data: {
        name: parsed.data.name,
        logoUrl: parsed.data.logoUrl || null,
        description: parsed.data.description || null,
        genre: parsed.data.genre || null,
      },
    });

    await logAction(tenantId, "updateGame", { gameId: owned.id });
    revalidatePath(GAMES_ROUTE);
    await afterContentChange(tenantId);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update game" };
  }
}

export async function deleteGame(id: string): Promise<GameActionState> {
  try {
    const tenantId = await requireAuth();
    // RCCF-63.2 — tenant ownership before deletion (no cross-tenant delete).
    const owned = await prisma.game.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!owned) throw new Error("Game not found");
    await prisma.game.delete({ where: { id: owned.id } });
    await logAction(tenantId, "deleteGame", { gameId: owned.id });
    revalidatePath(GAMES_ROUTE);
    await afterContentChange(tenantId);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete game" };
  }
}



