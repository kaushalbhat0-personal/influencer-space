import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Builder — CreatorOS",
  description: "Website builder workspace",
};

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
