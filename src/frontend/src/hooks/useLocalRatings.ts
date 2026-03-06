/**
 * useLocalRatings — localStorage-based rating system for static registry entries.
 *
 * Since static entries don't exist in the backend database, we can't use the
 * on-chain rateEntry method. Instead, ratings for static entries are stored
 * locally using two keys:
 *
 * - "bonsai-local-agg"  : Record<url, { sum: number; count: number }>
 *   Aggregate stats — the running sum and total vote count per URL.
 *   Represents this device's cumulative personal votes (not cross-user).
 *
 * - "bonsai-local-mine" : Record<url, number>
 *   The user's most recent personal rating per URL (1-5).
 *
 * Note: localStorage is per-device, so ratings do NOT aggregate across users.
 * We display the user's personal rating and their "personal average" (which
 * for a single user will always equal their latest rating). For the count we
 * track how many times they've re-rated (i.e. it's always 1 unless we want
 * to show "you rated this once"). We keep a count field for API symmetry with
 * the backend RatingStats type.
 */

import { useCallback, useState } from "react";

export interface LocalRatingStats {
  average: number;
  count: number;
}

export type LocalRatingsMap = Map<string, LocalRatingStats>;
export type LocalMyRatingsMap = Map<string, number>;

const AGG_KEY = "bonsai-local-agg";
const MINE_KEY = "bonsai-local-mine";

type AggRecord = Record<string, { sum: number; count: number }>;
type MineRecord = Record<string, number>;

function readAgg(): AggRecord {
  try {
    const raw = localStorage.getItem(AGG_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AggRecord;
  } catch {
    return {};
  }
}

function readMine(): MineRecord {
  try {
    const raw = localStorage.getItem(MINE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as MineRecord;
  } catch {
    return {};
  }
}

function writeAgg(data: AggRecord): void {
  try {
    localStorage.setItem(AGG_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota errors silently
  }
}

function writeMine(data: MineRecord): void {
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota errors silently
  }
}

function buildMaps(
  agg: AggRecord,
  mine: MineRecord,
): [LocalRatingsMap, LocalMyRatingsMap] {
  const ratingsMap: LocalRatingsMap = new Map();
  for (const [url, { sum, count }] of Object.entries(agg)) {
    if (count > 0) {
      ratingsMap.set(url, { average: sum / count, count });
    }
  }
  const myRatingsMap: LocalMyRatingsMap = new Map(Object.entries(mine));
  return [ratingsMap, myRatingsMap];
}

export interface UseLocalRatingsResult {
  localRatingsMap: LocalRatingsMap;
  localMyRatingsMap: LocalMyRatingsMap;
  submitLocalRating: (url: string, rating: number) => void;
}

export function useLocalRatings(): UseLocalRatingsResult {
  // Use a counter to trigger re-renders when localStorage changes
  const [, setRevision] = useState(0);

  const submitLocalRating = useCallback((url: string, rating: number) => {
    const agg = readAgg();
    const mine = readMine();

    const prev = mine[url] ?? null;

    if (prev !== null && agg[url]) {
      // Remove old rating from aggregate
      agg[url].sum = agg[url].sum - prev + rating;
      // Count stays the same — user is updating their rating
    } else {
      // New rating
      const existing = agg[url] ?? { sum: 0, count: 0 };
      agg[url] = {
        sum: existing.sum + rating,
        count: existing.count + 1,
      };
    }

    mine[url] = rating;

    writeAgg(agg);
    writeMine(mine);

    // Force a re-render by bumping the revision counter
    setRevision((r) => r + 1);
  }, []);

  // Build maps freshly on each render (reads from localStorage)
  const agg = readAgg();
  const mine = readMine();
  const [localRatingsMap, localMyRatingsMap] = buildMaps(agg, mine);

  return {
    localRatingsMap,
    localMyRatingsMap,
    submitLocalRating,
  };
}
