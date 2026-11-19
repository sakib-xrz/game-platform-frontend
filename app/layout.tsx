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
import "./leaderboard.css";

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

// Runs before first paint. When the page fills clearly less than the screen
// height (host app shows the game in a partial-height sheet), the webview is
// not under the status bar / gesture bar, so device safe-area insets must not
// add padding. Re-checked on resize (sheet expand/collapse, rotation).
const EMBEDDED_SHEET_SCRIPT = `(function(){var d=document.documentElement;function u(){var s=window.screen&&window.screen.height;var h=window.innerHeight;if(s&&h&&h<s*0.86){d.setAttribute("data-embedded-sheet","")}else{d.removeAttribute("data-embedded-sheet")}}u();window.addEventListener("resize",u)})();`;

const paymentLocked =
  process.env.NEXT_PUBLIC_PAYMENT_LOCK?.trim().toLowerCase() === "true";

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: EMBEDDED_SHEET_SCRIPT }} />
      </head>
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
