/**
 * useBackendEntries — fetches all entries stored in the backend canister
 * and maps them to the static RegistryEntry shape.
 *
 * This is a public query call — no authentication needed.
 */
import { createActorWithConfig } from "@/config";
import type { RegistryEntry, Tier } from "@/data/registryData";
import { useQuery } from "@tanstack/react-query";

function clampTier(n: number): Tier {
  const clamped = Math.max(1, Math.min(5, n)) as Tier;
  return clamped;
}

async function fetchBackendEntries(): Promise<RegistryEntry[]> {
  const actor = await createActorWithConfig();
  const entries = await actor.getAllRegistryEntries(0n, 2000n);
  return entries.map((entry) => ({
    id: `backend-${entry.id.toString()}`,
    name: entry.name,
    description: entry.description,
    url: entry.url,
    ecosystem: entry.ecosystem,
    tags: entry.categories as RegistryEntry["tags"],
    tier: clampTier(Number(entry.tier)),
  }));
}

export interface UseBackendEntriesResult {
  backendEntries: RegistryEntry[];
  isLoading: boolean;
  isError: boolean;
}

export function useBackendEntries(): UseBackendEntriesResult {
  const { data, isLoading, isError } = useQuery<RegistryEntry[]>({
    queryKey: ["backend-registry-entries"],
    queryFn: fetchBackendEntries,
    // Cache for 60 seconds — re-fetch when user navigates back
    staleTime: 60_000,
    // Don't block the page; static entries show immediately
    retry: 2,
  });

  return {
    backendEntries: data ?? [],
    isLoading,
    isError,
  };
}
