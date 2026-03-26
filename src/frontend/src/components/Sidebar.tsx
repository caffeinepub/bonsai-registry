import type { EcosystemGroup } from "@/data/registryData";

const BONSAI_URL = "https://odin.fun/token/26j2?ref=bonsai";

interface SidebarProps {
  groups: EcosystemGroup[];
  totalEntries: number;
  totalEcosystems: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  groups,
  totalEntries,
  totalEcosystems,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handleNavClick = (slug: string) => {
    const el = document.getElementById(`section-${slug}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    onCloseMobile();
  };

  const sidebarContent = (
    <nav className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-lg font-bold font-display text-primary">
              {totalEcosystems}+
            </p>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
              Chains
            </p>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold font-display text-primary">
              {totalEntries}+
            </p>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
              Projects
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-1">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          Quick Jump
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {groups.map((group) => (
          <button
            key={group.slug}
            type="button"
            data-ocid="sidebar.link"
            onClick={() => handleNavClick(group.slug)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-left hover:bg-secondary group transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-mono text-primary/70 font-bold flex-shrink-0 w-10 text-right">
                {group.token}
              </span>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate">
                {group.name}
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/60 flex-shrink-0 ml-1">
              {group.entries.length}
            </span>
          </button>
        ))}
      </div>

      {/* $BONSAI promo card */}
      <div className="mx-2 mb-3 mt-2 rounded-lg border border-amber-400/25 bg-amber-400/5 p-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-amber-400 text-sm">\uD83C\uDF3F</span>
          <span className="font-mono font-bold text-xs text-amber-400">
            $BONSAI
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
          The official Bonsai Registry ecosystem token on Odin.Fun.
        </p>
        <a
          href={BONSAI_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-ocid="sidebar.bonsai.button"
          className="flex items-center justify-center gap-1 w-full px-2 py-1.5 rounded border border-amber-400/30 bg-amber-400/10 text-amber-400 text-[10px] font-mono uppercase tracking-wider hover:bg-amber-400/20 hover:border-amber-400/50 transition-all"
        >
          Get $BONSAI \u2192
        </a>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="hidden lg:flex flex-col w-56 xl:w-64 flex-shrink-0 sticky top-[120px] self-start max-h-[calc(100vh-140px)] bg-card border border-border rounded-lg overflow-hidden">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <dialog
          open
          className="lg:hidden fixed inset-0 z-50 flex m-0 p-0 w-full h-full max-w-full max-h-full bg-transparent"
          data-ocid="mobile.nav.panel"
          aria-label="Navigation menu"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm w-full h-full border-0 cursor-default"
            onClick={onCloseMobile}
            onKeyDown={(e) => e.key === "Escape" && onCloseMobile()}
            aria-label="Close navigation overlay"
          />
          <div className="relative ml-auto w-72 bg-card border-l border-border h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="font-display font-bold text-sm text-foreground">
                <span className="text-primary">Navigate</span> Ecosystems
              </p>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Close navigation"
              >
                \u2715
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{sidebarContent}</div>
          </div>
        </dialog>
      )}
    </>
  );
}
