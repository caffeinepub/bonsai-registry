/**
 * useRatings — fetches all entry ratings in bulk from the backend canister.
 * Returns a Map keyed by raw entry ID string (e.g. "1", "5", "23")
 * that matches the numeric part of frontend RegistryEntry IDs like "backend-5".
 *
 * This is a public query call — no authentication needed.
 */
import { createActorWithConfig } from "@/config";
import { useQuery } from "@tanstack/react-query";
import type { EntryRatingStats } from "../backend.d";

export type RatingsMap = Map<string, EntryRatingStats>;

async function fetchAllRatings(): Promise<RatingsMap> {
  const actor = await createActorWithConfig();
  const results = await actor.getAllEntryRatings();
  const map = new Map<string, EntryRatingStats>();
  for (const [id, stats] of results) {
    map.set(id.toString(), stats);
  }
  return map;
}

export interface UseRatingsResult {
  ratingsMap: RatingsMap;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useRatings(): UseRatingsResult {
  const { data, isLoading, isError, refetch } = useQuery<RatingsMap>({
    queryKey: ["all-entry-ratings"],
    queryFn: fetchAllRatings,
    staleTime: 30_000,
    retry: 2,
  });

  return {
    ratingsMap: data ?? new Map(),
    isLoading,
    isError,
    refetch,
  };
}
