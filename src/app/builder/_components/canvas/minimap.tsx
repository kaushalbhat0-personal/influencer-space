"use client";

export function CanvasMinimap() {
  return (
    <div className="fixed bottom-10 right-4 z-40 w-40 rounded-lg border border-white/10 bg-zinc-900/90 p-1 shadow-xl">
      <div className="relative h-32 w-full overflow-hidden rounded bg-zinc-950">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-3/4 rounded bg-zinc-800/50" />
          <div className="absolute bottom-1 h-2 w-3/4 rounded bg-zinc-800/30" />
          <div className="absolute top-1 h-2 w-3/4 rounded bg-zinc-800/30" />
        </div>
        <div className="absolute inset-0 border border-s8ul-cyan/30" style={{ margin: "8px 4px", height: "calc(100% - 16px)" }} />
      </div>
      <p className="mt-1 text-center text-[9px] text-zinc-600">Minimap</p>
    </div>
  );
}
