import { type ReactNode, createContext, useContext } from "react";
import type { backendInterface } from "../backend";

/**
 * AdminActorContext — provides a pre-authenticated backend actor to the admin subtree.
 *
 * This bypasses the Internet Identity flow entirely. The actor is authenticated
 * via `_initializeAccessControlWithSecret` (caffeineAdminToken) and is injected
 * here so all admin child components can call it without useActor / useInternetIdentity.
 */
const AdminActorContext = createContext<backendInterface | null>(null);

export function AdminActorProvider({
  actor,
  children,
}: {
  actor: backendInterface;
  children: ReactNode;
}) {
  return (
    <AdminActorContext.Provider value={actor}>
      {children}
    </AdminActorContext.Provider>
  );
}

/** Returns the admin-scoped actor. Must be used inside AdminActorProvider. */
export function useAdminActorContext(): backendInterface {
  const ctx = useContext(AdminActorContext);
  if (!ctx) {
    throw new Error(
      "useAdminActorContext must be used inside <AdminActorProvider>",
    );
  }
  return ctx;
}
