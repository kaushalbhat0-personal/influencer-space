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
      "CreatorStore | AI-Powered Creator Business Platform",
    template: "%s — CreatorStore",
  },
  description:
    "CreatorStore is an AI-powered creator business platform. Paste your social profile and AI generates a complete storefront with products, checkout, analytics, SEO, and visual builder. Native UPI payments. Custom domains.",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "CreatorStore",
    url: APP_URL,
    title: "CreatorStore | AI-Powered Creator Business Platform",
    description:
      "AI builds your entire creator business from your social profile. Storefront, products, payments, analytics, and visual builder — all in one.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CreatorStore | AI-Powered Creator Business Platform",
    description:
      "AI builds your entire creator business from your social profile.",
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
