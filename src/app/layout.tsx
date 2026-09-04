import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Literata, Space_Grotesk, Playfair_Display, Outfit } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getPlatformConfig } from "@/lib/config/platform";
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

// RCCF-VISUAL-01D — display fonts for the 5 visual themes. Loaded with
// next/font (automatic @font-face, display:swap, no layout shift). Each
// exposes a CSS variable that visual-foundation heading tokens reference via
// var(--font-*). Body remains Inter (via globals.css @import) — no change.
const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
};

const APP_URL = getPlatformConfig().appUrl;

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default:
      "CreatorStore | Your presence. Your business.",
    template: "%s — CreatorStore",
  },
  description:
    "CreatorStore is a professional home online — a website you own with your work, links, storefront, products, and checkout in one place. Keep 100% of every sale. UPI and card checkout via Razorpay.",
  robots: { index: true, follow: true },
  // RCCF-VISUAL-03B-CORRECTION: OG now uses neutral marketing hero (not Spower Gaming storefront).
  // Canonical visual references across marketing are Mystic Minutes / North Star.
  openGraph: {
    type: "website",
    siteName: "CreatorStore",
    url: APP_URL,
    title: "CreatorStore | Your presence. Your business.",
    description:
      "A professional home for everything you create, share, showcase, and sell — one place you own. Keep 100% of every sale.",
    images: [{ url: `${APP_URL}/marketing-assets/marketing/01-homepage-desktop.png`, width: 1440, height: 900, alt: "CreatorStore — professional home for creators (Mystic Minutes · North Star examples)" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CreatorStore | Your presence. Your business.",
    description:
      "Your professional home online — website, showcase, links, and commerce in one place you own.",
    images: [`${APP_URL}/marketing-assets/marketing/01-homepage-desktop.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${literata.variable} ${spaceGrotesk.variable} ${playfair.variable} ${outfit.variable} antialiased`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
