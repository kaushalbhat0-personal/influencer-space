import { GameForm } from "../_components/games-form";

export default function NewGamePage() {
  return (
    <div>
      <h1 className="platform-display mb-6">Add New Game</h1>
      <div className="max-w-2xl">
        <GameForm mode="create" />
      </div>
    </div>
  );
}
