"use client";

import { acquisitionRegistry } from "@/lib/acquisition";
import type { AcquisitionStrategy } from "@/lib/acquisition/types";
import { useState, useCallback } from "react";
import { ManualWizard } from "./manual-wizard";

export function StrategyInputHost({
  strategyId,
  onAcquired,
  onBack,
}: {
  strategyId: string;
  onAcquired: (input: string) => void;
  onBack: () => void;
}) {
  const adapter = acquisitionRegistry.get(strategyId as AcquisitionStrategy);

  // Manual strategy gets its own multi-step wizard
  if (strategyId === "manual") {
    return <ManualWizard />;
  }

  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(() => {
    if (!adapter) return;
    const validation = adapter.validate(input);
    if (!validation.valid) {
      setError(validation.error || "Invalid input");
      return;
    }
    setError(null);
    onAcquired(input);
  }, [adapter, input, onAcquired]);

  if (!adapter) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
        <p className="text-sm text-red-400">Unknown strategy: {strategyId}</p>
      </div>
    );
  }

  const isUrlInput = strategyId === "youtube";
  const isSelectInput = strategyId === "demo_seed";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">{adapter.label}</h2>
        <p className="mt-1 text-sm text-zinc-400">{adapter.description}</p>
      </div>

      {isSelectInput ? (
        <select value={input} onChange={(e) => setInput(e.target.value)} className="admin-input w-full text-sm">
          <option value="">Choose a seed...</option>
          <option value="gaming">Gaming Creator</option>
          <option value="fitness">Fitness Coach</option>
          <option value="music">Music Artist</option>
        </select>
      ) : (
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            {isUrlInput ? "YouTube URL or Handle" : "Creator Name"}
          </label>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={isUrlInput ? "https://youtube.com/@creator" : "e.g. Priya Sharma"} className="admin-input w-full text-sm" onKeyDown={(e) => e.key === "Enter" && handleSubmit()} autoFocus />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary px-6 py-2.5 text-sm">Back</button>
        <button onClick={handleSubmit} disabled={!input.trim()} className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50">Analyze</button>
      </div>
    </div>
  );
}
