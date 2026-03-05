/**
 * useCallerRatings — when a user is authenticated with Internet Identity,
 * fetches all their existing ratings from the backend canister.
 *
 * Returns a Map<entryId string, rating number (1-5)>.
 *
 * Requires an authenticated actor (passes identity to createActorWithConfig).
 */
import { createActorWithConfig } from "@/config";
import type { Identity } from "@icp-sdk/core/agent";
import { useQuery } from "@tanstack/react-query";

export type CallerRatingsMap = Map<string, number>;

async function fetchCallerRatings(
  identity: Identity,
): Promise<CallerRatingsMap> {
  const actor = await createActorWithConfig({ agentOptions: { identity } });
  const results = await actor.getCallerAllRatings();
  const map = new Map<string, number>();
  for (const [id, rating] of results) {
    map.set(id.toString(), Number(rating));
  }
  return map;
}

export interface UseCallerRatingsResult {
  callerRatingsMap: CallerRatingsMap;
  isLoading: boolean;
  isError: boolean;
}

export function useCallerRatings(
  identity: Identity | undefined,
): UseCallerRatingsResult {
  const { data, isLoading, isError } = useQuery<CallerRatingsMap>({
    queryKey: ["caller-ratings", identity?.getPrincipal().toString()],
    queryFn: () => {
      if (!identity) return Promise.resolve(new Map());
      return fetchCallerRatings(identity);
    },
    enabled: !!identity,
    staleTime: 15_000,
    retry: 1,
  });

  return {
    callerRatingsMap: data ?? new Map(),
    isLoading,
    isError,
  };
}
