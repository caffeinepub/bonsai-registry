import { useEffect, useRef, useState } from "react";

const LS_PREFIX = "lp_cache_v1:";
const LS_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory cache: url -> imageUrl | null
const cache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();

// Seed in-memory cache from localStorage on first import
(function seedFromStorage() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(LS_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const { img, ts } = JSON.parse(raw) as { img: string | null; ts: number };
      if (Date.now() - ts < LS_MAX_AGE) {
        const url = key.slice(LS_PREFIX.length);
        cache.set(url, img);
      } else {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // localStorage may be unavailable (private browsing, etc.)
  }
})();

function persistToStorage(url: string, img: string | null) {
  try {
    localStorage.setItem(
      LS_PREFIX + url,
      JSON.stringify({ img, ts: Date.now() }),
    );
  } catch {
    // quota exceeded or unavailable — silently ignore
  }
}

async function fetchPreviewImage(url: string): Promise<string | null> {
  if (cache.has(url)) return cache.get(url) ?? null;
  if (inFlight.has(url)) return inFlight.get(url)!;

  const promise = (async () => {
    try {
      const res = await fetch(
        `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=false&meta=false`,
        { signal: AbortSignal.timeout(6000) },
      );
      if (!res.ok) {
        cache.set(url, null);
        persistToStorage(url, null);
        return null;
      }
      const data = await res.json();
      const imgUrl: string | null =
        data?.data?.image?.url ?? data?.data?.screenshot?.url ?? null;
      cache.set(url, imgUrl);
      persistToStorage(url, imgUrl);
      return imgUrl;
    } catch {
      cache.set(url, null);
      // Don't persist failures so we retry on next visit
      return null;
    } finally {
      inFlight.delete(url);
    }
  })();

  inFlight.set(url, promise);
  return promise;
}

export function useLinkPreview(url: string) {
  const [imageUrl, setImageUrl] = useState<string | null>(
    cache.has(url) ? (cache.get(url) ?? null) : null,
  );
  const [loading, setLoading] = useState(!cache.has(url));
  const ref = useRef<HTMLDivElement | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (cache.has(url)) {
      setImageUrl(cache.get(url) ?? null);
      setLoading(false);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !fetchedRef.current) {
          fetchedRef.current = true;
          observer.disconnect();
          setLoading(true);
          fetchPreviewImage(url).then((img) => {
            setImageUrl(img);
            setLoading(false);
          });
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [url]);

  return { imageUrl, loading, ref };
}
