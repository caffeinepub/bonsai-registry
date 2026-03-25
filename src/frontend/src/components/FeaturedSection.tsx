import { createActorWithConfig } from "@/config";
import {
  addUtm,
  featuredEntries,
  getActiveBannerAds,
  saveBannerAds,
} from "@/data/monetizationData";
import type { BannerAd } from "@/data/monetizationData";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pause,
  Play,
  Star,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { GetFeaturedModal } from "./GetFeaturedModal";

// ── Banner Media Renderer ──────────────────────────────────────────────────
function BannerMedia({
  ad,
  isPlaying,
  onTogglePlay,
}: { ad: BannerAd; isPlaying: boolean; onTogglePlay: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  if (!ad.mediaUrl || ad.mediaType === "text") {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-accent/20">
        <div className="text-center px-8">
          <p className="font-display text-3xl font-bold text-foreground mb-2">
            {ad.projectName}
          </p>
          <p className="text-muted-foreground text-sm max-w-md">
            {ad.description}
          </p>
        </div>
      </div>
    );
  }

  if (ad.mediaType === "mp4") {
    return (
      <>
        <video
          ref={videoRef}
          src={ad.mediaUrl}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTogglePlay();
          }}
          className="absolute bottom-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          title={isPlaying ? "Pause" : "Play"}
          data-ocid="featured.banner.toggle"
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
        </button>
      </>
    );
  }

  return (
    <img
      src={ad.mediaUrl}
      alt={ad.projectName}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

// ── Single Banner Slide ────────────────────────────────────────────────────
function BannerSlide({ ad }: { ad: BannerAd }) {
  const [isPlaying, setIsPlaying] = useState(true);
  return (
    <div className="relative w-full h-full overflow-hidden">
      <BannerMedia
        ad={ad}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
      />
      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
      {/* Text overlay */}
      <a
        href={addUtm(ad.url)}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between gap-4 z-10"
      >
        <div className="min-w-0">
          <p className="font-display font-bold text-white text-lg leading-tight truncate drop-shadow">
            {ad.projectName}
          </p>
          <p className="text-white/80 text-xs mt-0.5 line-clamp-1 drop-shadow">
            {
              new URL(ad.url.startsWith("http") ? ad.url : `https://${ad.url}`)
                .hostname
            }
          </p>
          {ad.description && (
            <p className="text-white/70 text-xs mt-1 line-clamp-2 max-w-md drop-shadow">
              {ad.description}
            </p>
          )}
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary/80 hover:bg-primary backdrop-blur-sm px-3 py-1.5 rounded-full shrink-0 transition-colors">
          Visit <ExternalLink className="w-3 h-3" />
        </span>
      </a>
    </div>
  );
}

// ── Rich Media Featured Banner Section ────────────────────────────────────
export function FeaturedSection() {
  const [activeBanners, setActiveBanners] = useState<BannerAd[]>(() =>
    getActiveBannerAds(),
  );
  const [_bannersLoading, setBannersLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showGetFeatured, setShowGetFeatured] = useState(false);
  const [hovered, setHovered] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load banners from canister on mount (cross-device persistence)
  useEffect(() => {
    let cancelled = false;
    async function loadFromCanister() {
      try {
        const actor = await createActorWithConfig();
        const json = await actor.getBannerAdsJson();
        if (json && !cancelled) {
          const all = JSON.parse(json) as BannerAd[];
          const now = Date.now();
          const active = all.filter(
            (a) =>
              a.status === "active" && a.startDate <= now && a.endDate >= now,
          );
          setActiveBanners(active);
          // Update localStorage cache for offline use
          saveBannerAds(all);
        }
      } catch {
        // Fall back to localStorage cache already set in initial state
      } finally {
        if (!cancelled) setBannersLoading(false);
      }
    }
    loadFromCanister();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasBanners = activeBanners.length > 0;

  useEffect(() => {
    if (!hasBanners || hovered) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % activeBanners.length);
    }, 6000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hasBanners, activeBanners.length, hovered]);

  const goTo = (idx: number) => {
    setCurrentIndex(idx);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const goPrev = () =>
    goTo((currentIndex - 1 + activeBanners.length) % activeBanners.length);
  const goNext = () => goTo((currentIndex + 1) % activeBanners.length);

  return (
    <section data-ocid="featured.section" className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Star
            className="w-3.5 h-3.5 text-amber-400 fill-amber-400"
            aria-hidden
          />
          <span className="font-display font-bold text-sm text-foreground">
            Featured
          </span>
          {hasBanners && (
            <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wide">
              {activeBanners.length} active
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowGetFeatured(true)}
          data-ocid="featured.open_modal_button"
          className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-400/30 hover:border-amber-400/60 px-3 py-1.5 rounded-full transition-colors"
        >
          <Zap className="w-3 h-3" />
          Get Featured
        </button>
      </div>

      {/* Banner Area */}
      {hasBanners ? (
        <div
          className="relative w-full rounded-xl overflow-hidden border border-border/50"
          style={{ aspectRatio: "4/1", minHeight: "160px", maxHeight: "240px" }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          data-ocid="featured.card"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeBanners[currentIndex]?.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
            >
              <BannerSlide ad={activeBanners[currentIndex]} />
            </motion.div>
          </AnimatePresence>

          {/* Prev/Next arrows — visible on hover */}
          {activeBanners.length > 1 && hovered && (
            <>
              <button
                type="button"
                onClick={goPrev}
                data-ocid="featured.pagination_prev"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={goNext}
                data-ocid="featured.pagination_next"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Navigation dots */}
          {activeBanners.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
              {activeBanners.map((banner, idx) => (
                <button
                  type="button"
                  key={banner.id}
                  onClick={() => goTo(idx)}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    idx === currentIndex
                      ? "bg-white w-3"
                      : "bg-white/50 hover:bg-white/80",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Text-only fallback grid */
        <div className="rounded-lg border border-amber-400/20 bg-amber-500/5 overflow-hidden">
          <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featuredEntries.map((entry, i) => (
              <a
                key={entry.url}
                href={addUtm(entry.url)}
                target="_blank"
                rel="noopener noreferrer"
                data-ocid={`featured.item.${i + 1}`}
                className="group flex flex-col gap-1 rounded-md border border-amber-400/25 bg-amber-500/[0.08] p-3 hover:border-amber-400/50 hover:bg-amber-500/[0.12] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Star
                      className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0"
                      aria-hidden
                    />
                    <span className="text-sm font-semibold font-display text-foreground group-hover:text-amber-400 transition-colors truncate">
                      {entry.name}
                    </span>
                  </div>
                  <ExternalLink
                    className="w-3 h-3 text-muted-foreground/40 group-hover:text-amber-400 flex-shrink-0 transition-colors"
                    aria-hidden
                  />
                </div>
                <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-2">
                  {entry.description}
                </p>
              </a>
            ))}
            {/* CTA when no paid banners */}
            <button
              type="button"
              onClick={() => setShowGetFeatured(true)}
              data-ocid="featured.item.cta"
              className="group flex flex-col gap-1 rounded-md border border-dashed border-amber-400/30 bg-transparent p-3 hover:border-amber-400/60 hover:bg-amber-500/[0.05] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-1.5">
                <Zap
                  className="w-3 h-3 text-amber-400/60 group-hover:text-amber-400 flex-shrink-0"
                  aria-hidden
                />
                <span className="text-sm font-semibold font-display text-amber-400/60 group-hover:text-amber-400 transition-colors">
                  Your Project Here
                </span>
              </div>
              <p className="text-xs text-muted-foreground/60 leading-relaxed">
                Click to get featured in the Bonsai Registry
              </p>
            </button>
          </div>
        </div>
      )}

      <GetFeaturedModal
        open={showGetFeatured}
        onClose={() => setShowGetFeatured(false)}
      />
    </section>
  );
}
