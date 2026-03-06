# Bonsai Registry

## Current State

The app is a curated Web3 registry with:
- 600+ entries across 34+ ecosystems (static + backend)
- Admin panel (password-gated with `#WakeUp4`) with full CRUD, bulk import/export
- Community 5-star rating system via Internet Identity
- Anonymous analytics in localStorage
- Onboarding modal (first visit)
- Tipping modal with multi-chain wallet addresses (ICP, BTC, ETH, HBAR, SOL)
- Backend: Motoko canister with `BonsaiRegistryEntry`, `UserProfile` (name only), ratings map, admin-secret CRUD endpoints, II-authenticated rating

## Requested Changes (Diff)

### Add

1. **OISY Wallet Connect** -- Integration using ICP signer standards (ICRC-25, ICRC-27, ICRC-29). Users connect OISY wallet via postMessage relay (ICRC-29 window transport). The connection shares the user's principal/account (ICRC-31) and subaccounts (ICRC-27). No browser extension needed -- OISY is web-based.

2. **Pay-to-List flow** -- Users pay ICP (via ICRC-1 transfer approved through OISY signer flow, ICRC-49 canister call) to submit their project to the registry. Admin sets the listing price (in ICP e8s). Payment is verified on-chain before entry is accepted. Flow: connect OISY -> fill submission form -> OISY approves transfer -> backend confirms payment -> entry queued for admin review OR auto-approved (configurable).

3. **Admin price control** -- Admin can set and update the listing fee (ICP e8s) from the admin panel. Stored in backend. Query endpoint for frontend to read current price.

4. **User Profile page** -- Route `#profile` (or `/profile/:principal`). Shows:
   - Display name (editable)
   - Avatar (configurable, with fallback to identicon based on principal)
   - Bio/description (editable)
   - Connected OISY wallet principal
   - NFT showcase: fetches ICRC-7 `icrc7_tokens_of` from user-specified or known NFT collection canisters (Bioniq, Entrepot ICRC-7 compatible collections). Displays token images from metadata. User picks which NFTs to pin/display on their profile (stored in backend profile).
   - User's submitted projects (registry entries they paid to list)

5. **Extended UserProfile in backend** -- New profile fields: `displayName`, `bio`, `avatarUrl`, `walletPrincipal`, `pinnedNftIds` (array of `{collectionCanisterId, tokenId}`), `submittedEntryIds`.

6. **Paid submission queue** -- Backend stores pending submissions that paid the fee but await admin review. Admin panel gets a new "Submissions" tab to approve/reject/edit pending entries.

7. **NFT display support (ICRC-7)** -- Frontend queries ICRC-7-compatible NFT collection canisters directly (read-only, from browser) to fetch `icrc7_token_metadata` and display token images. Supports standard ICRC-7 `icrc7_tokens_of` + `icrc7_token_metadata` queries. Users can input any ICRC-7 canister ID to add NFT collections.

### Modify

- `UserProfile` type in backend: extend from `{name: Text}` to full profile record with `displayName`, `bio`, `avatarUrl`, `walletPrincipal: ?Principal`, `pinnedNfts: [{collectionId: Text; tokenId: Nat}]`, `submittedEntries: [Nat]`
- `App.tsx`: add `#profile` hash route; pass OISY wallet state down to Header and relevant components
- `Header.tsx`: add OISY wallet connect button alongside existing II sign-in; show connected wallet address when connected
- `AdminPage` / `AdminDashboard`: add "Listing Price" settings card and "Submissions" tab for reviewing paid submissions
- `getCallerUserProfile` and `saveCallerUserProfile`: update to handle extended profile type

### Remove

- Nothing removed; backward-compatible changes only

## Implementation Plan

### Backend
1. Extend `UserProfile` type: add `displayName`, `bio`, `avatarUrl`, `walletPrincipal`, `pinnedNfts`, `submittedEntries` fields (all optional with defaults)
2. Add `listingFeeE8s: Nat` stable var (default 100_000_000 = 1 ICP)
3. Add `getListingFee()` query
4. Add `setListingFeeWithSecret(secret, fee)` update (admin only)
5. Add `PendingSubmission` type: entry data + submitter principal + payment tx memo + timestamp + status
6. Add `pendingSubmissions` map
7. Add `submitProjectListing(entry, paymentMemo)` -- records a pending submission; frontend verifies payment was made off-chain via OISY and passes the memo
8. Add `approvePendingSubmission(secret, submissionId)` and `rejectPendingSubmission(secret, submissionId)` -- admin actions
9. Add `getPendingSubmissions(secret)` query for admin
10. Update `saveCallerUserProfile` to accept extended profile
11. Add `getPublicUserProfile(principal)` for public profile pages

### Frontend
1. `useOisyWallet` hook: implements ICRC-29 window transport to connect to OISY (https://oisy.com), requests `icrc25_permissions` for `icrc27_accounts` and `icrc49_call_canister`, stores connected principal in state
2. `OisyConnectButton` component: "Connect OISY" button, shows connected wallet address when connected, disconnect option
3. `PayToListModal` component: form for project submission (name, URL, description, ecosystem, categories), shows current listing fee, triggers OISY `icrc49_call_canister` to ICP ledger for transfer, then calls `submitProjectListing` on backend with memo
4. `UserProfilePage` component (route `#profile`): displays and edits user profile, shows connected OISY wallet, renders pinned NFT gallery
5. `useIcrc7Nfts` hook: given a canister ID and principal, calls `icrc7_tokens_of` then `icrc7_token_metadata` to fetch NFT data; extracts image URL from metadata Value type
6. `NftShowcase` component: grid of NFT cards with token image, name, collection; "Pin to profile" toggle
7. Admin "Listing Price" panel: input + save button calling `setListingFeeWithSecret`
8. Admin "Submissions" tab: table of pending submissions with approve/reject actions
