import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import { InternetIdentityProvider } from "./hooks/useInternetIdentity";
import "../index.css";
import {
  clearStaleSession,
  hasStaleSessionFlag,
  markSessionStale,
} from "./utils/clearStaleSession";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

// ── Stale II session guard ──────────────────────────────────────────────────
// Install a module-level fetch interceptor (before React mounts) that detects
// EcdsaP256 "Invalid signature" 400 responses from the IC network and wipes
// the stale delegation from storage, then reloads for a clean session.
// This runs once and is never torn down by React component lifecycle.
(function installIcSignatureGuard() {
  // If a stale-session flag was already set on a previous page load, clear
  // all II storage now before the AuthClient even initializes.
  if (hasStaleSessionFlag()) {
    clearStaleSession().then(() => {
      window.location.reload();
    });
    return;
  }

  let clearing = false;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    if (!response.ok && response.status === 400 && !clearing) {
      const url =
        typeof args[0] === "string"
          ? args[0]
          : args[0] instanceof Request
            ? args[0].url
            : "";
      // Match any IC API call — the II canister ID may vary across envs
      if (
        url.includes("icp-api.io") ||
        url.includes("ic0.app") ||
        url.includes("identity.internetcomputer.org") ||
        url.includes("doked-biaaa-aaaar-qag2a-cai")
      ) {
        const clone = response.clone();
        clone
          .text()
          .then((body) => {
            if (
              (body.includes("Invalid signature") ||
                body.includes("EcdsaP256")) &&
              !clearing
            ) {
              clearing = true;
              markSessionStale();
              clearStaleSession().then(() => {
                window.location.reload();
              });
            }
          })
          .catch(() => {
            /* ignore */
          });
      }
    }
    return response;
  };
})();
// ────────────────────────────────────────────────────────────────────────────

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <InternetIdentityProvider>
      <App />
    </InternetIdentityProvider>
  </QueryClientProvider>,
);
