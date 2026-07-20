"use client";

export function CanvasGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
      <div
        className="h-full w-full"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
    </div>
  );
}
