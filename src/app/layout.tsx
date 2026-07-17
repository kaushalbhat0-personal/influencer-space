import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://creatorshop.io";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "CreatorStore | The Best Shopify Alternative for Indian Creators",
    template: "%s — CreatorStore",
  },
  description:
    "Launch your merch store, sell digital downloads, and build your creator portfolio with zero setup fees. Native UPI checkout, Instagram/YouTube integration, and custom domains.",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "CreatorStore",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
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
      </body>
    </html>
  );
}
