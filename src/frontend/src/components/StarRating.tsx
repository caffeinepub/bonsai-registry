import { Loader2, Star } from "lucide-react";
import { useState } from "react";
/**
 * StarRating — community rating UI for registry entries.
 *
 * Shows 5 interactive stars. When authenticated, users can click to rate.
 * When not authenticated, hovering or clicking shows a sign-in prompt.
 * Shows average rating and vote count.
 * Top-rated badge appears when avg >= 4.0 AND count >= 3.
 *
 * showSignInNudge — when true, the sign-in prompt appears immediately on
 * hover (not only on click) for unauthenticated users.
 *
 * isLocal — when true, shows a "Personal rating" label to distinguish from
 * on-chain community ratings.
 */
import type { EntryRatingStats } from "../backend.d";

interface StarRatingProps {
  entryId: string;
  stats: EntryRatingStats | { average: number; count: number } | null;
  userRating: number | null;
  onRate: (rating: number) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  compact?: boolean;
  showSignInNudge?: boolean;
  isLocal?: boolean;
}

export function StarRating({
  stats,
  userRating,
  onRate,
  isAuthenticated,
  isLoading,
  compact = false,
  showSignInNudge = false,
  isLocal = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  const average = stats
    ? typeof stats.average === "number"
      ? stats.average
      : Number(stats.average)
    : 0;
  const count = stats ? Number(stats.count) : 0;
  const isTopRated = average >= 4.0 && count >= 3;

  // Determine which star to visually highlight
  // Priority: hover > userRating > average fill
  const displayRating = hoverRating ?? userRating ?? average;

  function getStarFill(starIndex: number): "full" | "partial" | "empty" {
    const threshold = displayRating;
    if (starIndex <= Math.floor(threshold)) return "full";
    if (starIndex === Math.ceil(threshold) && threshold % 1 > 0)
      return "partial";
    return "empty";
  }

  function handleStarClick(rating: number) {
    if (!isAuthenticated) {
      setShowSignInPrompt(true);
      setTimeout(() => setShowSignInPrompt(false), 3000);
      return;
    }
    setShowSignInPrompt(false);
    onRate(rating);
  }

  function handleStarMouseEnter(starIndex: number) {
    if (isAuthenticated) {
      setHoverRating(starIndex);
    } else if (showSignInNudge) {
      // Show sign-in nudge immediately on hover for unauthenticated users
      setShowSignInPrompt(true);
    }
  }

  function handleStarsMouseLeave() {
    setHoverRating(null);
    if (!isAuthenticated && showSignInNudge) {
      // Keep nudge visible briefly before hiding
      setTimeout(() => setShowSignInPrompt(false), 1500);
    }
  }

  if (compact) {
    // Compact mode: just average + count, no interactivity
    if (!stats || count === 0) return null;
    return (
      <div className="flex items-center gap-1.5">
        <Star
          className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0"
          aria-hidden
        />
        <span className="font-mono text-[10px] text-amber-400 font-bold tabular-nums">
          {average.toFixed(1)}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">
          ({count})
        </span>
        {isTopRated && (
          <span className="font-mono text-[9px] text-amber-400/80 bg-amber-400/10 border border-amber-400/20 px-1 py-0.5 rounded-sm leading-none uppercase tracking-wide">
            Top
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Stars row */}
        <div
          className="flex items-center gap-0.5"
          onMouseLeave={handleStarsMouseLeave}
        >
          {[1, 2, 3, 4, 5].map((starIndex) => {
            const fill = getStarFill(starIndex);
            const isInteractive = !isLoading;
            return (
              <button
                key={starIndex}
                type="button"
                data-ocid={`rating.star.${starIndex}`}
                disabled={isLoading}
                onMouseEnter={() => handleStarMouseEnter(starIndex)}
                onClick={() => handleStarClick(starIndex)}
                className={[
                  "relative w-4 h-4 flex-shrink-0 transition-transform duration-100",
                  isInteractive && isAuthenticated
                    ? "cursor-pointer hover:scale-110 active:scale-95"
                    : isInteractive
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-60",
                ].join(" ")}
                aria-label={`Rate ${starIndex} star${starIndex !== 1 ? "s" : ""}`}
              >
                {fill === "partial" ? (
                  // Partial star: clip left half to amber, right half to muted
                  <span className="relative block w-full h-full">
                    <Star
                      className="absolute inset-0 w-full h-full text-muted-foreground/20 fill-muted-foreground/20"
                      aria-hidden
                    />
                    <span
                      className="absolute inset-0 overflow-hidden"
                      style={{ width: `${(displayRating % 1) * 100}%` }}
                    >
                      <Star
                        className="w-4 h-4 text-amber-400 fill-amber-400"
                        aria-hidden
                      />
                    </span>
                  </span>
                ) : (
                  <Star
                    className={[
                      "w-full h-full transition-colors duration-100",
                      fill === "full"
                        ? "text-amber-400 fill-amber-400"
                        : "text-muted-foreground/25 fill-transparent",
                      // Hover preview when mousing over
                      hoverRating !== null &&
                      hoverRating >= starIndex &&
                      isAuthenticated
                        ? "text-amber-300 fill-amber-300"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Loading spinner */}
        {isLoading && (
          <Loader2
            data-ocid="rating.loading_state"
            className="w-3 h-3 text-amber-400 animate-spin"
            aria-label="Submitting rating..."
          />
        )}

        {/* Stats */}
        {count > 0 ? (
          <span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums leading-none">
            <span className="text-amber-400/80 font-bold">
              {average.toFixed(1)}
            </span>
            <span className="text-muted-foreground/40 mx-0.5">·</span>
            <span>
              {count} vote{count !== 1 ? "s" : ""}
            </span>
          </span>
        ) : (
          <span className="font-mono text-[10px] text-muted-foreground/35 italic leading-none">
            No ratings yet
          </span>
        )}

        {/* Top Rated badge */}
        {isTopRated && (
          <span className="inline-flex items-center gap-0.5 font-mono text-[9px] text-amber-400 bg-amber-400/10 border border-amber-400/25 px-1.5 py-0.5 rounded-sm leading-none uppercase tracking-wide flex-shrink-0">
            <Star className="w-2 h-2 fill-amber-400" aria-hidden />
            Top Rated
          </span>
        )}

        {/* User's own rating indicator */}
        {userRating && !hoverRating && (
          <span className="font-mono text-[9px] text-primary/60 leading-none">
            (your rating: {userRating}★)
          </span>
        )}

        {/* Personal rating label for local (static entry) ratings */}
        {isLocal && (
          <span className="font-mono text-[9px] text-muted-foreground/40 leading-none italic">
            personal
          </span>
        )}
      </div>

      {/* Sign-in prompt — shown on hover (nudge) or click */}
      {showSignInPrompt && (
        <div className="absolute bottom-full left-0 mb-1.5 z-50">
          <div
            data-ocid="rating.signin_button"
            className="font-mono text-[10px] text-foreground bg-popover border border-border px-2.5 py-1.5 rounded shadow-md whitespace-nowrap"
          >
            Sign in with{" "}
            <span className="text-primary font-bold">Internet Identity</span> to
            rate
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border" />
        </div>
      )}
    </div>
  );
}
