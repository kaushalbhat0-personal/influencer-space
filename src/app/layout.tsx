import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
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
    "CreatorStore is a professional home online — a website you own with your work, links, storefront, products, and checkout in one place. Keep 100% of every sale. Built for Indian creators with UPI.",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "CreatorStore",
    url: APP_URL,
    title: "CreatorStore | Your presence. Your business.",
    description:
      "A professional home for everything you create, share, showcase, and sell — one place you own. Keep 100% of every sale.",
    images: [{ url: `${APP_URL}/marketing-assets/storefront/01-desktop.png`, width: 1440, height: 900, alt: "A CreatorStore storefront built from a creator's profile" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CreatorStore | Your presence. Your business.",
    description:
      "Your professional home online — website, showcase, links, and commerce in one place you own.",
    images: [`${APP_URL}/marketing-assets/storefront/01-desktop.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
