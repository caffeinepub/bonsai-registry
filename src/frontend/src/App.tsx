import { Toaster } from "@/components/ui/sonner";
import { Twitter } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BonsaiNewsCarousel } from "./components/BonsaiNewsCarousel";
import { CommunitySpotlight } from "./components/CommunitySpotlight";
import { CommunitySubmitModal } from "./components/CommunitySubmitModal";
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
import { useActor } from "./hooks/useActor";
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

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [activeChain, setActiveChain] = useState<string>("all");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [ratingLoadingId, setRatingLoadingId] = useState<string | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const [payToListOpen, setPayToListOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [upvoteCountsMap, setUpvoteCountsMap] = useState<Map<string, bigint>>(
    new Map(),
  );
  const [canisterEcosystemOrder, setCanisterEcosystemOrder] = useState<
    Record<string, { sortOrder?: number; hidden?: boolean }>
  >({});

  const { connected: oisyConnected } = useOisyWallet();
  const record = useRecordEvent();
  const {
    identity,
    login,
    clear: logout,
    isLoggingIn,
    isInitializing,
  } = useInternetIdentity();
  const { backendEntries, isLoading: backendLoading } = useBackendEntries();
  const { actor, isFetching: actorFetching } = useActor();
  const { ratingsMap } = useRatings();
  const { callerRatingsMap } = useCallerRatings(identity ?? undefined);
  const submitRating = useSubmitRating();
  const { localRatingsMap, localMyRatingsMap, submitLocalRating } =
    useLocalRatings();

  useEffect(() => {
    if (!actor || actorFetching) return;
    (actor as any)
      .getEcosystemOrder()
      .then((json) => {
        if (!json?.trim()) return;
        try {
          const parsed = JSON.parse(json) as {
            overrides?: Record<
              string,
              { sortOrder?: number; hidden?: boolean }
            >;
          };
          if (parsed.overrides) {
            setCanisterEcosystemOrder(parsed.overrides);
            localStorage.setItem(
              "bonsai_ecosystem_overrides",
              JSON.stringify(parsed.overrides),
            );
          }
        } catch {}
      })
      .catch(() => {});
  }, [actor, actorFetching]);

  useEffect(() => {
    if (!actor || actorFetching) return;
    (actor as any)
      .getTopUpvotedEntries(100n)
      .then((list: Array<[bigint, bigint]>) => {
        const map = new Map<string, bigint>();
        for (const [id, count] of list) {
          map.set(id.toString(), count);
        }
        setUpvoteCountsMap(map);
      })
      .catch(() => {});
  }, [actor, actorFetching]);

  const resolveInitialHash = () => {
    if (typeof window === "undefined") return "";
    const hash = window.location.hash;
    if (
      hash.includes("code=") ||
      hash.includes("id_token=") ||
      hash.includes("access_token=")
    ) {
      const savedPath = sessionStorage.getItem("auth_return_path") || "";
      sessionStorage.removeItem("auth_return_path");
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: only on mount
  useEffect(() => {
    record("page_view", "registry");
  }, []);

  const prevIdentityRef = useRef<typeof identity>(undefined);
  useEffect(() => {
    const prev = prevIdentityRef.current;
    if (prev !== undefined && prev == null && identity) {
      toast.success("Welcome to Bonsai Registry! \uD83C\uDF3F", {
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

  useEffect(() => {
    if (searchQuery.trim()) record("search", searchQuery.trim());
  }, [searchQuery, record]);

  const handleRate = useCallback(
    (entryId: string, rating: number) => {
      if (!identity) {
        toast.error("Please sign in with Internet Identity to rate projects.");
        return;
      }
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
              : err.message || "Failed to submit rating.";
            toast.error(msg);
            setRatingLoadingId(null);
          },
        },
      );
    },
    [identity, submitRating],
  );

  const mergedGroups = useMemo<EcosystemGroup[]>(() => {
    const groupMap = new Map<string, EcosystemGroup>(
      ecosystemGroups.map((g) => [g.slug, { ...g, entries: [...g.entries] }]),
    );

    for (const be of backendEntries) {
      const slug = be.ecosystem;
      if (!groupMap.has(slug)) {
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

    const staticSlugs = new Set(ecosystemGroups.map((g) => g.slug));
    const newSlugs = [...groupMap.keys()].filter((s) => !staticSlugs.has(s));

    // Merge: canister overrides take precedence over localStorage
    let overrides: Record<string, { sortOrder?: number; hidden?: boolean }> =
      {};
    try {
      const raw = localStorage.getItem("bonsai_ecosystem_overrides");
      if (raw) overrides = JSON.parse(raw);
    } catch {}
    if (Object.keys(canisterEcosystemOrder).length > 0)
      overrides = canisterEcosystemOrder;

    const allGroups = [
      ...ecosystemGroups.map((g) => groupMap.get(g.slug)!),
      ...newSlugs.map((s) => groupMap.get(s)!),
    ].filter(Boolean);
    const visible = allGroups.filter((g) => !overrides[g.slug]?.hidden);
    visible.sort(
      (a, b) =>
        (overrides[a.slug]?.sortOrder ?? allGroups.indexOf(a)) -
        (overrides[b.slug]?.sortOrder ?? allGroups.indexOf(b)),
    );
    return visible;
  }, [backendEntries, canisterEcosystemOrder]);

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

  const filteredGroups = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return mergedGroups
      .filter((group) => activeChain === "all" || group.slug === activeChain)
      .map((group) => {
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
        if (activeCategory !== "all")
          entries = entries.filter((e) => e.tags.includes(activeCategory));
        if (query)
          entries = entries.filter(
            (e) =>
              e.name.toLowerCase().includes(query) ||
              e.description.toLowerCase().includes(query) ||
              e.ecosystem.toLowerCase().includes(query) ||
              e.tags.some((t) => t.includes(query)) ||
              group.name.toLowerCase().includes(query) ||
              group.token.toLowerCase().includes(query),
          );
        return { group, entries };
      })
      .filter(({ entries }) => entries.length > 0);
  }, [searchQuery, activeCategory, activeChain, mergedGroups]);

  const filteredCount = useMemo(
    () => filteredGroups.reduce((sum, { entries }) => sum + entries.length, 0),
    [filteredGroups],
  );
  const sidebarGroups = useMemo(
    () =>
      activeChain !== "all"
        ? mergedGroups.filter((g) => g.slug === activeChain)
        : mergedGroups,
    [activeChain, mergedGroups],
  );

  if (currentHash === "#admin")
    return (
      <>
        <AdminPage />
        <Toaster />
      </>
    );
  if (currentHash === "#banner-log")
    return (
      <>
        <BannerLogPage />
        <Toaster />
      </>
    );
  if (currentHash === "#leaderboard")
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
  if (currentHash.startsWith("#profile")) {
    const parts = currentHash.split("/");
    let rawTarget = parts[1] ?? null;
    if (rawTarget?.startsWith("@")) rawTarget = rawTarget.slice(1);
    return (
      <>
        <UserProfilePage
          targetPrincipal={rawTarget}
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
  if (currentHash === "#ambassador")
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

  const handleTipOpen = () => setTipOpen(true);

  return (
    <>
      <OnboardingModal
        onLogin={login}
        totalEntries={displayTotalEntries}
        totalEcosystems={displayTotalEcosystems}
      />
      <TipModal open={tipOpen} onClose={() => setTipOpen(false)} />
      <PayToListModal
        open={payToListOpen}
        onClose={() => setPayToListOpen(false)}
      />
      <CommunitySubmitModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
      />
      <TipButton onClick={handleTipOpen} />

      <div className="min-h-screen bg-background text-foreground flex flex-col">
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

        <div className="flex-1 flex max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-6 gap-6">
          <main className="flex-1 min-w-0 space-y-2.5">
            {filteredGroups.length === 0 ? (
              <div
                data-ocid="registry.empty_state"
                className="flex flex-col items-center justify-center py-28 text-center"
              >
                <div className="text-6xl mb-5 opacity-60">\uD83C\uDF3F</div>
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
                {searchQuery === "" &&
                  activeCategory === "all" &&
                  activeChain === "all" && (
                    <div className="relative overflow-hidden rounded-lg border border-primary/20 bg-primary/5 px-5 py-4 mb-2">
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
                          decentralized ecosystems \u2014 from{" "}
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
                        <div className="mt-3 flex items-center gap-3 flex-wrap">
                          {!identity && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                              <span className="text-amber-400">\u2605</span>
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
                            <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                              <span className="text-amber-400">\u2605</span>
                              <span className="text-primary/80 font-medium">
                                You&apos;re signed in \u2014 hover any card to
                                rate projects
                              </span>
                            </div>
                          )}
                          <a
                            href="https://odin.fun/token/26j2?ref=bonsai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1 rounded border border-amber-400/30 bg-amber-400/8 text-amber-400 text-xs font-mono hover:bg-amber-400/15 transition-all"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Get $BONSAI on Odin.Fun
                          </a>
                          <a
                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Rooted in Web3. Growing beyond borders. 🌿 Join the Bonsai Ecosystem — the most comprehensive Web3 directory across 35+ blockchains. Get $BONSAI on @OdinFun https://odin.fun/token/26j2?ref=bonsai #BONSAI #ICP #Web3")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1 rounded border border-sky-400/30 bg-sky-400/8 text-sky-400 text-xs font-mono hover:bg-sky-400/15 transition-all"
                          >
                            <Twitter className="w-3 h-3" />
                            Share on X
                          </a>
                          <button
                            type="button"
                            data-ocid="registry.submit.open_modal_button"
                            onClick={() => setSubmitOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded border border-emerald-400/30 bg-emerald-400/8 text-emerald-400 text-xs font-mono hover:bg-emerald-400/15 transition-all"
                          >
                            + Submit a Project
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                {searchQuery === "" &&
                  activeCategory === "all" &&
                  activeChain === "all" && (
                    <EmailSignupWidget identity={identity} />
                  )}
                {searchQuery === "" &&
                  activeCategory === "all" &&
                  activeChain === "all" && <BonsaiNewsCarousel />}
                {searchQuery === "" &&
                  activeCategory === "all" &&
                  activeChain === "all" && <FeaturedSection />}
                {searchQuery === "" &&
                  activeCategory === "all" &&
                  activeChain === "all" && <NewsSection />}
                {searchQuery === "" &&
                  activeCategory === "all" &&
                  activeChain === "all" && (
                    <CommunitySpotlight allEntries={mergedAllEntries} />
                  )}

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
                    upvoteCountsMap={upvoteCountsMap}
                  />
                ))}
              </>
            )}
          </main>

          <Sidebar
            groups={sidebarGroups}
            totalEntries={displayTotalEntries}
            totalEcosystems={displayTotalEcosystems}
            mobileOpen={mobileNavOpen}
            onCloseMobile={() => setMobileNavOpen(false)}
          />
        </div>

        <Footer onTipOpen={handleTipOpen} />
      </div>
      <Toaster />
    </>
  );
}
