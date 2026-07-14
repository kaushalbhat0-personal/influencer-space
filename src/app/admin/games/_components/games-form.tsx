"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent } from "@/components/ui/Card";
import { createGame, updateGame } from "@/actions/games.actions";
import { GAMES_ROUTE } from "@/lib/constants";
import type { GameData } from "@/services/games.service";
import type { GameActionState } from "@/actions/games.actions";

type Props =
  | { mode: "create"; game?: never }
  | { mode: "edit"; game: GameData };

export function GameForm({ mode, game }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<GameActionState>({ success: false });
  const [pending, setPending] = useState(false);

  const serverAction = mode === "create" ? createGame : updateGame;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setState({ success: false });
    const result = await serverAction(state, formData);
    setState(result);
    setPending(false);
    if (result.success) {
      router.push(GAMES_ROUTE);
      router.refresh();
    }
  }

  return (
    <Card>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="space-y-6">
          {mode === "edit" && game && (
            <input type="hidden" name="id" value={game.id} />
          )}

          <Input
            id="name"
            name="name"
            label="Game Name"
            defaultValue={game?.name ?? ""}
            error={state.fieldErrors?.name?.[0]}
            required
          />

          <Input
            id="genre"
            name="genre"
            label="Genre (e.g. Battle Royale, FPS)"
            defaultValue={game?.genre ?? ""}
            placeholder="e.g. Battle Royale"
          />

          <Textarea
            id="description"
            name="description"
            label="Description"
            defaultValue={game?.description ?? ""}
            error={state.fieldErrors?.description?.[0]}
            rows={3}
          />

          <Input
            id="logoUrl"
            name="logoUrl"
            label="Logo Emoji or Image URL"
            defaultValue={game?.logoUrl ?? ""}
            placeholder="e.g. 🏆 or https://..."
          />

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : mode === "create" ? "Create Game" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(GAMES_ROUTE)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
