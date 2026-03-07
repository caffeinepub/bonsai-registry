/**
 * useOisyWallet — ICRC-29 window postMessage transport for OISY wallet.
 *
 * Implements ICRC-29 spec exactly:
 *  - Opens https://oisy.com/sign as a popup (signerWindow).
 *  - Sends icrc29_status pings with targetOrigin='*' during handshake.
 *  - A message is only accepted from the signer if BOTH:
 *      • event.origin === establishedOrigin
 *      • event.source === signerWindow  (popupRef.current)
 *  - After "ready" is received, establishedOrigin is locked in from event.origin.
 *  - Post-handshake messages sent to signer use establishedOrigin as targetOrigin.
 *  - Heartbeats continue at 5s intervals; failure to respond = disconnected.
 *
 * Standards: ICRC-25, ICRC-27, ICRC-29, ICRC-49
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
  connect: (onConnected?: (principal: string) => void) => void;
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

  // Reference to the OISY popup window (signerWindow per spec)
  const popupRef = useRef<Window | null>(null);

  // The established origin, locked in from the first "ready" response's event.origin
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

  // Heartbeat interval
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Stop heartbeat ─────────────────────────────────────────────────────────
  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current !== null) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // ── Start heartbeat (after connection established) ─────────────────────────
  const startHeartbeat = useCallback(
    (popup: Window) => {
      stopHeartbeat();
      heartbeatRef.current = setInterval(() => {
        if (!popup || popup.closed) {
          stopHeartbeat();
          return;
        }
        try {
          const origin = establishedOriginRef.current ?? "*";
          popup.postMessage(
            { jsonrpc: "2.0", id: uuid(), method: "icrc29_status" },
            origin,
          );
        } catch {
          // ignore
        }
      }, 5_000);
    },
    [stopHeartbeat],
  );

  // ── postMessage handler ────────────────────────────────────────────────────
  // Per ICRC-29 spec: only accept messages where BOTH:
  //   • event.origin === establishedOrigin
  //   • event.source === signerWindow (popupRef.current)
  // During handshake (before origin is established), accept from any origin
  // as long as source matches the popup we opened.
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const popup = popupRef.current;

      // Per ICRC-29: event.source must be the signerWindow
      if (!popup || event.source !== popup) return;

      // If origin is already established, enforce it
      const established = establishedOriginRef.current;
      if (established && event.origin !== established) return;

      const msg = event.data as {
        jsonrpc?: "2.0";
        id?: string;
        method?: string;
        result?: unknown;
        error?: { code: number; message: string };
        type?: string;
      };

      if (!msg || typeof msg !== "object") return;

      // ICRC-29: signer responds to icrc29_status ping with { result: "ready" }
      const isReadyResponse =
        !msg.method &&
        !msg.type &&
        (msg.result === "ready" ||
          (typeof msg.result === "object" &&
            msg.result !== null &&
            (msg.result as { status?: string }).status === "ready"));

      if (isReadyResponse) {
        // Lock in the established origin from this first ready message
        if (!establishedOriginRef.current) {
          establishedOriginRef.current = event.origin;
        }

        if (readyResolveRef.current) {
          readyResolveRef.current();
          readyResolveRef.current = null;
        }
        // Also resolve any pending call with this id if present
        if (msg.id) {
          const pending = pendingRef.current.get(msg.id);
          if (pending) {
            pendingRef.current.delete(msg.id);
            pending.resolve(msg.result);
          }
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Monitor popup closure
  const popupCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startPopupMonitor = useCallback(
    (popup: Window) => {
      if (popupCheckRef.current) clearInterval(popupCheckRef.current);
      popupCheckRef.current = setInterval(() => {
        if (popup.closed) {
          if (popupCheckRef.current) clearInterval(popupCheckRef.current);
          popupCheckRef.current = null;
          // Reject all pending
          for (const p of pendingRef.current.values()) {
            p.reject(new Error("OISY popup closed"));
          }
          pendingRef.current.clear();
          readyResolveRef.current = null;
          stopHeartbeat();
        }
      }, 500);
    },
    [stopHeartbeat],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  // ── Send a JSON-RPC message to the OISY popup ──────────────────────────────
  const sendMessage = useCallback(
    (method: string, params?: unknown): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        const popup = popupRef.current;
        if (!popup || popup.closed) {
          reject(new Error("OISY wallet popup is not open"));
          return;
        }

        const id = uuid();

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

        // Use establishedOrigin for post-handshake messages per spec
        const targetOrigin = establishedOriginRef.current ?? "*";
        const msg: Record<string, unknown> = { jsonrpc: "2.0", id, method };
        if (params !== undefined) msg.params = params;
        popup.postMessage(msg, targetOrigin);
      });
    },
    [],
  );

  // ── Wait for OISY popup to be ready (ICRC-29 handshake) ──────────────────
  // Send icrc29_status pings with targetOrigin='*' until we get { result: "ready" }.
  // Per spec, the relying party sends with targetOrigin='*' during establishment.
  const waitForPopupReady = useCallback((popup: Window): Promise<void> => {
    return new Promise((resolve, reject) => {
      const maxWait = 120_000; // 2 min — user may need time to log in to OISY
      const start = Date.now();
      let resolved = false;
      let pingInterval: ReturnType<typeof setInterval> | null = null;

      const done = () => {
        if (!resolved) {
          resolved = true;
          if (pingInterval) clearInterval(pingInterval);
          readyResolveRef.current = null;
          resolve();
        }
      };

      const fail = (reason: string) => {
        if (!resolved) {
          resolved = true;
          if (pingInterval) clearInterval(pingInterval);
          readyResolveRef.current = null;
          reject(new Error(reason));
        }
      };

      // Store resolve for handleMessage to call when OISY sends "ready"
      readyResolveRef.current = done;

      // Give OISY 1.5 seconds to load before starting pings
      setTimeout(() => {
        if (resolved) return;

        pingInterval = setInterval(() => {
          if (popup.closed) {
            fail("OISY popup was closed before connecting");
            return;
          }
          if (Date.now() - start > maxWait) {
            fail("OISY did not respond in time. Please try again.");
            return;
          }
          try {
            // Per ICRC-29 spec: use '*' as targetOrigin during handshake
            popup.postMessage(
              { jsonrpc: "2.0", id: uuid(), method: "icrc29_status" },
              "*",
            );
          } catch {
            // keep trying
          }
        }, 500);
      }, 1_500);

      // Timeout guard
      setTimeout(() => {
        if (!resolved) {
          fail("OISY did not respond in time. Please try again.");
        }
      }, maxWait);
    });
  }, []);

  // ── Open OISY popup directly ───────────────────────────────────────────────
  const openOisyPopup = useCallback((): Window | null => {
    const width = 480;
    const height = 700;
    const left = Math.max(0, (window.screen.width - width) / 2);
    const top = Math.max(0, (window.screen.height - height) / 2);
    return window.open(
      OISY_SIGN_URL,
      "oisy-wallet",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );
  }, []);

  // ── ICRC-29 connection flow ────────────────────────────────────────────────
  const connect = useCallback(
    (onConnected?: (principal: string) => void) => {
      if (state.isConnecting) return;

      // Close any existing popup
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      stopHeartbeat();
      if (popupCheckRef.current) clearInterval(popupCheckRef.current);
      readyResolveRef.current = null;
      pendingRef.current.clear();
      // Reset established origin for fresh handshake
      establishedOriginRef.current = null;

      setState((s) => ({ ...s, isConnecting: true, error: null }));

      const popup = openOisyPopup();

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
      startPopupMonitor(popup);

      (async () => {
        try {
          // Wait for OISY to signal ready (user logs in, ICRC-29 handshake)
          await waitForPopupReady(popup);

          // Start heartbeat to maintain connection
          startHeartbeat(popup);

          // Request permissions (ICRC-25)
          await sendMessage("icrc25_request_permissions", {
            scopes: [
              { method: "icrc27_accounts" },
              { method: "icrc49_call_canister" },
            ],
          });

          // Get accounts (ICRC-27)
          const accountsResult = (await sendMessage("icrc27_accounts")) as {
            accounts?: OisyAccount[];
          } | null;

          const accounts = accountsResult?.accounts ?? [];
          const principal = accounts[0]?.owner ?? null;

          const newState = { connected: true, principal, accounts };
          persistState(newState);
          setState((s) => ({
            ...s,
            ...newState,
            isConnecting: false,
            error: null,
          }));

          // Close the popup — per spec, relying party is responsible for closing
          if (popup && !popup.closed) {
            popup.close();
          }
          stopHeartbeat();

          // Notify caller
          if (onConnected && principal) {
            onConnected(principal);
          }
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
    },
    [
      state.isConnecting,
      sendMessage,
      waitForPopupReady,
      startHeartbeat,
      stopHeartbeat,
      openOisyPopup,
      startPopupMonitor,
    ],
  );

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
    pendingRef.current.clear();
    readyResolveRef.current = null;
    establishedOriginRef.current = null;
    if (popupCheckRef.current) clearInterval(popupCheckRef.current);
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
      if (popupCheckRef.current) clearInterval(popupCheckRef.current);
    };
  }, [stopHeartbeat]);

  // ── ICRC-49: Call canister ─────────────────────────────────────────────────
  const sendCallCanisterRequest = useCallback(
    async (params: { canisterId: string; method: string; arg: string }) => {
      // Re-open popup if it was closed
      if (!popupRef.current || popupRef.current.closed) {
        // Reset origin for fresh handshake
        establishedOriginRef.current = null;
        const popup = openOisyPopup();
        if (!popup) {
          return {
            error: {
              code: -1,
              message: "Popup blocked. Allow popups and retry.",
            },
          };
        }
        popupRef.current = popup;
        startPopupMonitor(popup);
        await waitForPopupReady(popup);
        startHeartbeat(popup);
      }

      try {
        const result = await sendMessage("icrc49_call_canister", {
          canisterId: params.canisterId,
          sender: state.accounts[0]?.owner ?? state.principal ?? undefined,
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
    [
      sendMessage,
      waitForPopupReady,
      startHeartbeat,
      openOisyPopup,
      startPopupMonitor,
      state.accounts,
      state.principal,
    ],
  );

  return {
    ...state,
    connect,
    disconnect,
    sendCallCanisterRequest,
  };
}
