"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Layers,
  Lock,
  Play,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Terminal,
  Zap,
  ArrowRight,
  Code2,
  Server,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Cpu,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function IntegrationPortalView() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Playground state
  const [selectedGame, setSelectedGame] = useState<string>("greedy-classic");
  const [appKey, setAppKey] = useState<string>("zimo-live");
  const [signingSecret, setSigningSecret] = useState<string>("example-signing-secret-12345678");
  const [playerSecret, setPlayerSecret] = useState<string>("example-player-token-secret-87654321");
  const [testUserId, setTestUserId] = useState<string>("user_9872");
  const [testUsername, setTestUsername] = useState<string>("Alex Hunter");
  const [generatedToken, setGeneratedToken] = useState<string>("");
  const [generatedUrl, setGeneratedUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showLiveFrame, setShowLiveFrame] = useState<boolean>(false);

  // Code tabs state
  const [activeClientTab, setActiveClientTab] = useState<"flutter" | "reactnative" | "android" | "ios" | "web">("flutter");
  const [activeTokenTab, setActiveTokenTab] = useState<"node" | "python" | "php" | "go" | "java">("node");
  const [activeVerifyTab, setActiveVerifyTab] = useState<"node" | "python" | "php" | "go">("node");
  const [activeWebhookTab, setActiveWebhookTab] = useState<"balance" | "debit" | "credit" | "transaction">("balance");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://games.example.com";
  const apiBaseUrl = typeof window !== "undefined" ? `${window.location.origin}/api/v1` : "https://games.example.com/api/v1";

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      toast.error("Failed to copy");
    }
  };

  // Helper to generate real HS256 JWT in browser using Web Crypto API
  const handleGenerateLiveLaunchUrl = async () => {
    setIsGenerating(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      const header = { alg: "HS256", typ: "JWT" };
      const claims = {
        sub: testUserId.trim() || "user_1001",
        app: appKey.trim() || "demo-app",
        username: testUsername.trim() || "Player",
        iat: now,
        exp: now + 15 * 60, // 15 mins
      };

      const b64u = (str: string) =>
        btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      const encHeader = b64u(JSON.stringify(header));
      const encClaims = b64u(JSON.stringify(claims));
      const message = `${encHeader}.${encClaims}`;

      const enc = new TextEncoder();
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        enc.encode(playerSecret || "default-secret"),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
      const sigB64u = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const jwt = `${message}.${sigB64u}`;
      setGeneratedToken(jwt);

      const path = selectedGame === "greedy" ? "/games/greedy" :
                   selectedGame === "greedy-classic" ? "/games/greedy-classic" :
                   selectedGame === "teen-patti" ? "/games/teen-patti" :
                   "/games/lucky-77";

      const finalUrl = `${baseUrl}${path}?token=${encodeURIComponent(jwt)}&app=${encodeURIComponent(appKey)}&game=${encodeURIComponent(selectedGame)}`;
      setGeneratedUrl(finalUrl);
      toast.success("Valid 15-Minute Signed Token & Launch URL Generated!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate token");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header (Matching Dashboard Style) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/80 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 mb-2">
            <Zap className="size-3" /> Enterprise B2B Game Provider
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Integration Guide & Developer Portal</h1>
          <p className="mt-1.5 max-w-3xl text-sm text-slate-500">
            Learn how to embed our casino games (<strong className="text-slate-800">Monkey Wheel, Greedy, Teen Patti, Lucky 77</strong>) into your mobile applications and automate real-time coin sync via seamless wallet webhooks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/apps">
            <Button variant="outline" size="sm" className="border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5">
              <Smartphone className="size-4 text-slate-500" /> Platform Apps
            </Button>
          </Link>
          <a href="#simulator">
            <Button size="sm" className="bg-slate-950 text-white hover:bg-slate-900 gap-1.5 shadow-sm">
              <Play className="size-3.5 fill-current" /> Live Simulator
            </Button>
          </a>
        </div>
      </div>

      {/* Feature Highlights / Technical Guarantees */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 mb-1">
              <CheckCircle2 className="size-4" /> 100% Zero CORS
            </div>
            <CardTitle className="text-base font-bold text-slate-900">Zero Embedding Blocks</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Embed via WebView, Iframe or Native web containers with zero cross-origin or frame-ancestors blockages.
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 mb-1">
              <ShieldCheck className="size-4" /> HMAC-SHA256
            </div>
            <CardTitle className="text-base font-bold text-slate-900">Canonical Signing</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Every webhook debit & credit call is cryptographically signed with timestamp & nonce replay prevention.
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
              <KeyRound className="size-4" /> 15m Player Tokens
            </div>
            <CardTitle className="text-base font-bold text-slate-900">Secure HS256 JWT</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            App secrets never touch mobile devices. Host backends issue temporary 15-minute player launch tokens.
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 mb-1">
              <RefreshCw className="size-4" /> Automated Sync
            </div>
            <CardTitle className="text-base font-bold text-slate-900">Seamless Wallet</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Reads player coins, debits bets, and credits winnings directly on your server with full idempotency.
          </CardContent>
        </Card>
      </div>

      {/* SECTION 1: INTERACTIVE SIMULATOR (DASHBOARD THEME) */}
      <section id="simulator" className="scroll-mt-20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider">
              <Cpu className="size-4" /> Live Interactive Testing Sandbox
            </div>
            <h2 className="text-xl font-bold text-slate-950 mt-0.5">Integration Playground & Launch URL Builder</h2>
          </div>
          <p className="text-xs text-slate-500">
            Test token signing and verify launch URLs directly in the dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Playground Form */}
          <Card className="lg:col-span-5 border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <Terminal className="size-4 text-indigo-600" /> Playground Parameters
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Configure mock credentials to simulate real player launch sessions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-medium">Select Game</Label>
                <Select value={selectedGame} onValueChange={setSelectedGame}>
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900">
                    <SelectItem value="greedy-classic">Monkey Wheel (Tropical Fortune)</SelectItem>
                    <SelectItem value="greedy">Greedy (Classic Wheel)</SelectItem>
                    <SelectItem value="teen-patti">Teen Patti (Indian Poker)</SelectItem>
                    <SelectItem value="lucky-77">Lucky 77 (Hi-Lo Dice)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-medium">App Identifier (appKey)</Label>
                  <Input
                    value={appKey}
                    onChange={(e) => setAppKey(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900 font-mono text-xs"
                    placeholder="e.g. zimo-live"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-medium">External User ID</Label>
                  <Input
                    value={testUserId}
                    onChange={(e) => setTestUserId(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900 font-mono text-xs"
                    placeholder="e.g. user_9872"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-medium">Player Display Name</Label>
                <Input
                  value={testUsername}
                  onChange={(e) => setTestUsername(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 text-xs"
                  placeholder="e.g. Alex Hunter"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-medium">Player Token Secret (HS256)</Label>
                <Input
                  value={playerSecret}
                  onChange={(e) => setPlayerSecret(e.target.value)}
                  type="password"
                  className="bg-white border-slate-300 text-slate-900 font-mono text-xs"
                  placeholder="Secret from Platform Apps"
                />
              </div>

              <Button
                onClick={handleGenerateLiveLaunchUrl}
                disabled={isGenerating}
                className="w-full bg-slate-950 hover:bg-slate-900 text-white font-semibold gap-2 py-2 mt-2 shadow-sm"
              >
                <Zap className="size-4 text-amber-400 fill-current" />
                {isGenerating ? "Signing HS256 Token..." : "Generate Signed Launch URL"}
              </Button>
            </CardContent>
          </Card>

          {/* Results Card */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-950">Generated Launch URL</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Use this URL to open the game in your mobile WebView or Iframe.
                  </CardDescription>
                </div>
                {generatedUrl && (
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-semibold">
                    15m Token Valid
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative rounded-lg border border-slate-800 bg-slate-950 p-3.5 font-mono text-xs text-amber-300 break-all select-all">
                  {generatedUrl ? (
                    generatedUrl
                  ) : (
                    <span className="text-slate-500 italic">Click "Generate Signed Launch URL" on the left to create a live URL...</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!generatedUrl}
                    onClick={() => copyToClipboard(generatedUrl, "launch-url")}
                    className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs gap-1.5"
                  >
                    {copiedKey === "launch-url" ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    Copy Launch URL
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!generatedUrl}
                    onClick={() => setShowLiveFrame(!showLiveFrame)}
                    className="border-indigo-300 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100 text-xs gap-1.5"
                  >
                    <Smartphone className="size-3.5" />
                    {showLiveFrame ? "Hide Device Preview" : "Test Play in Device Frame"}
                  </Button>
                  {generatedUrl && (
                    <a href={generatedUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="text-slate-600 hover:text-slate-900 text-xs gap-1">
                        <ExternalLink className="size-3.5" /> Open in New Tab
                      </Button>
                    </a>
                  )}
                </div>

                {/* Device Frame */}
                {showLiveFrame && generatedUrl && (
                  <div className="pt-4 flex justify-center">
                    <div className="w-[340px] sm:w-[380px] h-[640px] rounded-[40px] border-4 border-slate-800 bg-black shadow-2xl overflow-hidden relative flex flex-col ring-8 ring-slate-200">
                      <div className="h-6 bg-slate-900 flex items-center justify-center">
                        <div className="w-20 h-3 bg-slate-800 rounded-full" />
                      </div>
                      <iframe
                        src={generatedUrl}
                        title="Game Live Preview"
                        className="flex-1 w-full h-full border-none"
                        allow="autoplay"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Claims Breakdown */}
            {generatedToken && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs space-y-2 shadow-sm">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <KeyRound className="size-3.5 text-indigo-600" /> Decoded Token Claims (Header.Payload.Signature):
                </div>
                <pre className="font-mono text-xs text-slate-800 overflow-x-auto p-3 bg-slate-50 rounded border border-slate-200">
{JSON.stringify({
  sub: testUserId,
  app: appKey,
  username: testUsername,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 900
}, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 2: 5-STEP INTEGRATION ARCHITECTURE */}
      <section className="space-y-6 pt-4">
        <div className="border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider">
            <Layers className="size-4" /> Implementation Walkthrough
          </div>
          <h2 className="text-xl font-bold text-slate-950 mt-0.5">5-Step Architecture & API Specifications</h2>
          <p className="text-xs text-slate-500">
            Step-by-step developer documentation for embedding games and integrating automated coin synchronization.
          </p>
        </div>

        {/* STEP 1: READ GAME CATALOG */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="grid size-7 place-items-center rounded-full bg-slate-950 font-bold text-white text-xs">
                1
              </span>
              <div>
                <CardTitle className="text-base text-slate-950">Read Your Game List (Public Catalog API)</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Your server or client makes a public GET call to retrieve enabled games, titles, launch routes, and icons.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-white font-bold text-[10px]">GET</Badge>
                    <span className="text-slate-800">{apiBaseUrl}/games?app=<span className="text-indigo-600">{"{appKey}"}</span></span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    No signature required for public catalog. Returns games activated for your platform application.
                  </p>
                </div>

                <div className="relative rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-100">
                  <pre className="overflow-x-auto text-[11px]">
{`curl -X GET "${apiBaseUrl}/games?app=zimo-live"`}
                  </pre>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => copyToClipboard(`curl -X GET "${apiBaseUrl}/games?app=zimo-live"`, "curl-games")}
                    className="absolute right-2 top-2 size-7 text-slate-400 hover:text-white"
                  >
                    {copiedKey === "curl-games" ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">Sample Catalog Response:</div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-emerald-400/90 max-h-56 overflow-y-auto text-[11px]">
{`{
  "success": true,
  "data": {
    "app": {
      "name": "Zimo Live",
      "appKey": "zimo-live",
      "walletMode": "seamless"
    },
    "games": [
      {
        "gameKey": "greedy-classic",
        "name": "Monkey Wheel (Tropical Fortune)",
        "launchUrl": "${baseUrl}/games/greedy-classic",
        "iconUrl": "${baseUrl}/assets/game-lobby/monkey-wheel-v4.webp"
      },
      {
        "gameKey": "greedy",
        "name": "Greedy Classic Wheel",
        "launchUrl": "${baseUrl}/games/greedy",
        "iconUrl": "${baseUrl}/assets/game-lobby/greedy.webp"
      },
      {
        "gameKey": "teen-patti",
        "name": "Teen Patti Live",
        "launchUrl": "${baseUrl}/games/teen-patti",
        "iconUrl": "${baseUrl}/assets/game-lobby/teen-patti.webp"
      },
      {
        "gameKey": "lucky-77",
        "name": "Lucky 77 Hi-Lo Dice",
        "launchUrl": "${baseUrl}/games/lucky-77",
        "iconUrl": "${baseUrl}/assets/game-lobby/lucky-77.webp"
      }
    ]
  }
}`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* STEP 2: AUTOMATED COIN SYNC (WEBHOOKS) */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="grid size-7 place-items-center rounded-full bg-slate-950 font-bold text-white text-xs">
                2
              </span>
              <div>
                <CardTitle className="text-base text-slate-950">Automated Coin Sync: Implement 4 Wallet Webhooks</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  In <strong className="text-indigo-600">Seamless Wallet Mode</strong>, our game server interacts directly with your backend. Whenever a player bets or wins, coins are automatically synchronized in real-time.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Webhook Selector Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              <Button
                size="sm"
                variant={activeWebhookTab === "balance" ? "default" : "outline"}
                onClick={() => setActiveWebhookTab("balance")}
                className={activeWebhookTab === "balance" ? "bg-slate-950 text-white font-semibold" : "border-slate-200 text-slate-700"}
              >
                1. Read Balance (GET)
              </Button>
              <Button
                size="sm"
                variant={activeWebhookTab === "debit" ? "default" : "outline"}
                onClick={() => setActiveWebhookTab("debit")}
                className={activeWebhookTab === "debit" ? "bg-slate-950 text-white font-semibold" : "border-slate-200 text-slate-700"}
              >
                2. Bet Debit (POST)
              </Button>
              <Button
                size="sm"
                variant={activeWebhookTab === "credit" ? "default" : "outline"}
                onClick={() => setActiveWebhookTab("credit")}
                className={activeWebhookTab === "credit" ? "bg-slate-950 text-white font-semibold" : "border-slate-200 text-slate-700"}
              >
                3. Payout Credit (POST)
              </Button>
              <Button
                size="sm"
                variant={activeWebhookTab === "transaction" ? "default" : "outline"}
                onClick={() => setActiveWebhookTab("transaction")}
                className={activeWebhookTab === "transaction" ? "bg-slate-950 text-white font-semibold" : "border-slate-200 text-slate-700"}
              >
                4. Transaction Lookup (GET)
              </Button>
            </div>

            {/* Tab 1: Balance */}
            {activeWebhookTab === "balance" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-white font-bold text-[10px]">GET</Badge>
                    <span className="font-mono text-slate-900 font-semibold">/internal/wallet/<span className="text-indigo-600">{":userId"}</span>/balance</span>
                  </div>
                  <p className="text-slate-600">
                    Called immediately when player opens the game, before bets are accepted, and whenever the UI balance is refreshed.
                  </p>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                    <div className="text-slate-800 font-semibold">Incoming Request Headers:</div>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                      <li><code className="text-indigo-700 font-semibold">X-Operator-Id</code>: Your appKey</li>
                      <li><code className="text-indigo-700 font-semibold">X-Timestamp</code>: Current Unix timestamp (seconds)</li>
                      <li><code className="text-indigo-700 font-semibold">X-Nonce</code>: 32-char random nonce (replay protection)</li>
                      <li><code className="text-indigo-700 font-semibold">X-Signature</code>: v1=HMAC-SHA256 signature</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="text-slate-800 font-semibold">Expected Response (HTTP 200):</div>
                  <pre className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 font-mono text-emerald-400 text-[11px]">
{`{
  "success": true,
  "balance": 50000,
  "currency": "coins"
}`}
                  </pre>
                  <p className="text-slate-500 text-[11px]">
                    If user not found: return HTTP 404 <code className="text-red-500">{`{"code": "USER_NOT_FOUND"}`}</code>.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Debit */}
            {activeWebhookTab === "debit" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-600 text-white font-bold text-[10px]">POST</Badge>
                    <span className="font-mono text-slate-900 font-semibold">/internal/wallet/debit</span>
                  </div>
                  <p className="text-slate-600">
                    Called when player places a bet. <strong>Must be atomic and idempotent!</strong> If you receive the same <code className="text-indigo-600">idempotencyKey</code>, do NOT deduct coins twice; return the previous balance.
                  </p>
                  <div className="text-slate-800 font-semibold">Incoming JSON Payload:</div>
                  <pre className="rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-amber-300 text-[11px]">
{`{
  "userId": "user_1001",
  "currency": "coins",
  "amount": 500,
  "type": "game_bet",
  "gameCode": "greedy-classic",
  "roundId": "round_cuid_abc123",
  "idempotencyKey": "game-bet:round_cuid_abc123:user_1001"
}`}
                  </pre>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="text-slate-800 font-semibold">Expected Success Response (HTTP 200):</div>
                  <pre className="rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-emerald-400 text-[11px]">
{`{
  "success": true,
  "balance": 49500,
  "txId": "host-internal-tx-8899"
}`}
                  </pre>
                  <div className="text-slate-800 font-semibold pt-2">Insufficient Coins Error (HTTP 400):</div>
                  <pre className="rounded-lg border border-red-200 bg-red-50 p-3 font-mono text-red-700 text-[11px]">
{`{
  "code": "INSUFFICIENT_BALANCE",
  "message": "Player does not have enough coins"
}`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 3: Credit */}
            {activeWebhookTab === "credit" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-600 text-white font-bold text-[10px]">POST</Badge>
                    <span className="font-mono text-slate-900 font-semibold">/internal/wallet/credit</span>
                  </div>
                  <p className="text-slate-600">
                    Called when a round finishes and player wins, or if a cancelled round results in a bet refund.
                  </p>
                  <div className="text-slate-800 font-semibold">Incoming JSON Payload:</div>
                  <pre className="rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-amber-300 text-[11px]">
{`{
  "userId": "user_1001",
  "currency": "coins",
  "amount": 2000,
  "type": "game_payout",
  "gameCode": "greedy-classic",
  "roundId": "round_cuid_abc123",
  "idempotencyKey": "game-payout:round_cuid_abc123:user_1001"
}`}
                  </pre>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="text-slate-800 font-semibold">Expected Success Response (HTTP 200):</div>
                  <pre className="rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-emerald-400 text-[11px]">
{`{
  "success": true,
  "balance": 51500,
  "txId": "host-internal-credit-tx-9900"
}`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 4: Transaction Lookup */}
            {activeWebhookTab === "transaction" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-white font-bold text-[10px]">GET</Badge>
                    <span className="font-mono text-slate-900 font-semibold">/internal/wallet/transaction/<span className="text-indigo-600">{":idempotencyKey"}</span></span>
                  </div>
                  <p className="text-slate-600">
                    If network drops or times out during a bet or payout, our engine automatically looks up the transaction by its <code className="text-indigo-600">idempotencyKey</code> to ensure consistency and prevent duplicate debits.
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="text-slate-800 font-semibold">Expected Response (HTTP 200):</div>
                  <pre className="rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-emerald-400 text-[11px]">
{`{
  "found": true,
  "status": "completed",
  "amount": 500,
  "txId": "host-internal-tx-8899",
  "balanceAfter": 49500
}`}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* STEP 3: SERVER-SIDE PLAYER TOKEN GENERATION */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="grid size-7 place-items-center rounded-full bg-slate-950 font-bold text-white text-xs">
                3
              </span>
              <div>
                <CardTitle className="text-base text-slate-950">Server-Side Player Token Generation (HS256 JWT)</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  <strong className="text-rose-600 font-semibold">Security Requirement:</strong> Your <code className="text-slate-800 font-mono">player_token_secret</code> must NEVER reside on mobile devices. When a player opens a game, your app requests a 15-minute signed token from your server.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language Selector */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              {(["node", "python", "php", "go", "java"] as const).map((lang) => (
                <Button
                  key={lang}
                  size="sm"
                  variant={activeTokenTab === lang ? "default" : "outline"}
                  onClick={() => setActiveTokenTab(lang)}
                  className={activeTokenTab === lang ? "bg-slate-950 text-white font-semibold text-xs" : "border-slate-200 text-slate-700 text-xs"}
                >
                  {lang === "node" ? "Node.js" : lang === "python" ? "Python" : lang === "php" ? "PHP / Laravel" : lang === "go" ? "Go" : "Java"}
                </Button>
              ))}
            </div>

            <div className="relative rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-100">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => copyToClipboard(
                  activeTokenTab === "node" ? nodeSnippet :
                  activeTokenTab === "python" ? pythonSnippet :
                  activeTokenTab === "php" ? phpSnippet :
                  activeTokenTab === "go" ? goSnippet : javaSnippet,
                  `token-${activeTokenTab}`
                )}
                className="absolute right-3 top-3 size-8 text-slate-400 hover:text-white"
              >
                {copiedKey === `token-${activeTokenTab}` ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
              </Button>

              <pre className="overflow-x-auto text-[11px] leading-relaxed">
                {activeTokenTab === "node" && nodeSnippet}
                {activeTokenTab === "python" && pythonSnippet}
                {activeTokenTab === "php" && phpSnippet}
                {activeTokenTab === "go" && goSnippet}
                {activeTokenTab === "java" && javaSnippet}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* STEP 4: MOBILE CLIENT INTEGRATION (WEBVIEW & BRIDGE) */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="grid size-7 place-items-center rounded-full bg-slate-950 font-bold text-white text-xs">
                4
              </span>
              <div>
                <CardTitle className="text-base text-slate-950">Mobile Client Integration: WebView & JavaScript Bridge</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Open the game URL inside a bottom sheet or fullscreen WebView. The game communicates events (such as close button taps or coin recharge) to your app via the <code className="text-slate-800 font-mono font-bold">ZimoGameBridge</code>.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Client Platform Selector */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              {(["flutter", "reactnative", "android", "ios", "web"] as const).map((platform) => (
                <Button
                  key={platform}
                  size="sm"
                  variant={activeClientTab === platform ? "default" : "outline"}
                  onClick={() => setActiveClientTab(platform)}
                  className={activeClientTab === platform ? "bg-slate-950 text-white font-semibold text-xs" : "border-slate-200 text-slate-700 text-xs"}
                >
                  {platform === "flutter" ? "Flutter" : platform === "reactnative" ? "React Native" : platform === "android" ? "Android (Kotlin)" : platform === "ios" ? "iOS (Swift)" : "Web / Iframe"}
                </Button>
              ))}
            </div>

            <div className="relative rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-100">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => copyToClipboard(
                  activeClientTab === "flutter" ? flutterSnippet :
                  activeClientTab === "reactnative" ? reactNativeSnippet :
                  activeClientTab === "android" ? androidSnippet :
                  activeClientTab === "ios" ? iosSnippet : webSnippet,
                  `client-${activeClientTab}`
                )}
                className="absolute right-3 top-3 size-8 text-slate-400 hover:text-white"
              >
                {copiedKey === `client-${activeClientTab}` ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
              </Button>

              <pre className="overflow-x-auto text-[11px] leading-relaxed">
                {activeClientTab === "flutter" && flutterSnippet}
                {activeClientTab === "reactnative" && reactNativeSnippet}
                {activeClientTab === "android" && androidSnippet}
                {activeClientTab === "ios" && iosSnippet}
                {activeClientTab === "web" && webSnippet}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* STEP 5: HMAC-SHA256 SIGNATURE VERIFICATION */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="grid size-7 place-items-center rounded-full bg-slate-950 font-bold text-white text-xs">
                5
              </span>
              <div>
                <CardTitle className="text-base text-slate-950">HMAC-SHA256 Signature Verification on Your Webhook Server</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Verify the <code className="text-slate-800 font-mono">X-Signature</code> header on every debit/credit request using your <code className="text-slate-800 font-mono">signing_secret</code>.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1 text-xs">
              <div className="text-slate-800 font-semibold">Canonical String Construction:</div>
              <pre className="font-mono text-slate-800 text-[11px]">
{`v1
\${METHOD.toUpperCase()}
\${req.originalUrl}
\${req.headers['x-timestamp']}
\${req.headers['x-nonce']}
\${crypto.createHash('sha256').update(rawBody).digest('hex')}`}
              </pre>
            </div>

            {/* Language Selector */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              {(["node", "python", "php", "go"] as const).map((lang) => (
                <Button
                  key={lang}
                  size="sm"
                  variant={activeVerifyTab === lang ? "default" : "outline"}
                  onClick={() => setActiveVerifyTab(lang)}
                  className={activeVerifyTab === lang ? "bg-slate-950 text-white font-semibold text-xs" : "border-slate-200 text-slate-700 text-xs"}
                >
                  {lang === "node" ? "Node.js (Express)" : lang === "python" ? "Python (FastAPI)" : lang === "php" ? "PHP" : "Go"}
                </Button>
              ))}
            </div>

            <div className="relative rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-100">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => copyToClipboard(
                  activeVerifyTab === "node" ? verifyNodeSnippet :
                  activeVerifyTab === "python" ? verifyPythonSnippet :
                  activeVerifyTab === "php" ? verifyPhpSnippet : verifyGoSnippet,
                  `verify-${activeVerifyTab}`
                )}
                className="absolute right-3 top-3 size-8 text-slate-400 hover:text-white"
              >
                {copiedKey === `verify-${activeVerifyTab}` ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
              </Button>

              <pre className="overflow-x-auto text-[11px] leading-relaxed">
                {activeVerifyTab === "node" && verifyNodeSnippet}
                {activeVerifyTab === "python" && verifyPythonSnippet}
                {activeVerifyTab === "php" && verifyPhpSnippet}
                {activeVerifyTab === "go" && verifyGoSnippet}
              </pre>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// Snippets
const nodeSnippet = `// Node.js Express Token Generation
const jwt = require('jsonwebtoken');

function createGameLaunchUrl(game, user) {
  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    {
      sub: String(user.id),
      app: process.env.GAME_APP_KEY, // e.g. "zimo-live"
      username: user.name,
      iat: now,
      exp: now + (15 * 60), // 15 minutes expiration
    },
    process.env.GAMES_PLAYER_TOKEN_SECRET,
    { algorithm: 'HS256' }
  );

  const query = new URLSearchParams({
    token,
    app: process.env.GAME_APP_KEY,
    game: game.gameKey,
  });

  return \`\${game.launchUrl}?\${query.toString()}\`;
}`;

const pythonSnippet = `# Python (FastAPI / Flask) Token Generation
import os
import time
from urllib.parse import urlencode
import jwt

def create_game_launch_url(game: dict, user_id: str, username: str) -> str:
    now = int(time.time())
    token = jwt.encode(
        {
            "sub": str(user_id),
            "app": os.environ["GAME_APP_KEY"],
            "username": username,
            "iat": now,
            "exp": now + (15 * 60),
        },
        os.environ["GAMES_PLAYER_TOKEN_SECRET"],
        algorithm="HS256",
    )
    query = urlencode({
        "token": token,
        "app": os.environ["GAME_APP_KEY"],
        "game": game["gameKey"],
    })
    return f"{game['launchUrl']}?{query}"`;

const phpSnippet = `<?php
// PHP (Laravel) Token Generation
use Firebase\\JWT\\JWT;

function createGameLaunchUrl(array $game, $user): string {
    $now = time();
    $payload = [
        'sub' => (string) $user->id,
        'app' => config('services.game.app_key'),
        'username' => $user->name,
        'iat' => $now,
        'exp' => $now + (15 * 60),
    ];

    $token = JWT::encode($payload, config('services.game.player_token_secret'), 'HS256');

    $query = http_build_query([
        'token' => $token,
        'app' => config('services.game.app_key'),
        'game' => $game['gameKey'],
    ]);

    return $game['launchUrl'] . '?' . $query;
}`;

const goSnippet = `// Go Token Generation
package main

import (
	"fmt"
	"net/url"
	"os"
	"time"
	"github.com/golang-jwt/jwt/v5"
)

func CreateGameLaunchURL(launchURL, gameKey, userID, username string) (string, error) {
	now := time.Now()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":      userID,
		"app":      os.Getenv("GAME_APP_KEY"),
		"username": username,
		"iat":      now.Unix(),
		"exp":      now.Add(15 * time.Minute).Unix(),
	})

	tokenString, err := token.SignedString([]byte(os.Getenv("GAMES_PLAYER_TOKEN_SECRET")))
	if err != nil {
		return "", err
	}

	query := url.Values{
		"token": {tokenString},
		"app":   {os.Getenv("GAME_APP_KEY")},
		"game":  {gameKey},
	}
	return fmt.Sprintf("%s?%s", launchURL, query.Encode()), nil
}`;

const javaSnippet = `// Java Token Generation (Auth0 java-jwt)
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import java.time.Instant;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public class GameLauncher {
    public static String createLaunchUrl(String launchUrl, String gameKey, String userId, String username, String appKey, String secret) {
        Instant now = Instant.now();
        Algorithm algorithm = Algorithm.HMAC256(secret);

        String token = JWT.create()
            .withSubject(userId)
            .withClaim("app", appKey)
            .withClaim("username", username)
            .withIssuedAt(now)
            .withExpiresAt(now.plusSeconds(900))
            .sign(algorithm);

        return launchUrl + "?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8)
            + "&app=" + URLEncoder.encode(appKey, StandardCharsets.UTF_8)
            + "&game=" + URLEncoder.encode(gameKey, StandardCharsets.UTF_8);
    }
}`;

const flutterSnippet = `// Flutter WebView Integration with ZimoGameBridge
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class GameScreen extends StatefulWidget {
  final String gameUrl; // URL with signed ?token=...
  const GameScreen({Key? key, required this.gameUrl}) : super(key: key);

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'ZimoGameBridge',
        onMessageReceived: (JavaScriptMessage msg) {
          final data = jsonDecode(msg.message);
          if (data['type'] == 'close') {
            Navigator.of(context).pop();
          } else if (data['type'] == 'recharge') {
            // Player ran out of coins -> open your native coin recharge modal
            showNativeRechargeSheet(context);
          }
        },
      )
      ..loadRequest(Uri.parse(widget.gameUrl));
  }

  // Call this whenever player buys coins in your app to refresh in-game balance instantly:
  void notifyCoinUpdate() {
    _controller.runJavaScript("window.zimoGameEvent && window.zimoGameEvent('walletUpdate')");
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(child: WebViewWidget(controller: _controller)),
    );
  }
}`;

const reactNativeSnippet = `// React Native WebView Integration with ZimoGameBridge
import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export function GameView({ gameUrl, navigation }) {
  const webViewRef = useRef(null);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'close') {
        navigation.goBack();
      } else if (data.type === 'recharge') {
        navigation.navigate('CoinStore');
      }
    } catch (e) {
      console.warn('Bridge parse error', e);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: gameUrl }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1 },
});`;

const androidSnippet = `// Android Kotlin WebView with JavascriptInterface
package com.myapp.games

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject

class GameActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = WebViewClient()
            addJavascriptInterface(GameBridge(), "ZimoGameBridge")
        }
        setContentView(webView)

        val gameUrl = intent.getStringExtra("GAME_URL") ?: return finish()
        webView.loadUrl(gameUrl)
    }

    inner class GameBridge {
        @JavascriptInterface
        fun postMessage(jsonString: String) {
            runOnUiThread {
                val json = JSONObject(jsonString)
                when (json.optString("type")) {
                    "close" -> finish()
                    "recharge" -> openCoinPurchaseDialog()
                }
            }
        }
    }

    private fun openCoinPurchaseDialog() {
        // Show your app's native coin recharge dialog
    }
}`;

const iosSnippet = `// iOS Swift WKWebView with WKScriptMessageHandler
import UIKit
import WebKit

class GameViewController: UIViewController, WKScriptMessageHandler {
    var webView: WKWebView!
    var gameUrl: String = ""

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        let contentController = WKUserContentController()
        contentController.add(self, name: "ZimoGameBridge")

        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        config.allowsInlineMediaPlayback = true

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(webView)

        if let url = URL(string: gameUrl) {
            webView.load(URLRequest(url: url))
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "ZimoGameBridge",
              let body = message.body as? String,
              let data = body.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else { return }

        if type == "close" {
            dismiss(animated: true, completion: nil)
        } else if type == "recharge" {
            presentCoinStore()
        }
    }

    func presentCoinStore() {
        // Show native recharge sheet
    }
}`;

const webSnippet = `<!-- Web / Iframe Integration -->
<iframe
  id="gameFrame"
  src="https://games.example.com/games/greedy-classic?token=...&app=zimo-live&game=greedy-classic"
  style="width: 100%; height: 100vh; border: none;"
  allow="autoplay; fullscreen"
></iframe>

<script>
  window.addEventListener('message', function(event) {
    var data = event.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch(e) {}
    }
    if (data && data.type === 'close') {
      // Close modal / bottom sheet
      document.getElementById('gameModal').style.display = 'none';
    } else if (data && data.type === 'recharge') {
      // Open coin purchase modal
      openRechargeModal();
    }
  });
</script>`;

const verifyNodeSnippet = `// Node.js Express HMAC-SHA256 Verification Middleware
const crypto = require('crypto');

function verifyGamePlatformSignature(req, res, next) {
  const signatureHeader = req.headers['x-signature'] || '';
  const timestamp = req.headers['x-timestamp'] || '';
  const nonce = req.headers['x-nonce'] || '';

  // 1. Check timestamp skew (within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
    return res.status(401).json({ code: 'TIMESTAMP_EXPIRED', message: 'Request expired' });
  }

  // 2. Hash raw body
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');

  // 3. Build Canonical String
  const canonical = ['v1', req.method.toUpperCase(), req.originalUrl, timestamp, nonce, bodyHash].join('\\n');

  // 4. Calculate Expected HMAC
  const expectedSignature = 'v1=' + crypto
    .createHmac('sha256', process.env.GAME_SIGNING_SECRET)
    .update(canonical)
    .digest('hex');

  if (crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expectedSignature))) {
    return next();
  }

  return res.status(401).json({ code: 'INVALID_SIGNATURE', message: 'Signature mismatch' });
}`;

const verifyPythonSnippet = `# Python FastAPI HMAC-SHA256 Verification
import hmac
import hashlib
import time
from fastapi import Request, HTTPException

async def verify_signature(request: Request):
    sig_header = request.headers.get("x-signature", "")
    timestamp = request.headers.get("x-timestamp", "")
    nonce = request.headers.get("x-nonce", "")

    now = int(time.time())
    if abs(now - int(timestamp)) > 300:
        raise HTTPException(status_code=401, detail="Timestamp expired")

    raw_body = await request.body()
    body_hash = hashlib.sha256(raw_body).hexdigest()

    canonical = f"v1\\n{request.method.upper()}\\n{request.url.path}\\n{timestamp}\\n{nonce}\\n{body_hash}"
    expected = "v1=" + hmac.new(
        SECRET.encode("utf-8"),
        canonical.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(sig_header, expected):
        raise HTTPException(status_code=401, detail="Invalid signature")`;

const verifyPhpSnippet = `<?php
// PHP HMAC-SHA256 Verification
function verifySignature($request, $secret) {
    $sig = $request->header('X-Signature');
    $timestamp = $request->header('X-Timestamp');
    $nonce = $request->header('X-Nonce');

    if (abs(time() - intval($timestamp)) > 300) {
        return false;
    }

    $rawBody = $request->getContent();
    $bodyHash = hash('sha256', $rawBody);

    $canonical = implode("\\n", [
        'v1',
        strtoupper($request->method()),
        $request->getRequestUri(),
        $timestamp,
        $nonce,
        $bodyHash
    ]);

    $expected = 'v1=' . hash_hmac('sha256', $canonical, $secret);
    return hash_equals($sig, $expected);
}`;

const verifyGoSnippet = `// Go HMAC-SHA256 Verification
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"
)

func VerifyGameSignature(r *http.Request, secret string) bool {
	sigHeader := r.Header.Get("X-Signature")
	tsStr := r.Header.Get("X-Timestamp")
	nonce := r.Header.Get("X-Nonce")

	ts, err := strconv.ParseInt(tsStr, 10, 64)
	if err != nil || math.Abs(float64(time.Now().Unix()-ts)) > 300 {
		return false
	}

	bodyBytes, _ := io.ReadAll(r.Body)
	bodyHash := sha256.Sum256(bodyBytes)
	hexBodyHash := hex.EncodeToString(bodyHash[:])

	canonical := strings.Join([]string{
		"v1",
		strings.ToUpper(r.Method),
		r.URL.RequestURI(),
		tsStr,
		nonce,
		hexBodyHash,
	}, "\\n")

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(canonical))
	expected := "v1=" + hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(sigHeader), []byte(expected))
}`;
