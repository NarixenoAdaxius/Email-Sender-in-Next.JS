import type { Metadata, Viewport } from "next";
import { Fira_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import ToastProvider from "@/components/providers/ToastProvider";
import { ToastProvider as OriginalToastProvider } from "@/components/ui/use-toast";

const firaMono = Fira_Mono({
  variable: "--font-fira-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PaletteMail",
  description: "A modern email template builder and sender application",
  icons: {
    icon: [
      { url: "/favicon-icon.svg?v=1", type: "image/svg+xml" },
    ],
    shortcut: "/favicon-icon.svg?v=1",
    apple: "/favicon-icon.svg?v=1",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#3A4A74"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preload key logo assets */}
        <link 
          rel="preload" 
          href="/logo.svg" 
          as="image"
          type="image/svg+xml"
          fetchPriority="high"
        />
        <link rel="icon" href="/favicon-icon.svg?v=1" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon-icon.svg?v=1" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${firaMono.variable} antialiased`}
      >
        <OriginalToastProvider>
          <ToastProvider>
            <Navigation />
            <main>
              {children}
            </main>
          </ToastProvider>
        </OriginalToastProvider>
      </body>
    </html>
  );
}
