/**
 * useCanisterHealth — polls the backend canister with a cheap read query
 * to detect whether it is online, starting up (stopped/recovering), or offline.
 *
 * IC error code IC0508 = "canister is stopped"
 * IC error code IC0503/IC0504 = canister is out of cycles or being upgraded
 *
 * Status:
 *   'online'   — last query succeeded
 *   'starting' — last query returned a known transient IC error (IC0508 etc.)
 *   'offline'  — last query returned an unexpected error or timed out
 *   'unknown'  — initial state, first check not yet completed
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createActorWithConfig } from "../config";

export type CanisterHealthStatus =
  | "unknown"
  | "online"
  | "starting"
  | "offline";

const POLL_INTERVAL_MS = 15_000; // check every 15 s
const REQUEST_TIMEOUT_MS = 8_000; // treat as offline after 8 s

// IC error codes that mean the canister is temporarily stopped / restarting
const TRANSIENT_ERROR_PATTERNS = [
  "IC0508", // canister is stopped
  "IC0503", // canister not found (during upgrade)
  "IC0504", // canister out of cycles
  "is stopped",
  "is being upgraded",
  "stopping",
];

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return TRANSIENT_ERROR_PATTERNS.some((pat) =>
    msg.toLowerCase().includes(pat.toLowerCase()),
  );
}

async function pingCanister(): Promise<CanisterHealthStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const actor = await createActorWithConfig();
    await actor.getTotalEntriesCount();
    return "online";
  } catch (err) {
    if (isTransientError(err)) return "starting";
    return "offline";
  } finally {
    clearTimeout(timer);
  }
}

export interface UseCanisterHealthReturn {
  status: CanisterHealthStatus;
  isChecking: boolean;
  lastChecked: Date | null;
  retry: () => void;
}

export function useCanisterHealth(enabled = true): UseCanisterHealthReturn {
  const [status, setStatus] = useState<CanisterHealthStatus>("unknown");
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const check = useCallback(async () => {
    if (!enabled) return;
    if (isMounted.current) setIsChecking(true);
    try {
      const result = await pingCanister();
      if (isMounted.current) {
        setStatus(result);
        setLastChecked(new Date());
      }
    } finally {
      if (isMounted.current) setIsChecking(false);
    }
  }, [enabled]);

  // Initial check + polling
  useEffect(() => {
    if (!enabled) return;
    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [check, enabled]);

  return { status, isChecking, lastChecked, retry: check };
}
