/**
 * Bi-directional Bridge between Host Application and Game Platform
 * Fully compatible with standard ZimoGameBridge protocol.
 *
 * Supported Host Environments:
 * - Flutter WebView (JavaScriptChannel `ZimoGameBridge`)
 * - React Native WebView (`window.ReactNativeWebView.postMessage`)
 * - Android Kotlin WebView (`window.ZimoGameBridge.postMessage`)
 * - iOS Swift WebKit (`window.webkit.messageHandlers.ZimoGameBridge.postMessage`)
 * - Web Iframe (`window.parent.postMessage`)
 */

export type BridgeMessage =
  | { type: 'close' }
  | { type: 'recharge' }
  | { type: 'walletUpdate' }
  | { type: string; payload?: unknown };

declare global {
  interface Window {
    ZimoGameBridge?: {
      postMessage: (message: string) => void;
    };
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    webkit?: {
      messageHandlers?: {
        ZimoGameBridge?: {
          postMessage: (message: unknown) => void;
        };
      };
    };
    zimoGameEvent?: (eventName: string, data?: unknown) => void;
  }
}

type WalletUpdateListener = () => void;
const walletUpdateListeners = new Set<WalletUpdateListener>();

let bridgeInitialized = false;

/**
 * Initializes listeners for incoming host app events.
 * Listens for:
 * 1. window.zimoGameEvent('walletUpdate')
 * 2. window.addEventListener('message') from parent iframe
 */
export function initGameBridge(): void {
  if (typeof window === 'undefined' || bridgeInitialized) return;
  bridgeInitialized = true;

  // 1. Hook window.zimoGameEvent for mobile WebViews calling evaluateJavascript
  const originalHandler = window.zimoGameEvent;
  window.zimoGameEvent = (eventName: string, data?: unknown) => {
    if (originalHandler) {
      try {
        originalHandler(eventName, data);
      } catch (e) {
        console.error('Original zimoGameEvent error:', e);
      }
    }

    if (eventName === 'walletUpdate') {
      notifyWalletUpdate();
    }
  };

  // 2. Hook window postMessage for parent iframes
  window.addEventListener('message', (event) => {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data?.type === 'walletUpdate' || data?.action === 'walletUpdate') {
        notifyWalletUpdate();
      }
    } catch {
      // Non-json postMessage
    }
  });
}

function notifyWalletUpdate(): void {
  for (const listener of walletUpdateListeners) {
    try {
      listener();
    } catch (err) {
      console.error('Wallet update listener error:', err);
    }
  }
}

/**
 * Subscribe to automated coin balance refresh triggers from host app.
 */
export function onHostWalletUpdate(callback: WalletUpdateListener): () => void {
  initGameBridge();
  walletUpdateListeners.add(callback);
  return () => {
    walletUpdateListeners.delete(callback);
  };
}

/**
 * Dispatches an outbound message to the host application through all available channels.
 */
export function dispatchToHost(message: BridgeMessage): void {
  if (typeof window === 'undefined') return;

  const jsonStr = JSON.stringify(message);

  // 1. Android & Flutter standard ZimoGameBridge
  if (window.ZimoGameBridge?.postMessage) {
    try {
      window.ZimoGameBridge.postMessage(jsonStr);
      return;
    } catch (e) {
      console.warn('Failed to post to ZimoGameBridge:', e);
    }
  }

  // 2. React Native WebView
  if (window.ReactNativeWebView?.postMessage) {
    try {
      window.ReactNativeWebView.postMessage(jsonStr);
      return;
    } catch (e) {
      console.warn('Failed to post to ReactNativeWebView:', e);
    }
  }

  // 3. iOS Swift WebKit Message Handler
  if (window.webkit?.messageHandlers?.ZimoGameBridge?.postMessage) {
    try {
      window.webkit.messageHandlers.ZimoGameBridge.postMessage(jsonStr);
      return;
    } catch (e) {
      console.warn('Failed to post to iOS WebKit handler:', e);
    }
  }

  // 4. Web Iframe parent postMessage
  if (window.parent && window.parent !== window) {
    try {
      window.parent.postMessage(message, '*');
      return;
    } catch (e) {
      console.warn('Failed to postMessage to parent window:', e);
    }
  }
}

/**
 * Triggers game close event to host app (closing WebView or modal).
 */
export function sendGameClose(): void {
  dispatchToHost({ type: 'close' });
}

/**
 * Triggers host app's native deposit / recharge sheet or modal.
 */
export function sendGameRecharge(): void {
  dispatchToHost({ type: 'recharge' });
}
