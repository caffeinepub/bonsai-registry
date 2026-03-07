// Bonsai Registry Monetization Config
// Schema: 1.0
// Featured ($200-500/mo), Verified ($50-100/mo), Sponsored sections ($300-1K/mo)

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
