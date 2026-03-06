/**
 * useOisyWallet — ICRC-29 window postMessage transport for OISY wallet.
 *
 * OISY is a browser-based ICP wallet (not an extension).
 * Communication uses window.open + postMessage (ICRC-29).
 *
 * ICRC-29 protocol (per spec):
 *  1. Relying party opens signer window.
 *  2. Relying party REPEATEDLY sends icrc29_status pings with targetOrigin '*'.
 *  3. Signer responds with { result: "ready" } once it is loaded.
 *  4. Connection is established; relying party continues heartbeat pings.
 *  5. All subsequent messages are sent to the signer window with targetOrigin
 *     set to the origin received in the first "ready" response (establishedOrigin).
 *  6. Incoming messages are only accepted if event.source === signerWindow AND
 *     event.origin === establishedOrigin.
 *
 * Standards:
 * - ICRC-25: signer permissions
 * - ICRC-27: get accounts
 * - ICRC-29: window postMessage transport (ready handshake + heartbeat)
 * - ICRC-31: get principals
 * - ICRC-49: call canister (used for ICP transfer)
 */
import { useCallback, useEffect, useRef, useState } from "react";

const OISY_SIGN_URL = "https://oisy.com/sign";

export interface OisyAccount {
  owner: string;
  subaccount?: string | null;
}

export interface OisyWalletState {
  connected: boolean;
  principal: string | null;
  accounts: OisyAccount[];
  isConnecting: boolean;
  error: string | null;
}

export interface UseOisyWalletReturn extends OisyWalletState {
  connect: () => void;
  disconnect: () => void;
  sendCallCanisterRequest: (params: {
    canisterId: string;
    method: string;
    arg: string; // base64-encoded Candid args
  }) => Promise<{
    result?: unknown;
    error?: { code: number; message: string };
  }>;
}

// ─── Simple uuid-v4 generator ─────────────────────────────────────────────────
function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Local storage persistence ────────────────────────────────────────────────
const LS_KEY = "oisy_wallet_state";
function loadPersistedState(): Pick<
  OisyWalletState,
  "connected" | "principal" | "accounts"
> | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function persistState(
  state: Pick<OisyWalletState, "connected" | "principal" | "accounts">,
) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}
function clearPersistedState() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}

export function useOisyWallet(): UseOisyWalletReturn {
  const persisted = loadPersistedState();
  const [state, setState] = useState<OisyWalletState>({
    connected: persisted?.connected ?? false,
    principal: persisted?.principal ?? null,
    accounts: persisted?.accounts ?? [],
    isConnecting: false,
    error: null,
  });

  const popupRef = useRef<Window | null>(null);

  // The origin confirmed by OISY's first "ready" response.
  // Per spec, we must send subsequent messages to this origin.
  const establishedOriginRef = useRef<string | null>(null);

  // Map of pending JSON-RPC calls: id -> resolve/reject pair
  const pendingRef = useRef<
    Map<
      string,
      {
        resolve: (value: unknown) => void;
        reject: (err: Error) => void;
      }
    >
  >(new Map());

  // Callback waiting for icrc29_status "ready" during handshake
  const readyResolveRef = useRef<(() => void) | null>(null);

  // Heartbeat interval (kept alive for connection maintenance per spec)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Stop heartbeat ─────────────────────────────────────────────────────────
  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current !== null) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // ── Start heartbeat (after connection established) ─────────────────────────
  // Per ICRC-29 spec: relying party must keep sending icrc29_status pings
  // so the signer knows the connection is still alive.
  const startHeartbeat = useCallback(
    (popup: Window, targetOrigin: string) => {
      stopHeartbeat();
      heartbeatRef.current = setInterval(() => {
        if (!popup || popup.closed) {
          stopHeartbeat();
          return;
        }
        try {
          popup.postMessage(
            { jsonrpc: "2.0", id: uuid(), method: "icrc29_status" },
            targetOrigin,
          );
        } catch {
          // ignore cross-origin errors
        }
      }, 5_000); // every 5 seconds per spec recommendation
    },
    [stopHeartbeat],
  );

  // ── postMessage handler ────────────────────────────────────────────────────
  const handleMessage = useCallback((event: MessageEvent) => {
    const popup = popupRef.current;

    // Per ICRC-29 spec:
    // - During handshake: accept any origin (we haven't established yet),
    //   but only from our popup window.
    // - After handshake: only accept messages from establishedOrigin AND our popup.
    if (!popup || popup.closed) return;
    if (event.source !== popup) return; // must come from our window

    const established = establishedOriginRef.current;
    if (established && event.origin !== established) return;

    const msg = event.data as {
      jsonrpc?: "2.0";
      id?: string;
      method?: string;
      result?: unknown;
      error?: { code: number; message: string };
    };

    if (!msg || typeof msg !== "object") return;

    // ICRC-29: signer responds to icrc29_status ping with { result: "ready" }
    const isReadyResponse = !msg.method && msg.result === "ready";

    if (isReadyResponse) {
      // Record the established origin from the first ready response
      if (!establishedOriginRef.current) {
        establishedOriginRef.current = event.origin;
      }
      if (readyResolveRef.current) {
        readyResolveRef.current();
        readyResolveRef.current = null;
      }
      return;
    }

    // Resolve a pending call by id
    if (msg.id) {
      const pending = pendingRef.current.get(msg.id);
      if (pending) {
        pendingRef.current.delete(msg.id);
        if (msg.error) {
          pending.reject(
            new Error(`OISY error ${msg.error.code}: ${msg.error.message}`),
          );
        } else {
          pending.resolve(msg.result);
        }
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  // ── Send a JSON-RPC message to the OISY popup ─────────────────────────────
  const sendMessage = useCallback(
    (method: string, params: unknown): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        const popup = popupRef.current;
        if (!popup || popup.closed) {
          reject(new Error("OISY wallet popup is not open"));
          return;
        }

        const targetOrigin = establishedOriginRef.current ?? "*";
        const id = uuid();

        // Timeout after 60s
        const timer = setTimeout(() => {
          if (pendingRef.current.has(id)) {
            pendingRef.current.delete(id);
            reject(new Error("OISY request timed out"));
          }
        }, 60_000);

        pendingRef.current.set(id, {
          resolve: (v) => {
            clearTimeout(timer);
            resolve(v);
          },
          reject: (e) => {
            clearTimeout(timer);
            reject(e);
          },
        });

        popup.postMessage({ jsonrpc: "2.0", id, method, params }, targetOrigin);
      });
    },
    [],
  );

  // ── Wait for OISY popup to signal ready (ICRC-29) ────────────────────────
  // Per spec: relying party sends icrc29_status pings with targetOrigin '*'
  // until OISY responds with { result: "ready" }.
  const waitForPopupReady = useCallback((popup: Window): Promise<void> => {
    return new Promise((resolve, reject) => {
      const maxWait = 30_000; // 30s max
      const start = Date.now();
      let resolved = false;

      // Store resolve so message handler can trigger it
      readyResolveRef.current = () => {
        if (!resolved) {
          resolved = true;
          clearInterval(pingInterval);
          resolve();
        }
      };

      // Poll: send icrc29_status pings every 500ms with targetOrigin '*'
      // This is per ICRC-29 spec — targetOrigin MUST be '*' during handshake
      const pingInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(pingInterval);
          readyResolveRef.current = null;
          if (!resolved)
            reject(new Error("OISY popup was closed before connecting"));
          return;
        }
        if (Date.now() - start > maxWait) {
          clearInterval(pingInterval);
          readyResolveRef.current = null;
          if (!resolved)
            reject(new Error("OISY popup took too long to respond"));
          return;
        }
        try {
          // targetOrigin MUST be '*' per ICRC-29 spec during establishment
          popup.postMessage(
            { jsonrpc: "2.0", id: uuid(), method: "icrc29_status" },
            "*",
          );
        } catch {
          // Cross-origin error while page is loading — keep trying
        }
      }, 500);
    });
  }, []);

  // ── ICRC-29 connection flow ────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (state.isConnecting) return;

    // Close any existing popup
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    stopHeartbeat();
    readyResolveRef.current = null;
    pendingRef.current.clear();
    establishedOriginRef.current = null;

    setState((s) => ({ ...s, isConnecting: true, error: null }));

    const width = 480;
    const height = 700;
    const left = Math.max(0, (window.screen.width - width) / 2);
    const top = Math.max(0, (window.screen.height - height) / 2);

    const popup = window.open(
      OISY_SIGN_URL,
      "oisy-wallet",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );

    if (!popup) {
      setState((s) => ({
        ...s,
        isConnecting: false,
        error:
          "Popup was blocked. Please allow popups for this site and try again.",
      }));
      return;
    }

    popupRef.current = popup;

    // Run connection flow asynchronously
    (async () => {
      try {
        // 1. Wait for OISY to signal it's ready (ICRC-29 handshake)
        await waitForPopupReady(popup);

        // 2. Start heartbeat to maintain connection per spec
        const targetOrigin = establishedOriginRef.current ?? "*";
        startHeartbeat(popup, targetOrigin);

        // 3. Request permissions (ICRC-25)
        await sendMessage("icrc25_request_permissions", {
          scopes: [
            { method: "icrc27_accounts" },
            { method: "icrc49_call_canister" },
            { method: "icrc31_get_principals" },
          ],
        });

        // 4. Get principals (ICRC-31)
        const principalsResult = (await sendMessage(
          "icrc31_get_principals",
          {},
        )) as { principals?: string[] } | null;

        const principal = principalsResult?.principals?.[0] ?? null;

        // 5. Get accounts (ICRC-27)
        const accountsResult = (await sendMessage(
          "icrc27_get_accounts",
          {},
        )) as { accounts?: OisyAccount[] } | null;

        const accounts = accountsResult?.accounts ?? [];

        const newState = {
          connected: true,
          principal,
          accounts,
        };

        persistState(newState);
        setState((s) => ({
          ...s,
          ...newState,
          isConnecting: false,
          error: null,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to connect to OISY";
        setState((s) => ({
          ...s,
          isConnecting: false,
          connected: false,
          error: message,
        }));
        clearPersistedState();
        stopHeartbeat();
      }
    })();
  }, [
    state.isConnecting,
    sendMessage,
    waitForPopupReady,
    startHeartbeat,
    stopHeartbeat,
  ]);

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
    pendingRef.current.clear();
    readyResolveRef.current = null;
    establishedOriginRef.current = null;
    stopHeartbeat();
    clearPersistedState();
    setState({
      connected: false,
      principal: null,
      accounts: [],
      isConnecting: false,
      error: null,
    });
  }, [stopHeartbeat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  // ── ICRC-49: Call canister ─────────────────────────────────────────────────
  const sendCallCanisterRequest = useCallback(
    async (params: { canisterId: string; method: string; arg: string }) => {
      // Ensure popup is open (re-open if needed)
      if (!popupRef.current || popupRef.current.closed) {
        const width = 480;
        const height = 700;
        const left = Math.max(0, (window.screen.width - width) / 2);
        const top = Math.max(0, (window.screen.height - height) / 2);
        const popup = window.open(
          OISY_SIGN_URL,
          "oisy-wallet",
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
        );
        if (!popup) {
          return {
            error: {
              code: -1,
              message: "Popup blocked. Allow popups and retry.",
            },
          };
        }
        popupRef.current = popup;
        establishedOriginRef.current = null;
        await waitForPopupReady(popup);
        const targetOrigin = establishedOriginRef.current ?? "*";
        startHeartbeat(popup, targetOrigin);
      }

      try {
        const result = await sendMessage("icrc49_call_canister", {
          canisterId: params.canisterId,
          sender: state.accounts[0]
            ? { owner: state.accounts[0].owner, subaccount: null }
            : undefined,
          method: params.method,
          arg: params.arg,
        });
        return { result };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "ICRC-49 call failed";
        return { error: { code: -1, message } };
      }
    },
    [sendMessage, waitForPopupReady, startHeartbeat, state.accounts],
  );

  return {
    ...state,
    connect,
    disconnect,
    sendCallCanisterRequest,
  };
}
