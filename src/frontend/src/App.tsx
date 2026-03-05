import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EcosystemSection } from "./components/EcosystemSection";
import { FilterBar } from "./components/FilterBar";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
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

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [activeChain, setActiveChain] = useState<string>("all");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Fetch entries added/edited via the admin panel
  const { backendEntries, isLoading: backendLoading } = useBackendEntries();

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

      // Deduplicate: if a static entry with the same name exists, replace it
      const existingIdx = group.entries.findIndex(
        (e) => e.name.toLowerCase() === be.name.toLowerCase(),
      );
      if (existingIdx >= 0) {
        group.entries[existingIdx] = be;
      } else {
        group.entries.push(be);
      }
    }

    // Preserve original tier-based ordering: static groups first in order,
    // then any new backend-only groups at the end.
    const staticSlugs = new Set(ecosystemGroups.map((g) => g.slug));
    const newSlugs = [...groupMap.keys()].filter((s) => !staticSlugs.has(s));

    return [
      ...ecosystemGroups.map((g) => groupMap.get(g.slug)!),
      ...newSlugs.map((s) => groupMap.get(s)!),
    ];
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
        let entries = group.entries;

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

  // Admin route
  if (currentHash === "#admin") {
    return (
      <>
        <AdminPage />
        <Toaster />
      </>
    );
  }

  return (
    <>
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
        />

        {/* Filter bar */}
        <FilterBar
          activeCategory={activeCategory}
          activeChain={activeChain}
          onCategoryChange={setActiveCategory}
          onChainChange={setActiveChain}
          filteredCount={filteredCount}
          totalCount={mergedAllEntries.length}
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
                      </div>
                    </div>
                  )}

                {/* Ecosystem sections */}
                {filteredGroups.map(({ group, entries }, idx) => (
                  <EcosystemSection
                    key={group.slug}
                    group={group}
                    filteredEntries={entries}
                    sectionIndex={idx + 1}
                    defaultOpen={idx < 2}
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
        <Footer />
      </div>
      <Toaster />
    </>
  );
}
