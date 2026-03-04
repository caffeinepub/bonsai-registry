# Bonsai Registry

## Current State

No existing app. Source reference is a single-file HTML SPA from https://github.com/T3knoLogic/Bonsai-Registry with:
- 75 blockchain ecosystem sections organized into 4 tiers
- ~570 links total, covering ICP (87 links, deepest coverage), Hedera/HBAR (5 unique links, thin), Bitcoin, Ethereum, Solana, and ~70 others
- Collapsible `<details>/<summary>` sections per chain
- Client-side search, filter by category (gaming, defi, nft, wallet, exchange), and filter by chain
- Black/red theme, Tailwind CSS, Font Awesome icons
- No backend persistence — all data hardcoded in HTML
- Export/import JSON feature via localStorage
- Edit mode for runtime additions (localStorage only)
- No SEO metadata beyond a basic meta description tag
- Part of "Enchanted Bonsai Bazaar" / T3kNo-Logic ecosystem

## Requested Changes (Diff)

### Add

**Backend:**
- Motoko canister storing all registry entries with fields: id, name, description, url, ecosystem (chain slug), category tags, tier, logo URL, added timestamp
- Query endpoints: getAll, getByEcosystem, getByCategory, search
- Admin-only write endpoints: addEntry, updateEntry, removeEntry (authorization component)

**Frontend — ICP new entries (not already in source):**
- DFINITY Foundation: dfinity.org
- Internet Computer main portal: internetcomputer.org
- ICP Dashboard: dashboard.internetcomputer.org
- NNS dApp: nns.ic0.app
- Chain Fusion docs/info
- IC Lighthouse (governance analytics)
- ICLighthouse DEX
- Sonic Finance (already present)
- Orbis (cross-chain social)
- WaterNeuron (liquid staking ICP)
- ICRC-1 token standard docs
- Modclub (already present)
- Quill (offline signing CLI)
- OISY Wallet (mentioned in README)
- ICX (ICP analytics)
- Funded (already present)
- ICPCoins (price tracking)
- Bioniq (Bitcoin Ordinals on ICP / ckBTC)
- CycleOps (canister cycles management)
- Toniq Labs / Cronic NFTs
- DFX (DFINITY CLI)
- Motoko Playground (already present)
- Demergent Labs
- B3 Wallet (multichain)
- Bitfinity EVM
- Nuance (already present)
- Taggr (already present)

**Frontend — Hedera/HBAR expanded (new entries):**
- Hedera.com (official)
- HBAR Foundation
- Hedera Consensus Service (HCS)
- Hedera Token Service (HTS)
- Hedera Smart Contracts
- HeliSwap (DEX)
- Pangolin Exchange on Hedera
- HSUITE (DeFi suite)
- Hashgraph Association
- Blade Wallet (HBAR)
- Kabila (Hedera NFT marketplace)
- nft.storage / Hedera integration
- Hedera testnet portal
- LaLiga NFT on Hedera
- Hedera Governing Council
- Enterprise Hedera use cases (Boeing, IBM)
- Hashaxis Analytics
- GRAIL (Hedera NFT)
- Hedera Discord / community

**SEO Infrastructure:**
- `<html lang="en">` with complete Open Graph tags (og:title, og:description, og:image, og:url, og:type)
- Twitter Card meta tags
- JSON-LD structured data: WebSite schema with SearchAction, ItemList schema for the registry entries, Organization schema for Bonsai Registry
- Semantic HTML: proper h1/h2/h3 hierarchy, `<main>`, `<article>`, `<nav>`, `<header>`, `<footer>`
- `robots.txt` equivalent via meta robots tag: `index, follow`
- Canonical URL meta tag
- Sitemap hint in `<head>`
- `rel="noopener noreferrer"` on all external links
- Page title optimized: "The Bonsai Registry — Web3 Directory | ICP, Hedera, Ethereum & 70+ Blockchain Ecosystems"
- Meta description: comprehensive keyword-rich description covering Web3, ICP, Hedera, HBAR, NFT, DeFi
- Lang attribute on all content sections
- Alt text on all images

### Modify

- Upgrade the UI from the raw HTML SPA to a full React + TypeScript frontend backed by the Motoko canister
- Preserve all existing ~570 links and all 75 blockchain sections
- Add Hedera section: expand from 5 links to 20+ links
- Add ICP section: expand from 87 links to 100+ links with new entries
- Replace localStorage-only edit system with canister-backed persistence (admin auth)
- Navigation: sticky sidebar on desktop, hamburger on mobile — same as original
- Filter bar: keep existing categories + blockchains, add "Hedera" as a dedicated chain filter button
- Add footer with SEO-friendly text: mission statement, keywords, social links

### Remove

- Raw HTML file — replaced by React component architecture
- Inline `<script>` blocks — replaced by React/TypeScript logic
- localStorage-only edit persistence — replaced by canister

## Implementation Plan

1. Select `authorization` component for admin-protected write endpoints
2. Generate Motoko backend with:
   - `RegistryEntry` type (id, name, description, url, ecosystem, tags[], tier, logoUrl, addedAt)
   - Stable var storage (HashMap or array)
   - getAll, getByEcosystem, getByCategory, search queries
   - addEntry, updateEntry, removeEntry (admin-only)
   - Seed data population with all 75+ ecosystems and 600+ links
3. Build React frontend:
   - `registryData.ts` — full static dataset of all entries as TypeScript constant (all 75 ecosystems, expanded ICP, expanded Hedera, plus new ICP/Hedera entries)
   - `App.tsx` — layout, routing, SEO helmet tags
   - `Header.tsx` — logo, title, search bar
   - `Sidebar.tsx` — sticky quick-jump nav with all 75 blockchain sections
   - `FilterBar.tsx` — category + chain filter buttons
   - `EcosystemSection.tsx` — collapsible section per chain with link cards
   - `LinkCard.tsx` — individual project card with name, description, tags, external link
   - `Footer.tsx` — SEO-rich footer
   - Full JSON-LD injection into `<head>` via react-helmet or equivalent
   - All deterministic `data-ocid` markers on interactive elements
