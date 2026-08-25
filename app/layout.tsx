import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GameBootProvider } from "@/components/game-boot-provider";
import { PaymentLockOverlay } from "@/components/payment-lock-overlay";
import { PlayerIdentityBootstrap } from "@/components/player-identity-bootstrap";
import { ToastContainer } from "@/components/toast/toast-container";
import "./globals.css";
import "./greedy-classic.css";
import "./lucky-77.css";
import "./lucky-77-premium.css";
import "./lucky-77-refinement.css";
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

const paymentLocked =
  process.env.NEXT_PUBLIC_PAYMENT_LOCK?.trim().toLowerCase() === "true";

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {paymentLocked ? <PaymentLockOverlay /> : null}
        <PlayerIdentityBootstrap />
        <GameBootProvider>
          {children}
          <ToastContainer />
        </GameBootProvider>
      </body>
    </html>
  );
}
