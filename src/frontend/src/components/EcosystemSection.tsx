import type { EcosystemGroup, RegistryEntry } from "@/data/registryData";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { LinkCard } from "./LinkCard";

const TIER_LABELS: Record<number, string> = {
  1: "Foundation",
  2: "Protocol",
  3: "Emerging",
  4: "Developing",
  5: "Commerce",
};

const TIER_DOT: Record<number, string> = {
  1: "bg-yellow-400",
  2: "bg-blue-400",
  3: "bg-green-400",
  4: "bg-purple-400",
  5: "bg-amber-400",
};

interface EcosystemSectionProps {
  group: EcosystemGroup;
  filteredEntries: RegistryEntry[];
  sectionIndex: number;
  defaultOpen?: boolean;
}

export function EcosystemSection({
  group,
  filteredEntries,
  sectionIndex,
  defaultOpen = false,
}: EcosystemSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (filteredEntries.length === 0) return null;

  return (
    <section
      id={`section-${group.slug}`}
      data-ocid={`registry.section.item.${sectionIndex}`}
      className="border border-border rounded-lg overflow-hidden bg-card/50"
    >
      {/* ── Section trigger ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-4 hover:bg-secondary/60 transition-colors group"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Tier dot */}
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${TIER_DOT[group.tier] ?? TIER_DOT[4]}`}
          />

          {/* Token badge */}
          <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-sm flex-shrink-0 tracking-wider">
            {group.token}
          </span>

          {/* Name — display font, large */}
          <h2 className="font-display font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors truncate leading-none">
            {group.name}
          </h2>

          {/* Tier label — subtle, hidden on small */}
          <span className="hidden md:inline font-mono text-[10px] text-muted-foreground/50 uppercase tracking-widest flex-shrink-0">
            {TIER_LABELS[group.tier] ?? "Protocol"}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {filteredEntries.length}
            <span className="text-muted-foreground/50 ml-0.5">
              {filteredEntries.length === 1 ? " project" : " projects"}
            </span>
          </span>
          <div
            className={`w-6 h-6 rounded-sm border flex items-center justify-center transition-all duration-200 ${
              isOpen
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            />
          </div>
        </div>
      </button>

      {/* ── Left-bar open indicator ── */}
      {isOpen && (
        <div className="section-reveal">
          {/* Thin red top bar when open */}
          <div className="h-px bg-primary/30 mx-5" />
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {filteredEntries.map((entry, idx) => (
                <LinkCard key={entry.id} entry={entry} index={idx + 1} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
