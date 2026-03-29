import type { Category } from "@/data/registryData";
import { AlignJustify, BarChart2, Star, TrendingUp } from "lucide-react";
import type { SortMode } from "./EcosystemSection";

const CATEGORY_FILTERS: { label: string; value: Category | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Gaming", value: "gaming" },
  { label: "DeFi", value: "defi" },
  { label: "NFT", value: "nft" },
  { label: "Wallets", value: "wallet" },
  { label: "Exchange", value: "exchange" },
  { label: "Social", value: "social" },
  { label: "Tools", value: "tools" },
  { label: "Commerce", value: "commerce" },
];

const CHAIN_FILTERS: { label: string; value: string }[] = [
  { label: "All Chains", value: "all" },
  { label: "Bitcoin", value: "bitcoin" },
  { label: "Ethereum", value: "ethereum" },
  { label: "Hedera", value: "hedera" },
  { label: "Solana", value: "solana" },
  { label: "ICP", value: "icp" },
  { label: "Avalanche", value: "avalanche" },
  { label: "BNB", value: "bnb" },
  { label: "Polygon", value: "polygon" },
  { label: "Arbitrum", value: "arbitrum" },
  { label: "Base", value: "base" },
  { label: "Cardano", value: "cardano" },
  { label: "Cosmos", value: "cosmos" },
  { label: "Tezos", value: "tezos" },
  { label: "RWA", value: "rwa" },
  { label: "Creators", value: "creator" },
];

const SORT_OPTIONS: {
  label: string;
  value: SortMode;
  icon: React.ReactNode;
}[] = [
  {
    label: "Default",
    value: "default",
    icon: <AlignJustify className="w-3 h-3" aria-hidden />,
  },
  {
    label: "Top Rated",
    value: "top-rated",
    icon: <Star className="w-3 h-3" aria-hidden />,
  },
  {
    label: "Most Rated",
    value: "most-rated",
    icon: <BarChart2 className="w-3 h-3" aria-hidden />,
  },
  {
    label: "Rising",
    value: "rising",
    icon: <TrendingUp className="w-3 h-3" aria-hidden />,
  },
];

interface FilterBarProps {
  activeCategory: Category | "all";
  activeChain: string;
  onCategoryChange: (cat: Category | "all") => void;
  onChainChange: (chain: string) => void;
  filteredCount: number;
  totalCount: number;
  sortMode?: SortMode;
  onSortChange?: (mode: SortMode) => void;
}

export function FilterBar({
  activeCategory,
  activeChain,
  onCategoryChange,
  onChainChange,
  filteredCount,
  totalCount,
  sortMode = "default",
  onSortChange,
}: FilterBarProps) {
  const isFiltered = activeCategory !== "all" || activeChain !== "all";

  return (
    <div className="sticky top-[89px] z-30 bg-background/92 backdrop-blur-sm border-b border-border">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-2.5 space-y-2">
        {/* ── Category row ── */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-widest flex-shrink-0 w-16 text-right pr-1">
            Cat.
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                data-ocid="registry.filter.tab"
                onClick={() => onCategoryChange(f.value as Category | "all")}
                className={[
                  "flex-shrink-0 px-2.5 py-1 rounded text-[11px] font-medium border transition-all duration-150",
                  activeCategory === f.value
                    ? "filter-pill-active"
                    : "filter-pill-idle",
                ].join(" ")}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chain row ── */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-widest flex-shrink-0 w-16 text-right pr-1">
            Chain
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {CHAIN_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                data-ocid="registry.chain.filter.tab"
                onClick={() => onChainChange(f.value)}
                className={[
                  "flex-shrink-0 px-2.5 py-1 rounded text-[11px] font-medium border transition-all duration-150",
                  activeChain === f.value
                    ? "filter-pill-active"
                    : "filter-pill-idle",
                ].join(" ")}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Sort row ── */}
        {onSortChange && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-widest flex-shrink-0 w-16 text-right pr-1">
              Sort
            </span>
            <div className="flex items-center gap-1.5 flex-nowrap">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  data-ocid="registry.sort.tab"
                  onClick={() => onSortChange(opt.value)}
                  className={[
                    "flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium border transition-all duration-150",
                    sortMode === opt.value
                      ? opt.value === "rising"
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                        : "filter-pill-active"
                      : "filter-pill-idle",
                  ].join(" ")}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Status row ── */}
        <div className="flex items-center gap-3 pb-0.5">
          <span className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-widest w-16 text-right pr-1 flex-shrink-0">
            {/* spacer */}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            <span className="text-primary font-bold tabular-nums">
              {filteredCount}
            </span>
            <span className="text-muted-foreground/50 mx-1">/</span>
            <span className="text-foreground/70 tabular-nums">
              {totalCount}
            </span>
            <span className="text-muted-foreground/50 ml-1">entries</span>
          </span>
          {isFiltered && (
            <>
              <span className="w-px h-3 bg-border" />
              <button
                type="button"
                onClick={() => {
                  onCategoryChange("all");
                  onChainChange("all");
                }}
                className="font-mono text-[11px] text-primary/70 hover:text-primary transition-colors"
              >
                ✕ clear
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
