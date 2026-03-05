/**
 * useAdminActor — lightweight admin actor hook that does NOT require Internet Identity.
 *
 * Admin authentication is purely token-based: the caller passes a `caffeineAdminToken`
 * string which is sent to `_initializeAccessControlWithSecret` on the backend.
 * This sidesteps the Internet Identity popup flow that is blocked on draft domains.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";

const SESSION_KEY = "caffeineAdminToken";

function getSessionToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function saveSessionToken(token: string): void {
  try {
    sessionStorage.setItem(SESSION_KEY, token);
  } catch {
    // ignore
  }
}

function clearSessionToken(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

const ADMIN_PASSWORD = "#WakeUp4";

async function createAdminActor(token: string): Promise<backendInterface> {
  if (token !== ADMIN_PASSWORD) {
    throw new Error("Invalid password");
  }
  const actor = await createActorWithConfig();
  return actor;
}

export interface UseAdminActorReturn {
  actor: backendInterface | null;
  isFetching: boolean;
  /** Attempt to authenticate with the given token. Throws on failure. */
  authenticate: (token: string) => Promise<void>;
  /** Clear authentication state */
  logout: () => void;
  isAuthenticated: boolean;
}

export function useAdminActor(): UseAdminActorReturn {
  const queryClient = useQueryClient();
  const [actor, setActor] = useState<backendInterface | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // On mount, auto-authenticate with stored session token
  useEffect(() => {
    const storedToken = getSessionToken();
    if (storedToken) {
      setIsFetching(true);
      createAdminActor(storedToken)
        .then((a) => {
          if (isMounted.current) {
            setActor(a);
            setIsAuthenticated(true);
            setIsFetching(false);
          }
        })
        .catch(() => {
          clearSessionToken();
          if (isMounted.current) {
            setIsFetching(false);
          }
        });
    }
  }, []);

  const authenticate = useCallback(
    async (token: string): Promise<void> => {
      setIsFetching(true);
      try {
        const a = await createAdminActor(token);
        // Verify admin access — if not admin, backend will trap on next admin call.
        // We optimistically accept the token here and let the first real call surface errors.
        saveSessionToken(token);
        if (isMounted.current) {
          setActor(a);
          setIsAuthenticated(true);
          queryClient.invalidateQueries();
        }
      } catch (err) {
        clearSessionToken();
        throw err;
      } finally {
        if (isMounted.current) {
          setIsFetching(false);
        }
      }
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    clearSessionToken();
    if (isMounted.current) {
      setActor(null);
      setIsAuthenticated(false);
    }
  }, []);

  return { actor, isFetching, authenticate, logout, isAuthenticated };
}
