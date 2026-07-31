"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent } from "@/components/ui/Card";
import { MediaField } from "@/components/shared/MediaField";
import { createGame, updateGame } from "@/actions/games.actions";
import { GAMES_ROUTE } from "@/lib/constants";
import type { GameData, GameActionState } from "@/actions/games.types";

type Props =
  | { mode: "create"; game?: never }
  | { mode: "edit"; game: GameData };

export function GameForm({ mode, game }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<GameActionState>({ success: false });
  const [pending, setPending] = useState(false);
  const [logoUrl, setLogoUrl] = useState(game?.logoUrl ?? "");

  const serverAction = mode === "create" ? createGame : updateGame;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setState({ success: false });
    formData.set("logoUrl", logoUrl);
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
          {mode === "edit" && game && <input type="hidden" name="id" value={game.id} />}

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

          <MediaField
            label="Logo"
            value={{ url: logoUrl || null }}
            folder="games"
            accept="image/*"
            entityType="game"
            entityId={mode === "edit" ? game?.id : undefined}
            onChange={(v) => setLogoUrl(v?.url ?? "")}
            onError={(e) => setState({ success: false, error: e })}
          />

          {state.error && <p className="text-sm text-red-400">{state.error}</p>}

          <div className="flex items-center gap-4 pt-2">
            <button type="submit" disabled={pending} className="admin-btn-cyan">
              {pending ? "Saving..." : mode === "create" ? "Create Game" : "Save Changes"}
            </button>
            <button type="button" onClick={() => router.push(GAMES_ROUTE)} className="admin-btn-outline">
              Cancel
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
