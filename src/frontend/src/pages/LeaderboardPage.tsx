/**
 * LeaderboardPage — Public community leaderboard for the Bonsai Registry.
 *
 * Tab 1: Top Rated Projects — entries with ≥3 votes sorted by avg score
 * Tab 2: Top Contributors — community contributors (gracefully empty with guidance)
 *
 * No authentication required; uses public query calls only.
 */
import type { BonsaiRegistryEntry, EntryRatingStats } from "@/backend.d";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createActorWithConfig } from "@/config";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  Medal,
  Star,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { motion } from "motion/react";

interface LeaderboardPageProps {
  onBack: () => void;
}

// ─── Identicon ─────────────────────────────────────────────────────────────────
function Identicon({ seed, size = 36 }: { seed: string; size?: number }) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 137) % 360;
  const h3 = (h1 + 274) % 360;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `conic-gradient(
          oklch(0.60 0.20 ${h1}) 0deg 120deg,
          oklch(0.55 0.18 ${h2}) 120deg 240deg,
          oklch(0.50 0.22 ${h3}) 240deg 360deg
        )`,
        flexShrink: 0,
      }}
      aria-hidden
    />
  );
}

// ─── Rank badge ─────────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  // Gold, silver, bronze special styling; rest are muted
  const gold =
    "bg-[oklch(0.75_0.15_85/15%)] text-[oklch(0.80_0.14_85)] border border-[oklch(0.75_0.15_85/40%)]";
  const silver =
    "bg-[oklch(0.7_0.05_220/15%)] text-[oklch(0.75_0.05_220)] border border-[oklch(0.7_0.05_220/40%)]";
  const bronze =
    "bg-[oklch(0.65_0.10_55/15%)] text-[oklch(0.70_0.10_55)] border border-[oklch(0.65_0.10_55/40%)]";
  const regular = "bg-secondary text-muted-foreground border border-border";

  const cls =
    rank === 1 ? gold : rank === 2 ? silver : rank === 3 ? bronze : regular;

  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold font-mono flex-shrink-0 ${cls}`}
    >
      {rank}
    </span>
  );
}

// ─── Star display ────────────────────────────────────────────────────────────────
function StarRow({ average, count }: { average: number; count: number }) {
  const filled = Math.round(average);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${s <= filled ? "text-amber-400 fill-amber-400" : "text-muted-foreground/25"}`}
          />
        ))}
      </div>
      <span className="text-[12px] font-bold text-amber-400 font-mono leading-none">
        {average.toFixed(1)}
      </span>
      <span className="text-[10px] text-muted-foreground/60 font-mono">
        ({count} {count === 1 ? "vote" : "votes"})
      </span>
    </div>
  );
}

// ─── Ecosystem color chip ─────────────────────────────────────────────────────────
function EcosystemChip({ ecosystem }: { ecosystem: string }) {
  // Derive a deterministic hue from the slug
  let hash = 0;
  for (let i = 0; i < ecosystem.length; i++) {
    hash = ((hash << 5) - hash + ecosystem.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash % 360);

  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider font-semibold flex-shrink-0"
      style={{
        background: `oklch(0.55 0.14 ${hue} / 12%)`,
        color: `oklch(0.72 0.12 ${hue})`,
        border: `1px solid oklch(0.55 0.14 ${hue} / 25%)`,
      }}
    >
      {ecosystem.replace(/-/g, " ")}
    </span>
  );
}

// ─── Combined rated entry ─────────────────────────────────────────────────────────
interface RatedEntry {
  entry: BonsaiRegistryEntry;
  stats: EntryRatingStats;
}

// ─── Data fetchers ────────────────────────────────────────────────────────────────
async function fetchTopRated(): Promise<RatedEntry[]> {
  const actor = await createActorWithConfig();
  const [ratingsRaw, entriesRaw] = await Promise.all([
    actor.getAllEntryRatings(),
    actor.getAllRegistryEntries(0n, 1000n),
  ]);

  // Build a ratings lookup
  const ratingsMap = new Map<string, EntryRatingStats>();
  for (const [id, stats] of ratingsRaw) {
    ratingsMap.set(id.toString(), stats);
  }

  // Build a lookup for entries
  const entryMap = new Map<string, BonsaiRegistryEntry>();
  for (const entry of entriesRaw) {
    entryMap.set(entry.id.toString(), entry);
  }

  // Join: only entries that exist AND have ≥3 votes
  const results: RatedEntry[] = [];
  for (const [idStr, stats] of ratingsMap.entries()) {
    if (Number(stats.count) < 3) continue;
    const entry = entryMap.get(idStr);
    if (!entry) continue;
    results.push({ entry, stats });
  }

  // Sort by average descending, then by count as tiebreaker
  results.sort((a, b) => {
    const diff = b.stats.average - a.stats.average;
    if (Math.abs(diff) > 0.001) return diff;
    return Number(b.stats.count) - Number(a.stats.count);
  });

  return results.slice(0, 50);
}

// ─── Top Rated Tab ────────────────────────────────────────────────────────────────
function TopRatedTab() {
  const { data, isLoading, isError } = useQuery<RatedEntry[]>({
    queryKey: ["leaderboard-top-rated"],
    queryFn: fetchTopRated,
    staleTime: 60_000,
    retry: 2,
  });

  if (isLoading) {
    return (
      <div data-ocid="leaderboard.loading_state" className="space-y-2.5 mt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: stable skeleton
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
          >
            <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
            <Skeleton className="w-9 h-9 rounded-md flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-24 flex-shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        data-ocid="leaderboard.error_state"
        className="mt-8 text-center py-16"
      >
        <TrendingUp className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Unable to load ratings. The canister may be starting up.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Try refreshing in a moment.
        </p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        data-ocid="leaderboard.empty_state"
        className="mt-8 text-center py-20"
      >
        <div className="relative inline-block mb-5">
          <Trophy className="w-14 h-14 text-muted-foreground/20 mx-auto" />
          <span className="absolute -bottom-1 -right-1 text-xl">⭐</span>
        </div>
        <h3 className="font-display font-bold text-lg text-foreground mb-2">
          No ranked projects yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Projects need at least{" "}
          <span className="text-amber-400 font-semibold">
            3 community votes
          </span>{" "}
          to appear here. Sign in and start rating projects to build the
          leaderboard!
        </p>
        <button
          type="button"
          onClick={() => {
            window.location.hash = "";
          }}
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono uppercase tracking-wider border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors"
        >
          <Star className="w-3.5 h-3.5" />
          Rate Projects on the Registry
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-1.5">
      {data.map(({ entry, stats }, index) => {
        const rank = index + 1;
        const isTopThree = rank <= 3;
        const logoSrc = entry.logoUrl ?? null;
        const nameInitial = entry.name.charAt(0).toUpperCase();
        return (
          <motion.a
            key={entry.id.toString()}
            data-ocid={`leaderboard.project.item.${rank}` as string}
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${entry.name} — rated ${stats.average.toFixed(1)} stars`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.4) }}
            className={[
              "group flex items-center gap-3 px-3.5 py-3 rounded-lg border transition-all duration-200 no-underline",
              isTopThree
                ? rank === 1
                  ? "border-[oklch(0.75_0.15_85/30%)] bg-[oklch(0.75_0.15_85/5%)] hover:bg-[oklch(0.75_0.15_85/8%)] hover:border-[oklch(0.75_0.15_85/50%)]"
                  : rank === 2
                    ? "border-[oklch(0.7_0.05_220/30%)] bg-[oklch(0.7_0.05_220/5%)] hover:bg-[oklch(0.7_0.05_220/8%)] hover:border-[oklch(0.7_0.05_220/50%)]"
                    : "border-[oklch(0.65_0.10_55/30%)] bg-[oklch(0.65_0.10_55/5%)] hover:bg-[oklch(0.65_0.10_55/8%)] hover:border-[oklch(0.65_0.10_55/50%)]"
                : "border-border bg-card hover:border-primary/30 hover:bg-card/80",
            ].join(" ")}
          >
            {/* Rank badge */}
            <RankBadge rank={rank} />

            {/* Logo or initial */}
            <div className="w-9 h-9 flex-shrink-0 rounded-md overflow-hidden border border-border bg-secondary flex items-center justify-center">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={entry.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = "none";
                    const parent = img.parentElement;
                    if (parent) {
                      parent.textContent = nameInitial;
                      parent.className +=
                        " text-sm font-bold text-primary font-display";
                    }
                  }}
                />
              ) : (
                <Identicon seed={entry.name + entry.ecosystem} size={36} />
              )}
            </div>

            {/* Name + ecosystem */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-semibold text-sm text-foreground truncate">
                  {entry.name}
                </span>
                {isTopThree && (
                  <span
                    className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                      rank === 1
                        ? "text-[oklch(0.80_0.14_85)] bg-[oklch(0.75_0.15_85/15%)]"
                        : rank === 2
                          ? "text-[oklch(0.75_0.05_220)] bg-[oklch(0.7_0.05_220/15%)]"
                          : "text-[oklch(0.70_0.10_55)] bg-[oklch(0.65_0.10_55/15%)]"
                    }`}
                  >
                    {rank === 1
                      ? "🥇 Gold"
                      : rank === 2
                        ? "🥈 Silver"
                        : "🥉 Bronze"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <EcosystemChip ecosystem={entry.ecosystem} />
                <span className="text-[10px] text-muted-foreground/50 font-mono truncate hidden sm:block">
                  {entry.description.length > 55
                    ? `${entry.description.slice(0, 55)}…`
                    : entry.description}
                </span>
              </div>
            </div>

            {/* Rating + external link */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="hidden sm:block">
                <StarRow average={stats.average} count={Number(stats.count)} />
              </div>
              {/* Mobile: just show avg */}
              <div className="sm:hidden flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-sm font-bold text-amber-400 font-mono">
                  {stats.average.toFixed(1)}
                </span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/70 transition-colors flex-shrink-0" />
            </div>
          </motion.a>
        );
      })}
    </div>
  );
}

// ─── Contributors Tab ─────────────────────────────────────────────────────────────
function ContributorsTab() {
  // Ghost placeholder rows
  const ghostRows = Array.from({ length: 5 }).map((_, i) => ({
    rank: i + 1,
    label: "Be among the first contributors — rate projects to claim your spot",
  }));

  return (
    <div className="mt-4">
      {/* Explanation banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-5 rounded-lg border border-primary/15 bg-primary/5 px-4 py-3.5"
      >
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-primary/70 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-display font-semibold text-foreground mb-1">
              Top Contributors rankings are building
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Community rankings are populated as users interact with the
              registry. Sign in with Internet Identity and rate projects to
              appear on this leaderboard — the more you rate and submit, the
              higher your contribution score.
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.hash = "#profile";
              }}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors"
            >
              <Star className="w-3 h-3" />
              Go to your profile
            </button>
          </div>
        </div>
      </motion.div>

      {/* Ghost rows */}
      <div data-ocid="leaderboard.empty_state" className="space-y-1.5">
        {ghostRows.map((row) => (
          <motion.div
            key={row.rank}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: row.rank * 0.06 }}
            data-ocid={`leaderboard.project.item.${row.rank}` as string}
            className="flex items-center gap-3 px-3.5 py-3 rounded-lg border border-border/50 bg-card/40"
          >
            {/* Ghost rank badge */}
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold font-mono flex-shrink-0 bg-secondary/50 text-muted-foreground/40 border border-border/50">
              {row.rank}
            </span>

            {/* Ghost avatar */}
            <div className="w-9 h-9 rounded-full bg-secondary/40 border border-border/40 flex-shrink-0" />

            {/* Ghost content */}
            <div className="flex-1 space-y-1.5">
              <div className="h-3 rounded bg-secondary/60 w-28 opacity-50" />
              <p className="text-[10px] text-muted-foreground/35 font-mono italic">
                {row.label}
              </p>
            </div>

            {/* Ghost score */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-3 h-3 text-muted-foreground/15" />
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Contribution score info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {[
          {
            icon: <Star className="w-4 h-4 text-amber-400" />,
            label: "Rate a project",
            points: "+1 pt",
            desc: "Each community rating earns you a point",
          },
          {
            icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
            label: "Submit a project",
            points: "+5 pts",
            desc: "Approved listings earn bonus points",
          },
          {
            icon: <Trophy className="w-4 h-4 text-primary" />,
            label: "Top Contributor",
            points: "Badge",
            desc: "Reach top 10 to earn the badge",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-border bg-card px-4 py-3 text-center"
          >
            <div className="flex items-center justify-center mb-2">
              {item.icon}
            </div>
            <p className="text-xs font-display font-semibold text-foreground">
              {item.label}
            </p>
            <p className="text-lg font-bold font-mono text-primary mt-0.5">
              {item.points}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 leading-snug">
              {item.desc}
            </p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────────
export function LeaderboardPage({ onBack }: LeaderboardPageProps) {
  return (
    <div data-ocid="leaderboard.page" className="min-h-screen bg-background">
      {/* Atmospheric background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, oklch(0.25 0.12 27 / 40%) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      {/* Secondary glow — trophy gold bloom */}
      <div
        className="fixed inset-0 pointer-events-none opacity-10"
        style={{
          background:
            "radial-gradient(ellipse 40% 30% at 80% 20%, oklch(0.75 0.15 85 / 30%) 0%, transparent 65%)",
        }}
        aria-hidden
      />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Back button */}
        <button
          type="button"
          data-ocid="leaderboard.back_button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Registry
        </button>

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg border border-[oklch(0.75_0.15_85/40%)] bg-[oklch(0.75_0.15_85/10%)] flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-[oklch(0.80_0.14_85)]" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-foreground leading-tight">
                Leaderboard
              </h1>
              <p className="text-xs font-mono text-muted-foreground/60 uppercase tracking-wider mt-0.5">
                Community rankings across the Web3 ecosystem
              </p>
            </div>
          </div>

          {/* Decorative divider */}
          <div className="flex items-center gap-3 mt-5">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <Medal className="w-4 h-4 text-muted-foreground/30" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          <Tabs defaultValue="top-rated">
            <TabsList className="w-full bg-secondary/60 border border-border">
              <TabsTrigger
                data-ocid="leaderboard.top_rated.tab"
                value="top-rated"
                className="flex-1 flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground text-xs font-mono uppercase tracking-wide"
              >
                <Star className="w-3.5 h-3.5" />
                <span>Top Rated</span>
              </TabsTrigger>
              <TabsTrigger
                data-ocid="leaderboard.contributors.tab"
                value="contributors"
                className="flex-1 flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground text-xs font-mono uppercase tracking-wide"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Contributors</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="top-rated" className="mt-0">
              <TopRatedTab />
            </TabsContent>

            <TabsContent value="contributors" className="mt-0">
              <ContributorsTab />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
