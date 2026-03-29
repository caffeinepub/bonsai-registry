# Bonsai Registry

## Current State
- Full registry with 2,000+ entries across 35+ ecosystems
- Pay-to-list submission flow via OISY wallet
- II-authenticated user profiles with badges/achievements
- Admin panel with pending submission approval queue (pay-to-list only)
- Star ratings (1-5) on all entries, sortable leaderboard
- Ambassador/creator commerce layer
- Featured banner ads (paid)

## Requested Changes (Diff)

### Add
- **Community Submission flow**: Any user (II-authenticated) can submit a project for free via a new modal. Submissions enter a pending queue in admin for approval. Upon admin approval, the submitter's profile gets a "Contributor" badge automatically.
- **Upvotes**: II-authenticated users can upvote any registry entry (one vote per entry per user). Upvote count stored per entry in the canister.
- **"Rising" tab**: New tab on the registry page filtering/sorting by upvote count, showing community-curated gems.
- **Comments**: II-authenticated users can post threaded comments on any project card. Comments support one level of replies. Users can flag comments for moderation (DAO-style). Admin can delete flagged comments.
- **Community Spotlight**: A weekly highlighted featured slot shown at the top of the registry (below paid banners). Rotates based on upvote count -- the top-voted entry each week earns the spotlight. No payment required.

### Modify
- Backend: Add upvote storage, comments storage, community submission endpoint (free, no paymentMemo required beyond empty string)
- Admin panel: Add "Community Submissions" tab, "Flagged Comments" tab
- Registry page: Add "Rising" tab alongside existing ecosystem/category tabs
- LinkCard: Add upvote button + count, comment count indicator, expandable comment thread
- UserProfilePage: Award "Contributor" badge when submission is approved

### Remove
- Nothing removed

## Implementation Plan
1. Generate Motoko backend with: `submitCommunityEntry`, `upvoteEntry`, `getEntryUpvotes`, `getTopUpvotedEntries`, `addComment`, `replyToComment`, `getComments`, `flagComment`, `deleteCommentWithSecret`, `getCommunitySpotlight` endpoints
2. Update `backend.d.ts` with new types and function signatures
3. Build `CommunitySubmitModal.tsx` component for free project submissions
4. Build `CommentThread.tsx` component for threaded comments on project cards
5. Add upvote button to `LinkCard.tsx` with optimistic UI
6. Add "Rising" tab to registry filter/tab bar with upvote-sorted entries
7. Add Community Spotlight banner component above the registry section
8. Update `AdminDashboard.tsx` with Community Submissions tab and Flagged Comments tab
9. Grant "Contributor" badge on submission approval in admin flow
