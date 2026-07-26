"use client";

import dynamic from "next/dynamic";

const BuilderWorkspace = dynamic(
  () => import("./workspace").then((m) => m.BuilderWorkspace),
  { ssr: false }
);

export default function BuilderLoader() {
  return <BuilderWorkspace />;
}
