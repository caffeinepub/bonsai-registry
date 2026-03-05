import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Newspaper,
} from "lucide-react";
import { useState } from "react";
import {
  type NewsArticle,
  type ScamAlert,
  icpNews,
  scamAlerts,
} from "../data/newsData";

// ── Tag chip ──────────────────────────────────────────────────────────────────

function TagChip({ tag }: { tag: string }) {
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide bg-muted text-muted-foreground/70 border border-border/60">
      {tag}
    </span>
  );
}

// ── Source badge ──────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const isOfficial =
    source.includes("DFINITY") || source.includes("internetcomputer");
  return (
    <span
      className={[
        "inline-block px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide",
        isOfficial
          ? "bg-primary/10 text-primary/80 border border-primary/20"
          : "bg-secondary text-muted-foreground/70 border border-border/60",
      ].join(" ")}
    >
      {source}
    </span>
  );
}

// ── Severity badge ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: ScamAlert["severity"] }) {
  const map: Record<ScamAlert["severity"], string> = {
    high: "bg-destructive/15 text-destructive border-destructive/30",
    medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    low: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={[
        "inline-block px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide border",
        map[severity],
      ].join(" ")}
    >
      {severity}
    </span>
  );
}

// ── Scam alert card ───────────────────────────────────────────────────────────

function ScamAlertCard({ alert, index }: { alert: ScamAlert; index: number }) {
  return (
    <div
      data-ocid={`news.scam_alert.${index}`}
      className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex flex-col gap-2"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <SeverityBadge severity={alert.severity} />
            <SourceBadge source={alert.source} />
            <span className="text-[9px] font-mono text-muted-foreground/50">
              {alert.publishedAt}
            </span>
          </div>
          <a
            href={alert.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-destructive/90 hover:text-destructive leading-snug transition-colors flex items-center gap-1 group"
          >
            {alert.title}
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />
          </a>
          <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed">
            {alert.description}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── News card ─────────────────────────────────────────────────────────────────

function NewsCard({ article, index }: { article: NewsArticle; index: number }) {
  return (
    <div
      data-ocid={`news.item.${index}`}
      className="rounded-md border border-border bg-card p-3 flex flex-col gap-2 hover:border-primary/30 hover:bg-primary/3 transition-colors group"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <SourceBadge source={article.source} />
        {article.publishedAt && (
          <span className="text-[9px] font-mono text-muted-foreground/50">
            {article.publishedAt}
          </span>
        )}
      </div>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-foreground hover:text-primary leading-snug transition-colors flex items-start gap-1 group/link"
      >
        <span className="flex-1">{article.title}</span>
        <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5 opacity-0 group-hover/link:opacity-60 transition-opacity" />
      </a>
      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {article.tags.map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main NewsSection component ────────────────────────────────────────────────

export function NewsSection() {
  const [open, setOpen] = useState(false);

  return (
    <section
      data-ocid="news.section"
      className="rounded-lg border border-primary/15 bg-card overflow-hidden"
    >
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-primary/5 transition-colors text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded border border-primary/20 bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Newspaper className="w-3.5 h-3.5 text-primary" aria-hidden />
          </div>
          <div>
            <span className="font-display font-bold text-sm text-foreground">
              ICP News &amp; Community Updates
            </span>
            <span className="ml-2 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wide">
              {icpNews.length} articles · {scamAlerts.length} alerts
            </span>
          </div>
          {scamAlerts.length > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-destructive/10 border border-destructive/25 text-[9px] font-mono uppercase text-destructive">
              <AlertTriangle className="w-2.5 h-2.5" aria-hidden />
              {scamAlerts.length} active alert
              {scamAlerts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wide hidden sm:inline">
            {open ? "Collapse" : "Expand"}
          </span>
          {open ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground/60" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground/60" />
          )}
        </div>
      </button>

      {/* Collapsible content */}
      {open && (
        <div className="border-t border-border/60 px-4 py-4 space-y-5">
          {/* Scam alerts */}
          {scamAlerts.length > 0 && (
            <div>
              <p className="font-mono text-[10px] text-destructive/70 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" aria-hidden />
                Security Alerts
              </p>
              <div className="space-y-2">
                {scamAlerts.map((alert, i) => (
                  <ScamAlertCard key={alert.id} alert={alert} index={i + 1} />
                ))}
              </div>
            </div>
          )}

          {/* News articles grid */}
          <div>
            <p className="font-mono text-[10px] text-primary/60 uppercase tracking-widest mb-2.5">
              Latest News &amp; Forum
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {icpNews.map((article, i) => (
                <NewsCard key={article.id} article={article} index={i + 1} />
              ))}
            </div>
          </div>

          {/* Footer link */}
          <div className="pt-1 border-t border-border/40 flex items-center justify-between">
            <a
              href="https://forum.dfinity.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary/80 hover:text-primary font-medium transition-colors group"
            >
              <Newspaper className="w-3.5 h-3.5" aria-hidden />
              View all on DFINITY Forum
              <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
            <a
              href="https://internetcomputer.org/blog"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              ICP Blog
              <ExternalLink className="w-3 h-3" aria-hidden />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
