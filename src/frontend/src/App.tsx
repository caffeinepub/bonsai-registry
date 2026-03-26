import { Toaster } from "@/components/ui/sonner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BonsaiNewsCarousel } from "./components/BonsaiNewsCarousel";
import type { SortMode } from "./components/EcosystemSection";
import { EcosystemSection } from "./components/EcosystemSection";
import { EmailSignupWidget } from "./components/EmailSignupWidget";
import { FeaturedSection } from "./components/FeaturedSection";
import { FilterBar } from "./components/FilterBar";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { NewsSection } from "./components/NewsSection";
import { OnboardingModal } from "./components/OnboardingModal";
import { PayToListModal } from "./components/PayToListModal";
import { Sidebar } from "./components/Sidebar";
import { TipButton } from "./components/TipButton";
import { TipModal } from "./components/TipModal";
import { AdminPage } from "./components/admin/AdminPage";
import {
  type Category,
  type EcosystemGroup,
  type RegistryEntry,
  type Tier,
  ecosystemGroups,
  totalEcosystems,
  totalEntries,
} from "./data/registryData";
import { useBackendEntries } from "./hooks/useBackendEntries";
import { useCallerRatings } from "./hooks/useCallerRatings";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useLocalRatings } from "./hooks/useLocalRatings";
import { useOisyWallet } from "./hooks/useOisyWallet";
import { useRatings } from "./hooks/useRatings";
import { useRecordEvent } from "./hooks/useRecordEvent";
import { useSubmitRating } from "./hooks/useSubmitRating";
import { AmbassadorPage } from "./pages/AmbassadorPage";
import { BannerLogPage } from "./pages/BannerLogPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { UserProfilePage } from "./pages/UserProfilePage";
// clearStaleSession / markSessionStale are now handled at module level in main.tsx

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [activeChain, setActiveChain] = useState<string>("all");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [ratingLoadingId, setRatingLoadingId] = useState<string | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const [payToListOpen, setPayToListOpen] = useState(false);

  // OISY wallet
  const { connected: oisyConnected } = useOisyWallet();

  // Anonymous analytics
  const record = useRecordEvent();

  // Internet Identity auth
  const {
    identity,
    login,
    clear: logout,
    isLoggingIn,
    isInitializing,
  } = useInternetIdentity();

  // Fetch entries added/edited via the admin panel
  const { backendEntries, isLoading: backendLoading } = useBackendEntries();

  // Community ratings (public — no auth needed)
  const { ratingsMap } = useRatings();

  // Caller's own ratings (only when signed in)
  const { callerRatingsMap } = useCallerRatings(identity ?? undefined);

  // Rating submission mutation
  const submitRating = useSubmitRating();

  // Local (localStorage) ratings for static entries
  const { localRatingsMap, localMyRatingsMap, submitLocalRating } =
    useLocalRatings();

  // Resolve the initial hash: if the URL contains an OAuth callback fragment
  // (from Internet Identity / Microsoft login), restore the saved return path
  // instead of treating the raw callback data as a route hash.
  const resolveInitialHash = () => {
    if (typeof window === "undefined") return "";
    const hash = window.location.hash;
    // OAuth callbacks contain "code=" or "id_token=" in the fragment
    if (
      hash.includes("code=") ||
      hash.includes("id_token=") ||
      hash.includes("access_token=")
    ) {
      const savedPath = sessionStorage.getItem("auth_return_path") || "";
      sessionStorage.removeItem("auth_return_path");
      // Clean the URL so the callback fragment doesn't persist
      if (savedPath) {
        window.location.replace(window.location.pathname + savedPath);
      } else {
        window.location.replace(window.location.pathname);
      }
      return savedPath;
    }
    return hash;
  };

  const [currentHash, setCurrentHash] = useState(() => resolveInitialHash());

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Record page view on mount (intentionally once — record is stable)
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on mount
  useEffect(() => {
    record("page_view", "registry");
  }, []);

  // Show a welcome toast when the user first signs in (identity transition: null → present)
  const prevIdentityRef = useRef<typeof identity>(undefined);
  useEffect(() => {
    const prev = prevIdentityRef.current;
    // undefined = initial render (skip), null = known-logged-out, Identity = signed in
    if (prev !== undefined && prev == null && identity) {
      toast.success("Welcome to Bonsai Registry! 🌿", {
        description: "You're signed in. Head to your profile to customize it.",
        action: {
          label: "View Profile",
          onClick: () => {
            window.location.hash = "#profile";
            setCurrentHash("#profile");
          },
        },
      });
    }
    prevIdentityRef.current = identity;
  }, [identity]);

  // Record search queries (debounced via useRecordEvent)
  useEffect(() => {
    if (searchQuery.trim()) {
      record("search", searchQuery.trim());
    }
  }, [searchQuery, record]);

  // Handle rating submission
  const handleRate = useCallback(
    (entryId: string, rating: number) => {
      if (!identity) {
        toast.error("Please sign in with Internet Identity to rate projects.");
        return;
      }

      // Extract numeric backend ID
      if (!entryId.startsWith("backend-")) return;
      const numericId = BigInt(entryId.replace("backend-", ""));

      setRatingLoadingId(entryId);
      submitRating.mutate(
        { entryId: numericId, rating },
        {
          onSuccess: () => {
            toast.success("Rating submitted! Thank you for your vote.");
            setRatingLoadingId(null);
          },
          onError: (err) => {
            const msg = err.message.includes("Only users")
              ? "Your Internet Identity doesn't have rating permission yet. Try again after a moment."
              : err.message || "Failed to submit rating. Please try again.";
            toast.error(msg);
            setRatingLoadingId(null);
          },
        },
      );
    },
    [identity, submitRating],
  );

  // Merge static + backend entries into a unified set of ecosystem groups.
  // Backend entries take precedence over static ones (same name + ecosystem).
  const mergedGroups = useMemo<EcosystemGroup[]>(() => {
    // Build a lookup for static groups by slug
    const groupMap = new Map<string, EcosystemGroup>(
      ecosystemGroups.map((g) => [g.slug, { ...g, entries: [...g.entries] }]),
    );

    for (const be of backendEntries) {
      const slug = be.ecosystem;

      if (!groupMap.has(slug)) {
        // New ecosystem — create a group on the fly
        const capitalized =
          slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
        groupMap.set(slug, {
          slug,
          name: capitalized,
          token: "",
          tier: 3 as Tier,
          entries: [],
        });
      }

      const group = groupMap.get(slug)!;

      // Deduplicate by URL first, then by name
      const normalizeUrl = (u: string) =>
        u
          .toLowerCase()
          .replace(/\/+$/, "")
          .replace(/^https?:\/\//, "");
      const beUrl = normalizeUrl(be.url ?? "");
      const existingByUrl = beUrl
        ? group.entries.findIndex(
            (e) => normalizeUrl((e as { url?: string }).url ?? "") === beUrl,
          )
        : -1;
      if (existingByUrl >= 0) {
        group.entries[existingByUrl] = be;
      } else {
        const existingByName = group.entries.findIndex(
          (e) => e.name.toLowerCase() === be.name.toLowerCase(),
        );
        if (existingByName >= 0) {
          group.entries[existingByName] = be;
        } else {
          group.entries.push(be);
        }
      }
    }

    // Preserve original tier-based ordering: static groups first in order,
    // then any new backend-only groups at the end.
    const staticSlugs = new Set(ecosystemGroups.map((g) => g.slug));
    const newSlugs = [...groupMap.keys()].filter((s) => !staticSlugs.has(s));

    // Apply admin-saved ecosystem sort/visibility overrides from localStorage
    let overrides: Record<string, { sortOrder?: number; hidden?: boolean }> =
      {};
    try {
      const raw = localStorage.getItem("bonsai_ecosystem_overrides");
      if (raw) overrides = JSON.parse(raw);
    } catch {}

    const allGroups = [
      ...ecosystemGroups.map((g) => groupMap.get(g.slug)!),
      ...newSlugs.map((s) => groupMap.get(s)!),
    ].filter(Boolean);

    // Filter hidden and sort by admin-saved order
    const visible = allGroups.filter((g) => !overrides[g.slug]?.hidden);
    visible.sort((a, b) => {
      const aOrder = overrides[a.slug]?.sortOrder ?? allGroups.indexOf(a);
      const bOrder = overrides[b.slug]?.sortOrder ?? allGroups.indexOf(b);
      return aOrder - bOrder;
    });
    return visible;
  }, [backendEntries]);

  // Derived totals that reflect merged data once backend loads
  const mergedAllEntries = useMemo<RegistryEntry[]>(
    () => mergedGroups.flatMap((g) => g.entries),
    [mergedGroups],
  );
  const displayTotalEntries = backendLoading
    ? totalEntries
    : mergedAllEntries.length;
  const displayTotalEcosystems = backendLoading
    ? totalEcosystems
    : mergedGroups.length;

  // Filter all entries based on active filters + search
  const filteredGroups = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return mergedGroups
      .filter((group) => {
        // Chain filter
        if (activeChain !== "all" && group.slug !== activeChain) return false;
        return true;
      })
      .map((group) => {
        // Deduplicate entries by URL within each group
        const seenUrls = new Set<string>();
        let entries = group.entries.filter((e) => {
          const norm = ((e as { url?: string }).url ?? "")
            .toLowerCase()
            .replace(/\/+$/, "")
            .replace(/^https?:\/\//, "");
          if (!norm || seenUrls.has(norm)) return false;
          seenUrls.add(norm);
          return true;
        });

        // Category filter
        if (activeCategory !== "all") {
          entries = entries.filter((e) => e.tags.includes(activeCategory));
        }

        // Search filter
        if (query) {
          entries = entries.filter(
            (e) =>
              e.name.toLowerCase().includes(query) ||
              e.description.toLowerCase().includes(query) ||
              e.ecosystem.toLowerCase().includes(query) ||
              e.tags.some((t) => t.includes(query)) ||
              group.name.toLowerCase().includes(query) ||
              group.token.toLowerCase().includes(query),
          );
        }

        return { group, entries };
      })
      .filter(({ entries }) => entries.length > 0);
  }, [searchQuery, activeCategory, activeChain, mergedGroups]);

  const filteredCount = useMemo(
    () => filteredGroups.reduce((sum, { entries }) => sum + entries.length, 0),
    [filteredGroups],
  );

  // Groups that match chain filter (for sidebar)
  const sidebarGroups = useMemo(() => {
    if (activeChain !== "all") {
      return mergedGroups.filter((g) => g.slug === activeChain);
    }
    return mergedGroups;
  }, [activeChain, mergedGroups]);

  // Admin route — pass no rating props, keep existing behavior
  if (currentHash === "#admin") {
    return (
      <>
        <AdminPage />
        <Toaster />
      </>
    );
  }

  // Banner Log route
  if (currentHash === "#banner-log") {
    return (
      <>
        <BannerLogPage />
        <Toaster />
      </>
    );
  }

  // Leaderboard route
  if (currentHash === "#leaderboard") {
    return (
      <>
        <LeaderboardPage
          onBack={() => {
            window.location.hash = "";
            setCurrentHash("");
          }}
        />
        <Toaster />
      </>
    );
  }

  // Profile route: #profile, #profile/PRINCIPAL, or #profile/@username
  if (currentHash.startsWith("#profile")) {
    const parts = currentHash.split("/");
    let rawTarget = parts[1] ?? null;
    // Strip @ prefix if someone shares a username-based URL
    // Future: resolve username -> principal; for now just strip the @
    if (rawTarget?.startsWith("@")) {
      rawTarget = rawTarget.slice(1);
    }
    const targetPrincipal = rawTarget;
    return (
      <>
        <UserProfilePage
          targetPrincipal={targetPrincipal}
          onBack={() => {
            window.location.hash = "";
            setCurrentHash("");
          }}
          onLogin={login}
        />
        <Toaster />
      </>
    );
  }

  // Ambassador route
  if (currentHash === "#ambassador") {
    return (
      <>
        <AmbassadorPage
          onBack={() => {
            window.location.hash = "";
            setCurrentHash("");
          }}
        />
        <Toaster />
      </>
    );
  }

  // Handle tip modal open
  const handleTipOpen = () => setTipOpen(true);

  return (
    <>
      {/* Onboarding — auto-shows on first visit */}
      <OnboardingModal
        onLogin={login}
        totalEntries={displayTotalEntries}
        totalEcosystems={displayTotalEcosystems}
      />

      {/* Tip modal */}
      <TipModal open={tipOpen} onClose={() => setTipOpen(false)} />

      {/* Pay to List modal */}
      <PayToListModal
        open={payToListOpen}
        onClose={() => setPayToListOpen(false)}
      />

      {/* Floating tip button */}
      <TipButton onClick={handleTipOpen} />

      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Header */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalEntries={displayTotalEntries}
          totalEcosystems={displayTotalEcosystems}
          mobileNavOpen={mobileNavOpen}
          onToggleMobileNav={() => setMobileNavOpen((v) => !v)}
          backendLoading={backendLoading}
          identity={identity}
          isLoggingIn={isLoggingIn}
          isInitializing={isInitializing}
          onLogin={login}
          onLogout={logout}
          onListProject={() => setPayToListOpen(true)}
          onViewProfile={() => {
            window.location.hash = "#profile";
            setCurrentHash("#profile");
          }}
          oisyConnected={oisyConnected}
        />

        {/* Filter bar */}
        <FilterBar
          activeCategory={activeCategory}
          activeChain={activeChain}
          onCategoryChange={setActiveCategory}
          onChainChange={setActiveChain}
          filteredCount={filteredCount}
          totalCount={mergedAllEntries.length}
          sortMode={sortMode}
          onSortChange={setSortMode}
        />

        {/* Main layout */}
        <div className="flex-1 flex max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-6 gap-6">
          {/* Content area */}
          <main className="flex-1 min-w-0 space-y-2.5">
            {filteredGroups.length === 0 ? (
              <div
                data-ocid="registry.empty_state"
                className="flex flex-col items-center justify-center py-28 text-center"
              >
                <div className="text-6xl mb-5 opacity-60">🌿</div>
                <h3 className="font-display font-bold text-2xl text-foreground mb-2">
                  No results found
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                  Try adjusting your search or removing some filters to explore
                  the full Web3 landscape.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                    setActiveChain("all");
                  }}
                  className="mt-5 px-5 py-2 text-sm font-semibold font-display bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                {/* Intro banner — only on unfiltered view */}
                {searchQuery === "" &&
                  activeCategory === "all" &&
                  activeChain === "all" && (
                    <div className="relative overflow-hidden rounded-lg border border-primary/20 bg-primary/5 px-5 py-4 mb-2">
                      {/* Decorative corner glow */}
                      <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-primary/20 blur-2xl pointer-events-none" />
                      <div className="relative">
                        <p className="font-mono text-[10px] text-primary/60 uppercase tracking-widest mb-1">
                          Welcome to the Registry
                        </p>
                        <h2 className="font-display font-extrabold text-xl sm:text-2xl text-foreground leading-tight mb-2">
                          <span className="text-primary">Bridging</span> the
                          Web3 Community to the Open Web
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                          Your gateway to{" "}
                          <strong className="text-foreground">
                            {displayTotalEntries}+
                          </strong>{" "}
                          curated Web3 projects across{" "}
                          <strong className="text-foreground">
                            {displayTotalEcosystems}+
                          </strong>{" "}
                          decentralized ecosystems — from{" "}
                          <button
                            type="button"
                            onClick={() =>
                              document
                                .getElementById("section-icp")
                                ?.scrollIntoView({ behavior: "smooth" })
                            }
                            className="text-primary hover:underline font-medium"
                          >
                            Internet Computer
                          </button>{" "}
                          &amp;{" "}
                          <button
                            type="button"
                            onClick={() =>
                              document
                                .getElementById("section-hedera")
                                ?.scrollIntoView({ behavior: "smooth" })
                            }
                            className="text-primary hover:underline font-medium"
                          >
                            Hedera HBAR
                          </button>{" "}
                          to gaming, DeFi, NFTs, and RWA tokenization.
                        </p>

                        {/* Community rating CTA */}
                        {!identity && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground/70">
                            <span className="text-amber-400">★</span>
                            <span>
                              <button
                                type="button"
                                onClick={login}
                                className="text-primary hover:underline font-medium"
                              >
                                Sign in with Internet Identity
                              </button>{" "}
                              to rate and rank your favorite Web3 projects
                            </span>
                          </div>
                        )}
                        {identity && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground/70">
                            <span className="text-amber-400">★</span>
                            <span className="text-primary/80 font-medium">
                              You&apos;re signed in — hover any card to rate
                              projects
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {/* Email signup widget — only on unfiltered view */}
                {searchQuery === "" &&
                  activeCategory === "all" &&
                  activeChain === "all" && (
                    <EmailSignupWidget identity={identity} />
                  )}

                {/* Bonsai Ecosystem News Carousel — only on unfiltered view */}
                {searchQuery === "" &&
                  activeCategory === "all" &&
                  activeChain === "all" && <BonsaiNewsCarousel />}

                {/* Featured section — only on unfiltered view */}
                {searchQuery === "" &&
                  activeCategory === "all" &&
                  activeChain === "all" && <FeaturedSection />}

                {/* ICP News & Community Updates — only on unfiltered view */}
                {searchQuery === "" &&
                  activeCategory === "all" &&
                  activeChain === "all" && <NewsSection />}

                {/* Ecosystem sections */}
                {filteredGroups.map(({ group, entries }, idx) => (
                  <EcosystemSection
                    key={group.slug}
                    group={group}
                    filteredEntries={entries}
                    sectionIndex={idx + 1}
                    defaultOpen={idx < 2}
                    sortMode={sortMode}
                    ratingsMap={ratingsMap}
                    callerRatingsMap={callerRatingsMap}
                    onRate={handleRate}
                    isAuthenticated={!!identity}
                    ratingLoadingId={ratingLoadingId}
                    localRatingsMap={localRatingsMap}
                    localMyRatingsMap={localMyRatingsMap}
                    onLocalRate={submitLocalRating}
                  />
                ))}
              </>
            )}
          </main>

          {/* Sidebar */}
          <Sidebar
            groups={sidebarGroups}
            totalEntries={displayTotalEntries}
            totalEcosystems={displayTotalEcosystems}
            mobileOpen={mobileNavOpen}
            onCloseMobile={() => setMobileNavOpen(false)}
          />
        </div>

        {/* Footer */}
        <Footer onTipOpen={handleTipOpen} />
      </div>
      <Toaster />
    </>
  );
}
