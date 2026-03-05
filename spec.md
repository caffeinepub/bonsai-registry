# Bonsai Registry

## Current State

The app is a fully deployed Web3 registry with:
- 34 ecosystems, 600+ curated entries across Bitcoin, Ethereum, Solana, Hedera, ICP, and many more
- Admin panel at `#admin` with password login, bulk import/export, entry CRUD
- Community rating system (Internet Identity, 5-star, sort by Top Rated / Most Rated)
- Onboarding modal, anonymous analytics, tipping modal with real wallet addresses
- Static registry data in `src/frontend/src/data/registryData.ts`
- Backend Motoko canister with `bulkImportEntriesWithSecret`, `addEntryWithSecret`, `editEntryWithSecret`, `deleteEntryWithSecret`, `getEntries`, `rateEntry`, etc.

## Requested Changes (Diff)

The user's GitHub repo (https://github.com/T3kNoLogic/Bonsai-Registry) has been updated with:
- `bonsai-registry-export-2026-03-05.json` — updated multi-chain entries (cleaner data for existing chains)
- `bonsai-registry-extended.json` — deep ICP ecosystem data (135+ ICP entries from official ecosystem, awesome-internet-computer, DFINITY blog, NFT collections, grant recipients)
- `bonsai-registry-news.json` — ICP news feed: 46 news articles + 3 scam alerts
- `index.html` — reference design: black/red color theme, 75 ecosystems branding, improved collapsible navigation, news section

### Add
- **News Feed Section**: A dedicated "ICP News & Updates" section on the main registry page showing the 46 ICP news articles from `bonsai-registry-news.json`. Each article shows: title, source, date, tags. Scam alerts displayed separately with a warning indicator.
- **Expanded ICP entries**: Add the additional ICP entries from `bonsai-registry-extended.json` that are NOT already in the static registry data (specifically the dev tools, SDKs, Candid libs, token standards from the awesome-internet-computer source)

### Modify
- **Branding**: Update the registry header tagline to "75+ Blockchain Ecosystems" to match the GitHub repo's updated scope
- **ICP section**: Ensure ICP entries include the dev tooling and SDK categories that are prominent in the extended data
- **Sidebar/filter**: Update ecosystem count to reflect 75+ ecosystems label

### Remove
- Nothing to remove

## Implementation Plan

1. Add `newsData.ts` to `src/frontend/src/data/` with the 46 news items and 3 scam alerts from `bonsai-registry-news.json` (hardcoded, loaded from static data)
2. Create `NewsSection.tsx` component that renders the news feed: collapsible section, article cards with title/source/date/tags, separate scam alert cards with red warning style
3. Add the NewsSection to `App.tsx` — show it below the registry sections when no search/filter is active
4. Update `registryData.ts` ICP entries to add ~20 additional high-value ICP entries from the extended data that aren't already present (focus on: dev tooling, Candid libraries, SNS/governance, cross-chain bridges) — keep the list curated, not exhaustive
5. Update header copy from "34+ ecosystems" to "75+ ecosystems" branding
6. Validate and deploy
