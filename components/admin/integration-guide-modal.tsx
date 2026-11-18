"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Globe, Smartphone, ShieldCheck, Terminal, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PlatformAppRecord } from "@/types/admin";

interface IntegrationGuideModalProps {
  app: PlatformAppRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntegrationGuideModal({
  app,
  open,
  onOpenChange,
}: IntegrationGuideModalProps) {
  const [activeTab, setActiveTab] = useState<"client" | "token" | "wallet">("client");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!app) return null;

  const appKey = app.app_key || app.package_name;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://game.maxlived.net";
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://game-api.maxlived.net/api/v1").replace(/\/$/, "");

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Snippet copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const flutterCode = `// Flutter WebView Integration
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
            // Open native recharge/coin purchase sheet
            showRechargeModal(context);
          }
        },
      )
      ..loadRequest(Uri.parse(widget.gameUrl));
  }

  // Call this whenever user's coins change in your app to refresh in-game balance instantly:
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

  const reactNativeCode = `// React Native WebView Integration
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
      console.warn('Bridge message error:', e);
    }
  };

  // Instant coin sync without reloading page:
  const notifyWalletUpdate = () => {
    webViewRef.current?.injectJavaScript("window.zimoGameEvent && window.zimoGameEvent('walletUpdate'); true;");
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});`;

  const webIframeCode = `<!-- Web Embed / Iframe Integration -->
<iframe
  id="game-frame"
  src="${baseUrl}/games/monk-wheel?token=YOUR_SIGNED_PLAYER_TOKEN&app=${appKey}&game=monk-wheel"
  allow="autoplay; fullscreen"
  style="width: 100%; height: 100vh; border: none;"
></iframe>

<script>
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'close') {
      console.log('Player clicked Exit game');
      closeGameModal();
    } else if (event.data?.type === 'recharge') {
      console.log('Player clicked Recharge');
      openRechargeSheet();
    }
  });

  // Call this when player deposits coins in your web app:
  function syncGameBalance() {
    const frame = document.getElementById('game-frame');
    frame.contentWindow.postMessage({ type: 'walletUpdate' }, '*');
  }
</script>`;

  const nodeJwtCode = `// Node.js Backend: Issue 15-Minute Player Token
const jwt = require('jsonwebtoken');

const PLAYER_SECRET = process.env.GAMES_PLAYER_TOKEN_SECRET || '${app.player_token_secret || 'YOUR_PLAYER_TOKEN_SECRET'}';
const APP_KEY = '${appKey}';
const GAMES_HOST = '${baseUrl}';

function generateGameUrl(user, gameKey = 'monk-wheel') {
  // HS256 JWT valid for 15 minutes
  const token = jwt.sign(
    {
      sub: String(user.id),       // Your internal user ID
      app: APP_KEY,               // App identifier
      username: user.name,        // Display name
      avatarUrl: user.avatarUrl,  // Player avatar photo
    },
    PLAYER_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' }
  );

  const query = new URLSearchParams({
    token: token,
    app: APP_KEY,
    game: gameKey,
  });

  const path = gameKey === 'monk-wheel' ? '/games/monk-wheel' : \`/games/\${gameKey}\`;
  return \`\${GAMES_HOST}\${path}?\${query.toString()}\`;
}`;

  const pythonJwtCode = `# Python Backend: Issue 15-Minute Player Token
import time
import jwt
from urllib.parse import urlencode

PLAYER_SECRET = "${app.player_token_secret || 'YOUR_PLAYER_TOKEN_SECRET'}"
APP_KEY = "${appKey}"
GAMES_HOST = "${baseUrl}"

def get_game_url(user_id, display_name, avatar_url=None, game_key="monk-wheel"):
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "app": APP_KEY,
        "username": display_name,
        "avatarUrl": avatar_url,
        "iat": now,
        "exp": now + 900,  # 15 minutes
    }
    token = jwt.encode(payload, PLAYER_SECRET, algorithm="HS256")
    query = urlencode({"token": token, "app": APP_KEY, "game": game_key})
    path = "/games/monk-wheel" if game_key == "monk-wheel" else f"/games/{game_key}"
    return f"{GAMES_HOST}{path}?{query}"`;

  const webhookVerifyNode = `// Node.js Express: HMAC-SHA256 Webhook Verification
const crypto = require('crypto');
const WALLET_SECRET = process.env.WALLET_SIGNING_SECRET; // from Platform App settings

function verifyGamesWebhook(req) {
  const ts = req.get('X-Timestamp') || '';
  const nonce = req.get('X-Nonce') || '';
  const sig = req.get('X-Signature') || '';

  // 1. Validate header formats & timestamp within 5 minutes
  if (!/^\\d+$/.test(ts) || !nonce || !/^v1=[0-9a-f]{64}$/i.test(sig)) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;

  // 2. Canonical message: v1\\nMETHOD\\nURI\\nTS\\nNONCE\\nHASH
  // Signed path is relative to your Webhook Base URL (starts with /internal/wallet)
  const relativePath = req.originalUrl.includes('/internal/wallet')
    ? req.originalUrl.substring(req.originalUrl.indexOf('/internal/wallet'))
    : req.path;
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  const canonical = ['v1', req.method.toUpperCase(), relativePath, ts, nonce, bodyHash].join('\\n');

  // 3. Constant-time timingSafeEqual HMAC comparison
  const expectedHmac = crypto.createHmac('sha256', WALLET_SECRET).update(canonical).digest('hex');
  const want = Buffer.from(expectedHmac, 'hex');
  const got = Buffer.from(sig.slice(3), 'hex');
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

// 1. GET /internal/wallet/:userId/balance -> { "balance": 15000, "currency": "coins" }
// 2. POST /internal/wallet/debit -> { "userId", "amount", "idempotencyKey" }
// 3. POST /internal/wallet/credit -> { "userId", "amount", "idempotencyKey", "type": "game_payout" }
// 4. GET /internal/wallet/transaction/:key -> { "found": false } or { "status": "NOT_FOUND" } / { "found": true, "amount": 500 }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-indigo-600" />
            <DialogTitle>3rd-Party Integration Hub — {app.app_name}</DialogTitle>
          </div>
          <DialogDescription>
            Everything you need to embed games into Android, iOS, Flutter, React Native, and Web with Automated Coin Sync.
          </DialogDescription>
        </DialogHeader>

        <div className="flex border-b border-slate-200 mt-2">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "client"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("client")}
          >
            <Smartphone className="inline size-4 mr-1.5" />
            Mobile App & Webview
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "token"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("token")}
          >
            <ShieldCheck className="inline size-4 mr-1.5" />
            Backend Token Generator
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "wallet"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("wallet")}
          >
            <Terminal className="inline size-4 mr-1.5" />
            Seamless Wallet Webhooks
          </button>
        </div>

        <div className="py-4 space-y-6">
          {activeTab === "client" && (
            <div className="space-y-6">
              <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4 text-xs text-indigo-900">
                <strong className="font-bold text-sm block mb-1">Bi-directional Native Bridge Ready:</strong>
                All embedded WebViews automatically receive back-to-app clicks (<code>type: &quot;close&quot;</code>) and recharge button taps (<code>type: &quot;recharge&quot;</code>). When player deposits coins, call <code>window.zimoGameEvent(&apos;walletUpdate&apos;)</code> to refresh the balance without reloading the game.
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-800">Flutter WebView Implementation</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(flutterCode, "flutter")}
                  >
                    {copiedKey === "flutter" ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
                    Copy Flutter
                  </Button>
                </div>
                <pre className="rounded-lg bg-slate-950 p-3.5 text-xs font-mono text-emerald-300 overflow-x-auto max-h-64">
                  {flutterCode}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-800">React Native WebView Implementation</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(reactNativeCode, "rn")}
                  >
                    {copiedKey === "rn" ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
                    Copy React Native
                  </Button>
                </div>
                <pre className="rounded-lg bg-slate-950 p-3.5 text-xs font-mono text-emerald-300 overflow-x-auto max-h-64">
                  {reactNativeCode}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-800">Web Iframe Implementation</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(webIframeCode, "iframe")}
                  >
                    {copiedKey === "iframe" ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
                    Copy Iframe
                  </Button>
                </div>
                <pre className="rounded-lg bg-slate-950 p-3.5 text-xs font-mono text-emerald-300 overflow-x-auto max-h-64">
                  {webIframeCode}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "token" && (
            <div className="space-y-6">
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4 text-xs text-emerald-900">
                <strong className="font-bold text-sm block mb-1">Server-Side Token Generation (Zero App Secret Exposure):</strong>
                Your mobile client never touches the secret. Your backend signs an HS256 JWT with claims <code>{`{ sub: userId, app: "${appKey}", username: displayName }`}</code> expiring in 15 minutes and passes the URL to your app.
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-800">Node.js (jsonwebtoken)</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(nodeJwtCode, "node")}
                  >
                    {copiedKey === "node" ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
                    Copy Node.js
                  </Button>
                </div>
                <pre className="rounded-lg bg-slate-950 p-3.5 text-xs font-mono text-emerald-300 overflow-x-auto max-h-64">
                  {nodeJwtCode}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-800">Python (PyJWT)</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(pythonJwtCode, "py")}
                  >
                    {copiedKey === "py" ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
                    Copy Python
                  </Button>
                </div>
                <pre className="rounded-lg bg-slate-950 p-3.5 text-xs font-mono text-emerald-300 overflow-x-auto max-h-64">
                  {pythonJwtCode}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "wallet" && (
            <div className="space-y-6">
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 text-xs text-amber-900">
                <strong className="font-bold text-sm block mb-1">Standard B2B Seamless Wallet Protocol:</strong>
                Zero manual transfers. Every bet is debited directly from your host API with an idempotency key (<code>game-bet:{`{betId}`}</code>). All wins are credited immediately (<code>game-payout:{`{betId}`}</code>). Every request is signed with HMAC-SHA256 headers: <code>X-Operator-Id, X-Timestamp, X-Nonce, X-Signature: v1={'{64_hex}'}</code>.
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-800">Webhook Signature Verification Middleware</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(webhookVerifyNode, "webhook")}
                  >
                    {copiedKey === "webhook" ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
                    Copy Verification Code
                  </Button>
                </div>
                <pre className="rounded-lg bg-slate-950 p-3.5 text-xs font-mono text-emerald-300 overflow-x-auto max-h-72">
                  {webhookVerifyNode}
                </pre>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <h4 className="font-bold text-sm text-slate-900">4 Required Host Wallet Endpoints:</h4>
                <ul className="text-xs space-y-2 font-mono text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">GET</span>
                    <span>/internal/wallet/{`{userId}`}/balance &rarr; Returns current coins</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">POST</span>
                    <span>/internal/wallet/debit &rarr; Debits stake before bet accepted</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">POST</span>
                    <span>/internal/wallet/credit &rarr; Credits winnings or refund</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">GET</span>
                    <span>/internal/wallet/transaction/{`{idempotencyKey}`} &rarr; Timeout recovery</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
