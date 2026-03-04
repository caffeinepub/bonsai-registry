import type { EcosystemGroup } from "@/data/registryData";

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
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    onCloseMobile();
  };

  const sidebarContent = (
    <nav className="flex flex-col h-full">
      {/* Stats */}
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

      {/* Quick Jump Label */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          Quick Jump
        </p>
      </div>

      {/* Nav links */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
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
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-64 flex-shrink-0 sticky top-[120px] self-start max-h-[calc(100vh-140px)] bg-card border border-border rounded-lg overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <dialog
          open
          className="lg:hidden fixed inset-0 z-50 flex m-0 p-0 w-full h-full max-w-full max-h-full bg-transparent"
          data-ocid="mobile.nav.panel"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm w-full h-full border-0 cursor-default"
            onClick={onCloseMobile}
            onKeyDown={(e) => e.key === "Escape" && onCloseMobile()}
            aria-label="Close navigation overlay"
          />
          {/* Panel */}
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
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{sidebarContent}</div>
          </div>
        </dialog>
      )}
    </>
  );
}
