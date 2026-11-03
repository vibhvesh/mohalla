import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Shell } from "@/components/shell";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: {
    default: "Mohalla — book a ground nearby",
    template: "%s · Mohalla",
  },
  description:
    "Find turfs and sports venues, book an open hour, or join a pickup game. Built for neighbourhoods, starting in Vadodara.",
  applicationName: "Mohalla",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mohalla",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e3b2e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-ink">
        <Shell>{children}</Shell>
        <PwaRegister />
      </body>
    </html>
  );
}
