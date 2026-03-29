import type { EcosystemGroup, RegistryEntry } from "@/data/registryData";
import type { CallerRatingsMap } from "@/hooks/useCallerRatings";
import type {
  LocalMyRatingsMap,
  LocalRatingsMap,
} from "@/hooks/useLocalRatings";
import type { RatingsMap } from "@/hooks/useRatings";
import { recordEvent } from "@/utils/analytics";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { EntryRatingStats } from "../backend.d";
import { LinkCard } from "./LinkCard";

export type SortMode = "default" | "top-rated" | "most-rated" | "rising";

const TIER_LABELS: Record<number, string> = {
  1: "Foundation",
  2: "Protocol",
  3: "Emerging",
  4: "Developing",
  5: "Commerce",
};

const TIER_DOT: Record<number, string> = {
  1: "bg-yellow-400",
  2: "bg-blue-400",
  3: "bg-green-400",
  4: "bg-purple-400",
  5: "bg-amber-400",
};

/** Extract the numeric backend ID from a registry entry ID string, or null if static */
function getBackendId(entryId: string): string | null {
  if (!entryId.startsWith("backend-")) return null;
  return entryId.replace("backend-", "");
}

interface EcosystemSectionProps {
  group: EcosystemGroup;
  filteredEntries: RegistryEntry[];
  sectionIndex: number;
  defaultOpen?: boolean;
  sortMode?: SortMode;
  ratingsMap?: RatingsMap;
  callerRatingsMap?: CallerRatingsMap;
  onRate?: (entryId: string, rating: number) => void;
  isAuthenticated?: boolean;
  ratingLoadingId?: string | null;
  // Local rating props for static entries
  localRatingsMap?: LocalRatingsMap;
  localMyRatingsMap?: LocalMyRatingsMap;
  onLocalRate?: (url: string, rating: number) => void;
  upvoteCountsMap?: Map<string, bigint>;
}

export function EcosystemSection({
  group,
  filteredEntries,
  sectionIndex,
  defaultOpen = false,
  sortMode = "default",
  ratingsMap = new Map(),
  callerRatingsMap = new Map(),
  onRate,
  isAuthenticated = false,
  ratingLoadingId = null,
  localRatingsMap = new Map(),
  localMyRatingsMap = new Map(),
  onLocalRate,
  upvoteCountsMap = new Map(),
}: EcosystemSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      recordEvent("ecosystem_view", group.slug);
    }
  };

  // Sort entries based on sortMode, combining both backend and local ratings
  const sortedEntries = useMemo<RegistryEntry[]>(() => {
    if (sortMode === "default") return filteredEntries;

    return [...filteredEntries].sort((a, b) => {
      const aId = getBackendId(a.id);
      const bId = getBackendId(b.id);

      // Get stats: prefer backend stats for backend entries, local for static
      const aStats:
        | EntryRatingStats
        | { average: number; count: number }
        | undefined = aId ? ratingsMap.get(aId) : localRatingsMap.get(a.url);
      const bStats:
        | EntryRatingStats
        | { average: number; count: number }
        | undefined = bId ? ratingsMap.get(bId) : localRatingsMap.get(b.url);

      if (sortMode === "top-rated") {
        const aAvg = aStats?.average ?? 0;
        const bAvg = bStats?.average ?? 0;
        const aCount = aStats ? Number(aStats.count) : 0;
        const bCount = bStats ? Number(bStats.count) : 0;
        // Entries with no ratings go last
        if (aAvg === 0 && bAvg === 0) return 0;
        if (aAvg === 0) return 1;
        if (bAvg === 0) return -1;
        if (bAvg !== aAvg) return bAvg - aAvg;
        return bCount - aCount; // tiebreaker: count descending
      }

      if (sortMode === "most-rated") {
        const aCount = aStats ? Number(aStats.count) : 0;
        const bCount = bStats ? Number(bStats.count) : 0;
        return bCount - aCount;
      }

      if (sortMode === "rising") {
        const aUpvotes = aId ? Number(upvoteCountsMap.get(aId) ?? 0n) : 0;
        const bUpvotes = bId ? Number(upvoteCountsMap.get(bId) ?? 0n) : 0;
        return bUpvotes - aUpvotes;
      }

      return 0;
    });
  }, [filteredEntries, sortMode, ratingsMap, localRatingsMap, upvoteCountsMap]);

  if (filteredEntries.length === 0) return null;

  return (
    <section
      id={`section-${group.slug}`}
      data-ocid={`registry.section.item.${sectionIndex}`}
      className="border border-border rounded-lg overflow-hidden bg-card/50"
    >
      {/* ── Section trigger ── */}
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-4 hover:bg-secondary/60 transition-colors group"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Tier dot */}
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${TIER_DOT[group.tier] ?? TIER_DOT[4]}`}
          />

          {/* Token badge */}
          <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-sm flex-shrink-0 tracking-wider">
            {group.token}
          </span>

          {/* Name — display font, large */}
          <h2 className="font-display font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors truncate leading-none">
            {group.name}
          </h2>

          {/* Tier label — subtle, hidden on small */}
          <span className="hidden md:inline font-mono text-[10px] text-muted-foreground/50 uppercase tracking-widest flex-shrink-0">
            {TIER_LABELS[group.tier] ?? "Protocol"}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {filteredEntries.length}
            <span className="text-muted-foreground/50 ml-0.5">
              {filteredEntries.length === 1 ? " project" : " projects"}
            </span>
          </span>
          <div
            className={`w-6 h-6 rounded-sm border flex items-center justify-center transition-all duration-200 ${
              isOpen
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            />
          </div>
        </div>
      </button>

      {/* ── Left-bar open indicator ── */}
      {isOpen && (
        <div className="section-reveal">
          {/* Thin red top bar when open */}
          <div className="h-px bg-primary/30 mx-5" />
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {sortedEntries.map((entry, idx) => {
                const backendId = getBackendId(entry.id);
                const stats = backendId
                  ? (ratingsMap.get(backendId) ?? null)
                  : null;
                const userRating = backendId
                  ? (callerRatingsMap.get(backendId) ?? null)
                  : null;
                // Local (static entry) ratings
                const localStats = !backendId
                  ? (localRatingsMap.get(entry.url) ?? null)
                  : null;
                const localUserRating = !backendId
                  ? (localMyRatingsMap.get(entry.url) ?? null)
                  : null;
                return (
                  <LinkCard
                    key={entry.id}
                    entry={entry}
                    index={idx + 1}
                    stats={stats}
                    userRating={userRating}
                    onRate={onRate}
                    isAuthenticated={isAuthenticated}
                    isRatingLoading={ratingLoadingId === entry.id}
                    localStats={localStats}
                    localUserRating={localUserRating}
                    onLocalRate={onLocalRate}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
