import type { RegistryEntry } from "@/data/registryData";
import { useActor } from "@/hooks/useActor";
import { ExternalLink, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

interface CommunitySpotlightProps {
  allEntries: RegistryEntry[];
}

export function CommunitySpotlight({ allEntries }: CommunitySpotlightProps) {
  const { actor, isFetching } = useActor();
  const [spotlightEntry, setSpotlightEntry] = useState<RegistryEntry | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor || isFetching) return;
    (async () => {
      try {
        const entryId: bigint | null = await (
          actor as any
        ).getCommunitySpotlight();
        if (!entryId) {
          setLoading(false);
          return;
        }
        const targetId = `backend-${entryId.toString()}`;
        const found = allEntries.find((e) => e.id === targetId);
        setSpotlightEntry(found ?? null);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [actor, isFetching, allEntries]);

  if (loading || !spotlightEntry) return null;

  return (
    <div
      data-ocid="spotlight.card"
      className="relative overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-5 py-4 mb-2"
    >
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-[10px] text-emerald-400/80 uppercase tracking-widest">
            Community Spotlight
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground/50 italic">
            Earned by community votes, not payment
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-lg text-emerald-300 truncate">
              {spotlightEntry.name}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
              {spotlightEntry.description}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {spotlightEntry.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm border border-emerald-500/30 text-emerald-400/70 bg-emerald-500/10"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <a
            href={spotlightEntry.url}
            target="_blank"
            rel="noopener noreferrer"
            data-ocid="spotlight.link"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Visit
          </a>
        </div>
      </div>
    </div>
  );
}
