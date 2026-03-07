/**
 * Proactively clears stale Internet Identity sessions from browser storage.
 *
 * The IC platform stores delegation keys in IndexedDB under the key
 * "Internet Computer Auth Client DB" (database: "auth-client-db" or the
 * legacy "II-storage").  When the stored delegation's ECDSA P256 key no
 * longer matches the one on-chain (e.g. after a key rotation, a
 * new-browser-session, or a Caffeine platform update) every call to the II
 * canister returns:
 *
 *   HTTP 400: Invalid signature: EcdsaP256 signature could not be verified
 *
 * We detect this situation by checking whether:
 *   (a) localStorage contains a known II expiry key that has already expired, OR
 *   (b) sessionStorage / localStorage carry a "bad-session" flag set by the
 *       error handler in App.tsx.
 *
 * In both cases we wipe the IndexedDB stores and localStorage keys used by
 * @dfinity/auth-client so that InternetIdentityProvider starts with a clean
 * slate.
 */

const IDB_DATABASES = [
  "auth-client-db", // @dfinity/auth-client >= 0.15
  "II-storage", // legacy name
  "Internet Computer Auth Client DB", // alternate name used in some versions
];
const IDB_STORE = "ic-keyval";

const LS_EXPIRY_KEY = "ic-delegation-expiry"; // written by some auth-client versions
const LS_BAD_SESSION_KEY = "bonsai-bad-ii-session";

/** Returns true if a stale-session flag was previously set. */
export function hasStaleSessionFlag(): boolean {
  try {
    return localStorage.getItem(LS_BAD_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/** Call this from an error boundary or fetch error handler when an
 *  EcdsaP256 / "Invalid signature" 400 is received from the II canister. */
export function markSessionStale(): void {
  try {
    localStorage.setItem(LS_BAD_SESSION_KEY, "1");
  } catch {
    // storage may be unavailable in some private-browsing modes
  }
}

/** Wipe all II-related storage so the provider starts fresh. */
export async function clearStaleSession(): Promise<void> {
  // Clear the flag itself plus all IC/II localStorage and sessionStorage keys
  try {
    localStorage.removeItem(LS_BAD_SESSION_KEY);
    localStorage.removeItem(LS_EXPIRY_KEY);
    // auth-client also uses keys like "delegation" and "identity"
    for (const key of Object.keys(localStorage)) {
      if (
        key.startsWith("ic-") ||
        key.startsWith("ii-") ||
        key.startsWith("internet-identity") ||
        key === "delegation" ||
        key === "identity"
      ) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (
        key.startsWith("ic-") ||
        key.startsWith("ii-") ||
        key.startsWith("internet-identity")
      ) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }

  // Clear IndexedDB stores
  const clearDb = (dbName: string) =>
    new Promise<void>((resolve) => {
      try {
        const req = indexedDB.open(dbName);
        req.onerror = () => resolve();
        req.onsuccess = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.close();
            resolve();
            return;
          }
          try {
            const tx = db.transaction(IDB_STORE, "readwrite");
            const store = tx.objectStore(IDB_STORE);
            const clearReq = store.clear();
            clearReq.onsuccess = () => {
              db.close();
              resolve();
            };
            clearReq.onerror = () => {
              db.close();
              resolve();
            };
          } catch {
            db.close();
            resolve();
          }
        };
      } catch {
        resolve();
      }
    });

  await Promise.all(IDB_DATABASES.map(clearDb));
}
