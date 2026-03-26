# Bonsai Registry

## Current State
- Registry directory with LinkCard components that show a 24px favicon and lazy-loaded OG preview image
- EcosystemManager in admin saves rankings to localStorage only — not visible on other devices
- App.tsx reads ecosystem order from localStorage
- No live price ticker exists
- No $BONSAI token promotion or funneling

## Requested Changes (Diff)

### Add
- Backend functions: `saveEcosystemOrderWithSecret(secret, orderJson)` and `getEcosystemOrder()` to persist ecosystem order/visibility in the canister
- `PriceTicker` component showing live prices for $BONSAI (Odin.Fun), $ICP, $BTC, $USDC — displayed in the header utility strip
- $BONSAI token promotion widget/banner with invite link (https://odin.fun/token/26j2) appearing tastefully in header, footer, and sidebar
- Larger favicon fallback in LinkCard when no OG preview image is available

### Modify
- `EcosystemManager.tsx`: Replace localStorage save/load with canister API calls (`saveEcosystemOrderWithSecret` / `getEcosystemOrder`)
- `App.tsx`: Load ecosystem order from canister on mount instead of localStorage
- `LinkCard.tsx`: When no OG preview image loads, show a larger (48px) centered favicon as a fallback in the preview area
- `Header.tsx`: Add PriceTicker in the utility strip and a subtle $BONSAI call-to-action
- `Footer.tsx`: Add $BONSAI / Odin.Fun link in ecosystem partners
- `backend.d.ts` and backend bindings: Expose new ecosystem order endpoints

### Remove
- localStorage-only ecosystem order logic from EcosystemManager and App.tsx

## Implementation Plan
1. Add two canister functions in main.mo: `saveEcosystemOrderWithSecret` (stores JSON string) and `getEcosystemOrder` (public query returning the string)
2. Regenerate backend.d.ts bindings to expose new endpoints
3. Update EcosystemManager to call `saveEcosystemOrderWithSecret` on save/move and `getEcosystemOrder` on load, falling back to localStorage for migration
4. Update App.tsx to call `getEcosystemOrder` on mount and merge with static data
5. Create `PriceTicker.tsx` — fetches ICP+BTC from CoinGecko public API, BONSAI from Odin.Fun API, USDC hardcoded at $1. Auto-refreshes every 30s. Horizontal scrolling strip in header.
6. Add $BONSAI promotion: subtle banner/badge with Odin.Fun invite link in header utility strip, footer partner link, and a small persistent call-to-action in the sidebar
7. Improve LinkCard favicon fallback: when OG image fails/absent, render a larger favicon (64px) centered in the preview area with a subtle background
