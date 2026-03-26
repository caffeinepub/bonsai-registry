import { Input } from "@/components/ui/input";
import type { Identity } from "@icp-sdk/core/agent";
import {
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Search,
  TreePine,
  Trophy,
  User,
  X,
} from "lucide-react";
import { OisyConnectButton } from "./OisyConnectButton";
import { PriceTicker } from "./PriceTicker";

const BONSAI_URL = "https://odin.fun/token/26j2?ref=bonsai";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalEntries: number;
  totalEcosystems: number;
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
  backendLoading?: boolean;
  identity?: Identity | null;
  isLoggingIn?: boolean;
  isInitializing?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
  onListProject?: () => void;
  onViewProfile?: () => void;
  oisyConnected?: boolean;
}

export function Header({
  searchQuery,
  onSearchChange,
  totalEntries,
  totalEcosystems,
  mobileNavOpen,
  onToggleMobileNav,
  backendLoading = false,
  identity,
  isLoggingIn = false,
  isInitializing = false,
  onLogin,
  onLogout,
  onListProject,
  onViewProfile,
  oisyConnected = false,
}: HeaderProps) {
  const isSignedIn = !!identity;
  const principal = identity?.getPrincipal().toString();
  const shortPrincipal = principal
    ? `${principal.slice(0, 5)}\u2026${principal.slice(-3)}`
    : null;

  return (
    <header className="header-atmosphere border-b border-border sticky top-0 z-40 backdrop-blur-sm">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        {/* Top utility strip */}
        <div className="flex items-center justify-between py-2 border-b border-border/50 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] text-primary/70 uppercase tracking-widest">
              Web3 Directory
            </span>
            <span className="w-px h-3 bg-border" />
            <span className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest">
              {totalEcosystems}+ Chains \u00b7 {totalEntries}+ Projects
            </span>
            <span className="w-px h-3 bg-border hidden sm:block" />
            <button
              type="button"
              data-ocid="header.leaderboard.link"
              onClick={() => {
                window.location.hash = "#leaderboard";
              }}
              className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest hover:text-primary transition-colors"
            >
              <Trophy className="w-2.5 h-2.5" />
              <span>Leaderboard</span>
            </button>
            <span className="w-px h-3 bg-border hidden sm:block" />
            <button
              type="button"
              data-ocid="header.ambassador.link"
              onClick={() => {
                window.location.hash = "#ambassador";
              }}
              className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest hover:text-primary transition-colors"
            >
              <span>Ambassadors</span>
            </button>
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

          {/* Price ticker + BONSAI badge (desktop) */}
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <PriceTicker />
            <span className="w-px h-3 bg-border" />
            <a
              href={BONSAI_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-ocid="header.bonsai.link"
              className="flex items-center gap-1 px-2 py-0.5 rounded border border-amber-400/30 bg-amber-400/5 text-amber-400 text-[10px] font-mono uppercase tracking-wider hover:bg-amber-400/15 hover:border-amber-400/50 transition-all"
              style={{ boxShadow: "0 0 8px oklch(0.79 0.15 80 / 18%)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
              $BONSAI on Odin.Fun \u2192
            </a>
          </div>

          <div className="flex items-center gap-2">
            <OisyConnectButton onViewProfile={onViewProfile} />
            {(identity || oisyConnected) && onListProject && (
              <button
                type="button"
                data-ocid="header.list_project_button"
                onClick={onListProject}
                className="flex items-center gap-1 px-2.5 py-1 rounded border border-primary/40 bg-primary/10 text-primary text-[10px] font-mono uppercase hover:bg-primary/20 hover:border-primary/60 transition-all duration-150 shadow-[0_0_6px_oklch(0.60_0.235_27/15%)] hidden sm:flex"
                aria-label="List your project"
              >
                <Plus className="w-3 h-3" aria-hidden />
                <span>List Project</span>
              </button>
            )}
            {isInitializing ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded border border-border text-muted-foreground/40 text-[10px] font-mono">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                <span className="hidden sm:inline">Loading\u2026</span>
              </span>
            ) : isSignedIn ? (
              <div className="flex items-center gap-1.5">
                <div
                  data-ocid="header.user_indicator"
                  className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded border border-primary/25 bg-primary/8 text-[10px] font-mono text-primary/80"
                >
                  <User className="w-2.5 h-2.5 text-primary" aria-hidden />
                  <span title={principal ?? ""}>{shortPrincipal}</span>
                </div>
                <button
                  type="button"
                  data-ocid="header.signout_button"
                  onClick={onLogout}
                  title="Sign out"
                  className="flex items-center gap-1 px-2 py-1 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut className="w-3 h-3" aria-hidden />
                  <span className="text-[10px] font-mono uppercase hidden sm:inline">
                    Sign Out
                  </span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-ocid="header.signin_button"
                onClick={onLogin}
                disabled={isLoggingIn}
                title="Sign in with Internet Identity (Web3 authentication)"
                className={[
                  "flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono uppercase transition-all duration-150",
                  isLoggingIn
                    ? "border-border text-muted-foreground/50 cursor-wait"
                    : "border-primary/40 bg-primary/8 text-primary hover:bg-primary/15 hover:border-primary/70",
                ].join(" ")}
                aria-label="Sign in with Internet Identity"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <LogIn className="w-3 h-3" aria-hidden />
                )}
                <span className="sm:hidden">
                  {isLoggingIn ? "Signing In\u2026" : "Sign In"}
                </span>
                <span className="hidden sm:inline">
                  {isLoggingIn
                    ? "Signing In\u2026"
                    : "Sign In with Internet Identity"}
                </span>
              </button>
            )}
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
        </div>

        {/* Mobile ticker strip */}
        <div className="lg:hidden flex items-center justify-between py-1.5 border-b border-border/30 gap-2">
          <PriceTicker />
          <a
            href={BONSAI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-amber-400/30 bg-amber-400/5 text-amber-400 text-[9px] font-mono uppercase hover:bg-amber-400/15 transition-colors flex-shrink-0"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            $BONSAI
          </a>
        </div>

        {/* Brand + Search row */}
        <div className="flex items-center gap-5 py-4">
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
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background animate-pulse" />
          </div>
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
              RWA \u00b7 E-Commerce \u00b7 Web3 Ecosystems
            </p>
          </div>
          <div className="sm:hidden flex-shrink-0">
            <h1 className="font-display font-extrabold text-base leading-tight">
              <span className="text-primary">Bonsai</span>{" "}
              <span className="text-foreground">Registry</span>
            </h1>
          </div>
          <div className="flex-1 relative group">
            <div className="absolute inset-0 rounded-md bg-primary/5 blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
            <Input
              data-ocid="registry.search_input"
              type="search"
              placeholder="Search projects, chains, categories\u2026"
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
