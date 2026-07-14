import type { Metadata } from "next";
import localFont from "next/font/local";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { NicheBackground } from "@/components/ui/NicheBackground";
import { LiveStatus } from "@/components/ui/LiveStatus";
import { getInfluencerConfig } from "@/config/influencer";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Snax - S8UL Esports | BGMI Pro | Content Creator",
  description:
    "Welcome to Snax's Gaming HQ. S8UL Esports content creator, BGMI pro, and Hyderabad's favorite gaming son. Join the squad.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getInfluencerConfig();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ScrollProgress />
        <LiveStatus />
        <NicheBackground niche={config.niche} />
        {children}
      </body>
    </html>
  );
}
