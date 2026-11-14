import type { Metadata, Viewport } from "next";
import { Inter, Fira_Mono } from "next/font/google";
import { MotionConfig } from "motion/react";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import ToastProvider from "@/components/providers/ToastProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const firaMono = Fira_Mono({
  variable: "--font-fira-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PaletteMail",
  description: "A modern email template builder and sender application",
  icons: {
    icon: [{ url: "/favicon-icon.svg?v=1", type: "image/svg+xml" }],
    shortcut: "/favicon-icon.svg?v=1",
    apple: "/favicon-icon.svg?v=1",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0D14" },
  ],
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||((!t||t==='system')&&d)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${firaMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground font-sans">
        <ThemeProvider>
          <ToastProvider>
            <MotionConfig reducedMotion="user">
              <Navigation />
              <main
                id="main-content"
                tabIndex={-1}
                className="min-h-[calc(100vh-4rem)] focus:outline-none"
              >
                {children}
              </main>
            </MotionConfig>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
