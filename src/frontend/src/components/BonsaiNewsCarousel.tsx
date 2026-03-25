import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Rss } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface NewsItem {
  title: string;
  link: string;
  published: string;
  summary: string;
  image: string | null;
}

function parseAtomXml(xml: string): NewsItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const entries = Array.from(doc.querySelectorAll("entry")).slice(0, 10);

  return entries.map((entry) => {
    const title =
      entry.querySelector("title")?.textContent?.trim() ?? "Untitled";
    const linkEl =
      entry.querySelector('link[rel="alternate"]') ??
      entry.querySelector("link");
    const link =
      linkEl?.getAttribute("href") ?? "https://t3kno-logic.xyz/blogs/news";
    const published =
      entry.querySelector("published")?.textContent?.trim() ??
      entry.querySelector("updated")?.textContent?.trim() ??
      "";

    const contentRaw =
      entry.querySelector("content")?.textContent ??
      entry.querySelector("summary")?.textContent ??
      "";
    const summary = contentRaw
      .replace(/<[^>]+>/g, "")
      .trim()
      .slice(0, 120);

    let image: string | null = null;
    // 1. Try namespaced media:thumbnail (Yahoo Media RSS extension)
    const mediaNs = entry.getElementsByTagNameNS(
      "http://search.yahoo.com/mrss/",
      "thumbnail",
    );
    if (mediaNs.length > 0) image = mediaNs[0].getAttribute("url");
    // 2. Fallback: scan all child elements by localName
    if (!image) {
      const allEls = Array.from(entry.getElementsByTagName("*"));
      const thumb = allEls.find((el) => el.localName === "thumbnail");
      if (thumb) image = thumb.getAttribute("url");
    }
    // 3. Check enclosure elements (common in RSS/Atom)
    if (!image) {
      const enclosure =
        entry.querySelector("enclosure") ??
        entry.getElementsByTagName("enclosure")[0];
      const encType = enclosure?.getAttribute("type") ?? "";
      if (enclosure && encType.startsWith("image/"))
        image = enclosure.getAttribute("url");
    }
    // 4. Fallback: first <img> in content HTML
    if (!image) {
      const contentHtml = entry.querySelector("content")?.textContent ?? "";
      const imgMatch = contentHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) image = imgMatch[1];
    }

    return { title, link, published, summary, image };
  });
}

async function fetchBonsaiNews(): Promise<NewsItem[]> {
  const feedUrl = "https://t3kno-logic.xyz/blogs/news.atom";

  // Proxy 1: corsproxy.io — returns raw text directly
  try {
    const res = await fetch(
      `https://corsproxy.io/?url=${encodeURIComponent(feedUrl)}`,
    );
    if (res.ok) {
      const xml = await res.text();
      const items = parseAtomXml(xml);
      if (items.length > 0) return items;
    }
  } catch {
    // fall through to next proxy
  }

  // Proxy 2: allorigins.win — returns JSON with `contents` field
  try {
    const res = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`,
    );
    if (res.ok) {
      const json = await res.json();
      const xml = json.contents as string;
      if (xml) {
        const items = parseAtomXml(xml);
        if (items.length > 0) return items;
      }
    }
  } catch {
    // fall through to next proxy
  }

  // Proxy 3: codetabs.com — returns raw text directly
  const res = await fetch(
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(feedUrl)}`,
  );
  if (!res.ok) throw new Error("All proxies failed");
  const xml = await res.text();
  const items = parseAtomXml(xml);
  if (items.length === 0) throw new Error("No entries found");
  return items;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function NewsCard({ item }: { item: NewsItem }) {
  const [imgSrc, setImgSrc] = useState<string | null>(item.image);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!item.image) {
      const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(item.link)}`;
      fetch(microlinkUrl)
        .then((r) => r.json())
        .then((data) => {
          const img = data?.data?.image?.url ?? data?.data?.logo?.url ?? null;
          setImgSrc(img);
        })
        .catch(() => {});
    }
  }, [item.image, item.link]);

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="news-card flex-shrink-0 w-[280px] rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 overflow-hidden cursor-pointer group"
    >
      <div className="h-[148px] bg-muted overflow-hidden relative">
        {imgSrc && !imgFailed ? (
          <img
            src={imgSrc}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/5">
            <Rss className="w-10 h-10 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
      </div>
      <div className="p-4 space-y-1.5">
        {item.published && (
          <p className="font-mono text-[10px] text-primary/60 uppercase tracking-widest">
            {formatDate(item.published)}
          </p>
        )}
        <h3 className="font-display font-bold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        {item.summary && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {item.summary}
          </p>
        )}
        <div className="flex items-center gap-1 pt-1 text-xs font-semibold text-primary">
          Read More
          <ExternalLink className="w-3 h-3" />
        </div>
      </div>
    </a>
  );
}

const SKELETON_KEYS = ["sk-a", "sk-b", "sk-c", "sk-d"];

export function BonsaiNewsCarousel() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBonsaiNews()
      .then((news) => {
        setItems(news);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  // Build duplicated list with stable keys for the infinite loop
  const duplicatedItems = [
    ...items.map((item) => ({ ...item, _key: `a-${item.link}` })),
    ...items.map((item) => ({ ...item, _key: `b-${item.link}` })),
  ];

  return (
    <div className="rounded-lg border border-primary/20 bg-card/50 px-5 py-4 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Rss className="w-4 h-4 text-primary" />
          <h2 className="font-display font-bold text-base text-foreground">
            Bonsai Ecosystem News
          </h2>
        </div>
        <a
          href="https://t3kno-logic.xyz/blogs/news"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          Visit Blog <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {loading && (
        <div className="flex gap-4 overflow-hidden">
          {SKELETON_KEYS.map((k) => (
            <div
              key={k}
              className="flex-shrink-0 w-[280px] rounded-xl border border-border overflow-hidden"
            >
              <Skeleton className="h-[148px] w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (error || items.length === 0) && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">
            {error ? "Couldn't load news feed." : "No articles found."}
          </p>
          <a
            href="https://t3kno-logic.xyz/blogs/news"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Visit Blog <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div
          className="relative overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
          }}
          onMouseEnter={(e) => {
            const track = e.currentTarget.querySelector(
              ".carousel-track",
            ) as HTMLElement | null;
            if (track) track.style.animationPlayState = "paused";
          }}
          onMouseLeave={(e) => {
            const track = e.currentTarget.querySelector(
              ".carousel-track",
            ) as HTMLElement | null;
            if (track) track.style.animationPlayState = "running";
          }}
        >
          <div
            ref={trackRef}
            className="carousel-track flex gap-4"
            style={{
              animation: "bonsaiScrollLeft 60s linear infinite",
              width: "max-content",
            }}
          >
            {duplicatedItems.map(({ _key, ...item }) => (
              <NewsCard key={_key} item={item} />
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes bonsaiScrollLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
