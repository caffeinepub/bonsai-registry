# Bonsai Registry

## Current State
- Full registry app with 34+ ecosystems, 600+ entries, rating system
- Admin panel with password-based auth (`#WakeUp4`)
- Backend: Motoko with `authorization` component, registry entries, ratings, user profiles
- Frontend: React + Tailwind, ecosystem sections, filter bar, sidebar, header, footer

## Requested Changes (Diff)

### Add
1. **Onboarding flow** — First-visit modal/overlay that welcomes new users, collects optional anonymous preferences (favorite ecosystems, interests), and explains the registry. Stored in localStorage so it only shows once.
2. **Anonymous Analytics / CRM** — Backend stores anonymized usage events: page views (no PII), ecosystem clicks, link clicks, search queries (hashed/anonymized). No personal data stored on-chain. Admin analytics dashboard tab showing top searched terms, most-clicked ecosystems, popular entries, daily active sessions.
3. **Tipping feature** — "Support Bonsai" button/section in the footer and a floating tip button. Opens a modal showing accepted tokens with their wallet addresses for the user to send tips. Tokens: ICP (ICP ledger address), BTC (Bitcoin), ETH (Ethereum), HBAR (Hedera), SOL (Solana). Admin can configure tokens and wallet addresses from the admin panel.

### Modify
- Footer: add "Support the Project" tip button linking to tip modal
- Admin panel: add Analytics tab and Tip Configuration tab
- Header: optionally nudge first-time users to onboarding

### Remove
- Nothing removed

## Implementation Plan

### Backend
1. Add `AnalyticsEvent` type: `{ eventType: Text; payload: Text; timestamp: Time }` — no principal, no PII
2. Add `TipConfig` type: `{ token: Text; symbol: Text; address: Text; logoUrl: ?Text; enabled: Bool }`
3. Add `recordEvent(eventType: Text, payload: Text)` — public, anonymous-safe, stores to a capped ring buffer (max 10,000 events)
4. Add `getAnalyticsSummary(secret: Text)` — admin-only via secret, returns aggregated counts
5. Add `getTipConfigs()` — public query, returns enabled tip addresses
6. Add `setTipConfigsWithSecret(secret: Text, configs: [TipConfig])` — admin-only, saves tip config
7. Seed default tip configs with placeholder addresses

### Frontend
1. **OnboardingModal** component — shows on first visit (localStorage `bonsai_onboarded` flag), step-by-step welcome, ecosystem preference picker, closes and saves preference to localStorage
2. **TipModal** component — displays configured tokens + addresses with copy-to-clipboard and QR display; triggered from footer button and floating action button
3. **Analytics hooks** — `useRecordEvent` hook that fires `recordEvent` for ecosystem views, link clicks, searches (debounced, no PII)
4. **Admin Analytics tab** — chart/stats view: top events by type, most clicked entries, search frequency (admin only via secret)
5. **Admin Tip Config tab** — form to add/edit/remove tip token entries (token name, symbol, wallet address)
6. Add floating "Tip" button (bottom-right corner, subtle) linking to tip modal
7. Wire onboarding modal into App.tsx on mount
