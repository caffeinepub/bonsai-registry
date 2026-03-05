import { Input } from "@/components/ui/input";
import { Loader2, Menu, Search, TreePine, X } from "lucide-react";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalEntries: number;
  totalEcosystems: number;
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
  backendLoading?: boolean;
}

export function Header({
  searchQuery,
  onSearchChange,
  totalEntries,
  totalEcosystems,
  mobileNavOpen,
  onToggleMobileNav,
  backendLoading = false,
}: HeaderProps) {
  return (
    <header className="header-atmosphere border-b border-border sticky top-0 z-40 backdrop-blur-sm">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        {/* ── Top utility strip ── */}
        <div className="flex items-center justify-between py-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-primary/70 uppercase tracking-widest">
              Web3 Directory
            </span>
            <span className="w-px h-3 bg-border" />
            <span className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest">
              {totalEcosystems}+ Chains · {totalEntries}+ Projects
            </span>
            {backendLoading && (
              <span
                data-ocid="registry.loading_state"
                className="flex items-center gap-1 text-[10px] font-mono text-primary/60 uppercase tracking-widest"
              >
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Syncing
              </span>
            )}
          </div>

          {/* Mobile hamburger — top strip */}
          <button
            type="button"
            data-ocid="mobile.menu.button"
            onClick={onToggleMobileNav}
            className="lg:hidden flex items-center gap-1.5 px-2 py-1 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileNavOpen ? (
              <X className="w-3.5 h-3.5" />
            ) : (
              <Menu className="w-3.5 h-3.5" />
            )}
            <span className="text-[10px] font-mono uppercase">Nav</span>
          </button>
        </div>

        {/* ── Brand + Search row ── */}
        <div className="flex items-center gap-5 py-4">
          {/* Logo mark */}
          <div className="flex-shrink-0 relative">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border border-primary/30 bg-secondary shadow-[0_0_20px_oklch(0.60_0.235_27/18%)]">
              <img
                src="https://cdn.shopify.com/s/files/1/0709/4953/5993/files/logo2_a05c26b6-7472-4a3e-b8bc-48dcb6ca4683.png"
                alt="Bonsai Registry"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const t = e.target as HTMLImageElement;
                  t.style.display = "none";
                  (
                    t.nextElementSibling as HTMLElement | null
                  )?.classList.remove("hidden");
                }}
              />
              <div className="hidden absolute inset-0 flex items-center justify-center bg-primary/10">
                <TreePine className="w-7 h-7 text-primary" />
              </div>
            </div>
            {/* Pulse dot */}
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background animate-pulse" />
          </div>

          {/* Title block */}
          <div className="flex-shrink-0 hidden sm:block">
            <h1 className="font-display font-extrabold leading-none tracking-tight">
              <span
                className="block text-xl sm:text-2xl md:text-3xl text-primary"
                style={{ textShadow: "0 0 32px oklch(0.60 0.235 27 / 45%)" }}
              >
                The Bonsai
              </span>
              <span className="block text-xl sm:text-2xl md:text-3xl text-foreground">
                Registry
              </span>
            </h1>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground/70 uppercase tracking-wider">
              RWA · E-Commerce · Web3 Ecosystems
            </p>
          </div>

          {/* Mobile title (compact) */}
          <div className="sm:hidden flex-shrink-0">
            <h1 className="font-display font-extrabold text-base leading-tight">
              <span className="text-primary">Bonsai</span>{" "}
              <span className="text-foreground">Registry</span>
            </h1>
          </div>

          {/* Search — takes remaining width */}
          <div className="flex-1 relative group">
            <div className="absolute inset-0 rounded-md bg-primary/5 blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
            <Input
              data-ocid="registry.search_input"
              type="search"
              placeholder="Search projects, chains, categories…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-9 h-10 bg-secondary/80 border-border focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Desktop stats pills */}
          <div className="hidden xl:flex items-center gap-2 flex-shrink-0">
            <div className="stat-badge px-3 py-1.5 rounded border border-primary/20 bg-primary/10 text-center">
              <p className="text-base font-bold text-primary leading-none">
                {totalEcosystems}+
              </p>
              <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wide mt-0.5">
                Chains
              </p>
            </div>
            <div className="stat-badge px-3 py-1.5 rounded border border-border bg-secondary text-center">
              <p className="text-base font-bold text-foreground leading-none">
                {totalEntries}+
              </p>
              <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wide mt-0.5">
                Projects
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
