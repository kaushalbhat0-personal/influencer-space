"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { GameService } from "@/services/games.service";
import { GAMES_ROUTE } from "@/lib/constants";

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
    await GameService.create({
      name: parsed.data.name,
      logoUrl: parsed.data.logoUrl || undefined,
      description: parsed.data.description || undefined,
      genre: parsed.data.genre || undefined,
    });
    revalidatePath(GAMES_ROUTE);
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
    await GameService.update(id, {
      name: parsed.data.name,
      logoUrl: parsed.data.logoUrl || undefined,
      description: parsed.data.description || undefined,
      genre: parsed.data.genre || undefined,
    });
    revalidatePath(GAMES_ROUTE);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update game" };
  }
}

export async function deleteGame(id: string): Promise<GameActionState> {
  try {
    await GameService.delete(id);
    revalidatePath(GAMES_ROUTE);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete game" };
  }
}
