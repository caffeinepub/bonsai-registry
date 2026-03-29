import { addUtm, isFeatured, isVerified } from "@/data/monetizationData";
import type { RegistryEntry } from "@/data/registryData";
import { useActor } from "@/hooks/useActor";
import type { LocalRatingStats } from "@/hooks/useLocalRatings";
import { recordEvent } from "@/utils/analytics";
import { BadgeCheck, ChevronUp, Star } from "lucide-react";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { EntryRatingStats } from "../backend.d";
import { CommentThread } from "./CommentThread";
import { LinkPreviewImage } from "./LinkPreviewImage";
import { StarRating } from "./StarRating";

const TAG_STYLES: Record<string, string> = {
  gaming: "tag-gaming",
  nft: "tag-nft",
  defi: "tag-defi",
  wallet: "tag-wallet",
  exchange: "tag-exchange",
  social: "tag-social",
  tools: "tag-tools",
  commerce: "tag-commerce",
};

const TAG_LABELS: Record<string, string> = {
  gaming: "Gaming",
  nft: "NFT",
  defi: "DeFi",
  wallet: "Wallet",
  exchange: "Exchange",
  social: "Social",
  tools: "Tools",
  commerce: "Commerce",
};

interface LinkCardProps {
  entry: RegistryEntry;
  index: number;
  // Backend entry rating props (on-chain)
  stats?: EntryRatingStats | null;
  userRating?: number | null;
  onRate?: (entryId: string, rating: number) => void;
  isAuthenticated?: boolean;
  isRatingLoading?: boolean;
  // Local (static entry) rating props
  localStats?: LocalRatingStats | null;
  localUserRating?: number | null;
  onLocalRate?: (url: string, rating: number) => void;
}

export function LinkCard({
  entry,
  index,
  stats,
  userRating,
  onRate,
  isAuthenticated = false,
  isRatingLoading = false,
  localStats,
  localUserRating,
  onLocalRate,
}: LinkCardProps) {
  const { actor } = useActor();

  const domain = (() => {
    try {
      return new URL(entry.url).hostname.replace("www.", "");
    } catch {
      return entry.url;
    }
  })();

  // Determine whether this is a backend-managed entry (on-chain ratings)
  // or a static entry (localStorage ratings)
  const isBackendEntry = entry.id.startsWith("backend-");
  const numericEntryId = isBackendEntry
    ? BigInt(entry.id.replace("backend-", ""))
    : null;

  const [upvoteCount, setUpvoteCount] = useState(0);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  useEffect(() => {
    if (!actor || !numericEntryId) return;
    Promise.all([
      (actor as any).getEntryUpvotes(numericEntryId),
      (actor as any).hasCallerUpvoted(numericEntryId),
    ])
      .then(([count, upvoted]) => {
        setUpvoteCount(Number(count));
        setHasUpvoted(Boolean(upvoted));
      })
      .catch(() => {});
  }, [actor, numericEntryId]);

  const handleUpvote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Sign in with Internet Identity to upvote");
      return;
    }
    if (!actor || !numericEntryId) return;
    const prev = hasUpvoted;
    const prevCount = upvoteCount;
    setHasUpvoted(!prev);
    setUpvoteCount(prev ? prevCount - 1 : prevCount + 1);
    try {
      const nowUpvoted = await (actor as any).upvoteEntry(numericEntryId);
      setHasUpvoted(Boolean(nowUpvoted));
      setUpvoteCount((c) => (prev ? c : c));
    } catch {
      setHasUpvoted(prev);
      setUpvoteCount(prevCount);
    }
  };

  const featured = isFeatured(entry.url);
  const verified = isVerified(entry.url);

  return (
    <a
      href={featured ? addUtm(entry.url) : entry.url}
      target="_blank"
      rel="noopener noreferrer"
      data-ocid={`registry.link.item.${index}`}
      className={`link-card group${featured ? " ring-1 ring-amber-400/40 bg-amber-500/5" : ""}`}
      onClick={() => recordEvent("link_click", entry.name)}
    >
      {/* ── Name row ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Favicon with letter fallback */}
          <div className="w-6 h-6 rounded-sm flex-shrink-0 overflow-hidden bg-secondary flex items-center justify-center">
            <img
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
              alt=""
              width={24}
              height={24}
              className="w-full h-full object-contain"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.style.display = "none";
                const sib = t.nextElementSibling as HTMLElement | null;
                if (sib) sib.style.display = "flex";
              }}
            />
            {/* Letter fallback — hidden until img errors */}
            <span
              style={{ display: "none" }}
              className="w-full h-full items-center justify-center font-mono text-[10px] font-bold text-primary uppercase bg-primary/10"
            >
              {entry.name.charAt(0)}
            </span>
          </div>

          <span className="link-card-title text-sm font-semibold font-display transition-colors truncate leading-tight">
            {entry.name}
          </span>

          {/* Verified badge */}
          {verified && (
            <span title="Verified project">
              <BadgeCheck
                className="w-3.5 h-3.5 text-sky-400 flex-shrink-0"
                aria-label="Verified"
              />
            </span>
          )}

          {/* Featured badge */}
          {featured && (
            <span title="Featured project">
              <Star
                className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0"
                aria-label="Featured"
              />
            </span>
          )}
        </div>

        <ExternalLink
          className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary flex-shrink-0 transition-colors"
          aria-hidden
        />
      </div>

      {/* ── Link preview image ── */}
      <LinkPreviewImage
        url={entry.url}
        fallbackDomain={domain}
        className="mt-1.5 border border-border/30 max-h-28 rounded-sm"
        aspectClass="aspect-video"
      />

      {/* ── Description ── */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-0.5">
        {entry.description}
      </p>

      {/* ── Tags ── */}
      <div className="flex flex-wrap gap-1 mt-auto pt-1">
        {entry.tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded-sm border font-medium ${TAG_STYLES[tag] ?? "text-muted-foreground bg-secondary border-border"}`}
          >
            {TAG_LABELS[tag] ?? tag}
          </span>
        ))}
      </div>

      {/* ── Rating ── (all entries) */}
      {/* fieldset prevents the anchor from capturing clicks on interactive star buttons */}
      <fieldset
        aria-label="Rate this project"
        className="mt-1 pt-1.5 border-t border-border/50 border-0 p-0 m-0"
        onClick={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") e.preventDefault();
        }}
      >
        {isBackendEntry ? (
          <StarRating
            entryId={entry.id}
            stats={stats ?? null}
            userRating={userRating ?? null}
            onRate={(rating) => onRate?.(entry.id, rating)}
            isAuthenticated={isAuthenticated}
            isLoading={isRatingLoading}
            showSignInNudge={true}
          />
        ) : (
          <StarRating
            entryId={entry.id}
            stats={
              localStats
                ? { average: localStats.average, count: localStats.count }
                : null
            }
            userRating={localUserRating ?? null}
            onRate={(rating) => onLocalRate?.(entry.url, rating)}
            isAuthenticated={true}
            isLoading={false}
            showSignInNudge={false}
            isLocal={true}
          />
        )}

        {/* Upvote button -- backend entries only */}
        {isBackendEntry && (
          <div
            className="flex items-center gap-1.5 mt-1.5"
            onClick={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") e.preventDefault();
            }}
          >
            <button
              type="button"
              data-ocid="registry.link.upvote"
              onClick={handleUpvote}
              className={[
                "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-all",
                hasUpvoted
                  ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-400"
                  : "border-border/50 text-muted-foreground/50 hover:border-emerald-500/40 hover:text-emerald-400",
              ].join(" ")}
              title={
                isAuthenticated
                  ? hasUpvoted
                    ? "Remove upvote"
                    : "Upvote this project"
                  : "Sign in to upvote"
              }
            >
              <ChevronUp className="w-3 h-3" />
              <span>{upvoteCount}</span>
            </button>
          </div>
        )}
      </fieldset>

      {/* Comment thread -- backend entries only */}
      {isBackendEntry && numericEntryId !== null && (
        <div
          onClick={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") e.preventDefault();
          }}
        >
          <CommentThread entryId={numericEntryId} />
        </div>
      )}
    </a>
  );
}

export type { LinkCardProps };
