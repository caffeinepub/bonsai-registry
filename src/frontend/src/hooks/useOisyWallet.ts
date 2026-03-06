/**
 * useOisyWallet — ICRC-29 window postMessage transport for OISY wallet.
 *
 * OISY is a browser-based ICP wallet (not an extension).
 * Communication uses window.open + postMessage (ICRC-29).
 *
 * Standards implemented:
 * - ICRC-25: signer permissions
 * - ICRC-27: get accounts
 * - ICRC-29: window postMessage transport
 * - ICRC-31: get principals
 * - ICRC-49: call canister (used for ICP transfer)
 */
import { useCallback, useEffect, useRef, useState } from "react";

const OISY_ORIGIN = "https://oisy.com";

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

  // ── postMessage handler ────────────────────────────────────────────────────
  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.origin !== OISY_ORIGIN) return;
    const popup = popupRef.current;
    if (!popup || event.source !== popup) return;

    const msg = event.data as {
      jsonrpc: "2.0";
      id?: string;
      method?: string;
      result?: unknown;
      error?: { code: number; message: string };
    };

    if (!msg || msg.jsonrpc !== "2.0") return;

    // Resolve a pending call
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

        const id = uuid();
        pendingRef.current.set(id, { resolve, reject });

        // Timeout after 60s
        const timer = setTimeout(() => {
          if (pendingRef.current.has(id)) {
            pendingRef.current.delete(id);
            reject(new Error("OISY request timed out"));
          }
        }, 60_000);

        // Clean up timer on resolve
        const wrapped = pendingRef.current.get(id)!;
        const originalResolve = wrapped.resolve;
        const originalReject = wrapped.reject;
        wrapped.resolve = (v) => {
          clearTimeout(timer);
          originalResolve(v);
        };
        wrapped.reject = (e) => {
          clearTimeout(timer);
          originalReject(e);
        };

        popup.postMessage({ jsonrpc: "2.0", id, method, params }, OISY_ORIGIN);
      });
    },
    [],
  );

  // ── Wait for popup to be ready (polls for up to 15s) ─────────────────────
  const waitForPopupReady = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        const popup = popupRef.current;
        if (!popup || popup.closed) {
          clearInterval(interval);
          reject(new Error("OISY popup was closed before connection"));
          return;
        }
        if (Date.now() - start > 15_000) {
          clearInterval(interval);
          reject(new Error("OISY popup took too long to load"));
          return;
        }
        // Try posting a ping — OISY will respond once ready
        try {
          const pingId = uuid();
          popup.postMessage(
            {
              jsonrpc: "2.0",
              id: pingId,
              method: "icrc29_status",
              params: {},
            },
            OISY_ORIGIN,
          );
          // Give it 500ms to respond
          const timeout = setTimeout(() => {}, 400);
          clearTimeout(timeout);
          // We'll resolve once we successfully get the ready response below
        } catch {
          // cross-origin before load — keep waiting
        }
      }, 800);

      // We use a simpler approach: just wait 3s for OISY to load
      setTimeout(() => {
        clearInterval(interval);
        resolve();
      }, 3000);
    });
  }, []);

  // ── ICRC-29 connection flow ────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (state.isConnecting) return;

    // Close any existing popup
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }

    setState((s) => ({ ...s, isConnecting: true, error: null }));

    const width = 480;
    const height = 700;
    const left = Math.max(0, (window.screen.width - width) / 2);
    const top = Math.max(0, (window.screen.height - height) / 2);

    const popup = window.open(
      OISY_ORIGIN,
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
        // 1. Wait for OISY to load
        await waitForPopupReady();

        // 2. Request permissions (ICRC-25)
        await sendMessage("icrc25_request_permissions", {
          scopes: [
            { method: "icrc27_accounts" },
            { method: "icrc49_call_canister" },
            { method: "icrc31_get_principals" },
          ],
        });

        // 3. Get principals (ICRC-31)
        const principalsResult = (await sendMessage(
          "icrc31_get_principals",
          {},
        )) as { principals?: string[] } | null;

        const principal = principalsResult?.principals?.[0] ?? null;

        // 4. Get accounts (ICRC-27)
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
      }
    })();
  }, [state.isConnecting, sendMessage, waitForPopupReady]);

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
    pendingRef.current.clear();
    clearPersistedState();
    setState({
      connected: false,
      principal: null,
      accounts: [],
      isConnecting: false,
      error: null,
    });
  }, []);

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
          OISY_ORIGIN,
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
        await waitForPopupReady();
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
    [sendMessage, waitForPopupReady, state.accounts],
  );

  return {
    ...state,
    connect,
    disconnect,
    sendCallCanisterRequest,
  };
}
