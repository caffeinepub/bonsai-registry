// Bonsai Registry Monetization Config
// Schema: 2.0

export interface FeaturedEntry {
  url: string;
  name: string;
  description: string;
}

export const featuredEntries: FeaturedEntry[] = [
  {
    url: "https://t3kno-logic.xyz/",
    name: "T3kNo-Logic Bazaar",
    description:
      "Enchanted Bonsai Bazaar — merch, RWA airdrops, Bonsai Collective",
  },
];

export const verifiedUrls: string[] = [
  "https://t3kno-logic.xyz/",
  "https://bonsai-radio-247-7lk.caffeine.xyz/",
  "https://thenftmatrix.gumroad.com/",
];

export const sponsoredSections: Record<string, string[]> = {
  "DeFi Spotlight": [],
  "RWA Leaders": ["https://t3kno-logic.xyz/"],
  "Creator Tools": [],
};

export function isFeatured(url: string): boolean {
  return featuredEntries.some(
    (e) => e.url === url || url.startsWith(e.url.replace(/\/$/, "")),
  );
}

export function isVerified(url: string): boolean {
  return verifiedUrls.some(
    (v) =>
      v === url ||
      url.startsWith(v.replace(/\/$/, "")) ||
      v.startsWith(url.replace(/\/$/, "")),
  );
}

export function addUtm(url: string, medium = "featured"): string {
  if (!url || url === "#") return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}utm_source=bonsai-registry&utm_medium=${medium}`;
}

// ── Banner Ads ─────────────────────────────────────────────────────────────

export type BannerMediaType = "mp4" | "gif" | "png" | "jpeg" | "jpg" | "text";
export type BannerStatus = "pending" | "active" | "rejected";

export interface BannerAd {
  id: string;
  projectName: string;
  url: string;
  description: string;
  mediaUrl: string;
  mediaType: BannerMediaType;
  startDate: number;
  endDate: number;
  durationDays: number;
  priceIcp: number;
  paymentMemo: string;
  submitterNote: string;
  status: BannerStatus;
  createdAt: number;
}

const BANNER_ADS_KEY = "bonsai_banner_ads";
const BANNER_PRICE_KEY = "bonsai_banner_price_per_day";
const DEFAULT_PRICE_PER_DAY = 0.5;

export function loadBannerAds(): BannerAd[] {
  try {
    const raw = localStorage.getItem(BANNER_ADS_KEY);
    return raw ? (JSON.parse(raw) as BannerAd[]) : [];
  } catch {
    return [];
  }
}

export function saveBannerAds(ads: BannerAd[]): void {
  localStorage.setItem(BANNER_ADS_KEY, JSON.stringify(ads));
}

export function getActiveBannerAds(): BannerAd[] {
  const now = Date.now();
  return loadBannerAds().filter(
    (ad) => ad.status === "active" && ad.startDate <= now && ad.endDate >= now,
  );
}

export function addBannerAdSubmission(
  submission: Omit<
    BannerAd,
    "id" | "createdAt" | "status" | "startDate" | "endDate"
  >,
): BannerAd {
  const ads = loadBannerAds();
  const newAd: BannerAd = {
    ...submission,
    id: `banner_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    status: "pending",
    startDate: 0,
    endDate: 0,
  };
  ads.push(newAd);
  saveBannerAds(ads);
  return newAd;
}

export function updateBannerAdStatus(
  id: string,
  status: BannerStatus,
  extra?: Partial<BannerAd>,
): void {
  const ads = loadBannerAds();
  const idx = ads.findIndex((a) => a.id === id);
  if (idx !== -1) {
    ads[idx] = { ...ads[idx], status, ...extra };
    saveBannerAds(ads);
  }
}

export function deleteBannerAd(id: string): void {
  saveBannerAds(loadBannerAds().filter((a) => a.id !== id));
}

export function getBannerPricePerDay(): number {
  const stored = localStorage.getItem(BANNER_PRICE_KEY);
  return stored
    ? Number.parseFloat(stored) || DEFAULT_PRICE_PER_DAY
    : DEFAULT_PRICE_PER_DAY;
}

export function setBannerPricePerDay(price: number): void {
  localStorage.setItem(BANNER_PRICE_KEY, price.toString());
}

export function detectMediaType(url: string): BannerMediaType {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".mp4") || lower.includes("/mp4")) return "mp4";
  if (lower.endsWith(".gif")) return "gif";
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpeg";
  return "text";
}
