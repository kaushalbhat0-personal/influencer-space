"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { GameService } from "@/services/games.service";
import { GAMES_ROUTE } from "@/lib/constants";
import { getTenantContext } from "@/lib/tenant";

const gameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  logoUrl: z.string().optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  genre: z.string().max(50).optional().or(z.literal("")),
});

export type GameActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

async function requireTenant(): Promise<string> {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized — no tenant context");
  return tenant.id;
}

export async function createGame(
  _prevState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  const raw = Object.fromEntries(formData);
  console.log("🎮 createGame called with:", raw);

  const parsed = gameSchema.safeParse({
    name: formData.get("name"),
    logoUrl: formData.get("logoUrl"),
    description: formData.get("description"),
    genre: formData.get("genre"),
  });

  if (!parsed.success) {
    console.log("🎮 createGame validation failed:", parsed.error.flatten().fieldErrors);
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const tenantId = await requireTenant();
    const result = await GameService.create(tenantId, {
      name: parsed.data.name,
      logoUrl: parsed.data.logoUrl || undefined,
      description: parsed.data.description || undefined,
      genre: parsed.data.genre || undefined,
    });
    console.log("🎮 createGame success:", result.id);
    revalidatePath(GAMES_ROUTE);
    return { success: true };
  } catch (error) {
    console.error("🎮 createGame error:", error);
    return { success: false, error: "Failed to create game" };
  }
}

export async function updateGame(
  _prevState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  const id = formData.get("id") as string;
  const raw = Object.fromEntries(formData);
  console.log("🎮 updateGame called — id:", id, "data:", raw);

  if (!id) {
    console.log("🎮 updateGame missing id");
    return { success: false, error: "Game ID is required" };
  }

  const parsed = gameSchema.safeParse({
    name: formData.get("name"),
    logoUrl: formData.get("logoUrl"),
    description: formData.get("description"),
    genre: formData.get("genre"),
  });

  if (!parsed.success) {
    console.log("🎮 updateGame validation failed:", parsed.error.flatten().fieldErrors);
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const tenantId = await requireTenant();
    await GameService.update(id, tenantId, {
      name: parsed.data.name,
      logoUrl: parsed.data.logoUrl || undefined,
      description: parsed.data.description || undefined,
      genre: parsed.data.genre || undefined,
    });
    console.log("🎮 updateGame success — id:", id);
    revalidatePath(GAMES_ROUTE);
    return { success: true };
  } catch (error) {
    console.error("🎮 updateGame error:", error);
    return { success: false, error: "Failed to update game" };
  }
}

export async function deleteGame(id: string): Promise<GameActionState> {
  console.log("🎮 deleteGame called — id:", id);
  try {
    const tenantId = await requireTenant();
    await GameService.delete(id, tenantId);
    console.log("🎮 deleteGame success — id:", id);
    revalidatePath(GAMES_ROUTE);
    return { success: true };
  } catch (error) {
    console.error("🎮 deleteGame error:", error);
    return { success: false, error: "Failed to delete game" };
  }
}
