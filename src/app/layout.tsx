import type { Metadata } from "next";
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
    icon: "/PaletteMail/Icon/pltmaild-32px.ico",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
