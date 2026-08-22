import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GameBootProvider } from "@/components/game-boot-provider";
import { ToastContainer } from "@/components/toast/toast-container";
import "./globals.css";
import "./teen-patti.css";

export const metadata: Metadata = {
  title: "Game Arcade",
  description: "Realtime mobile game platform",
  applicationName: "Game Arcade",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6b526",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <GameBootProvider>
          {children}
          <ToastContainer />
        </GameBootProvider>
      </body>
    </html>
  );
}
