# Bonsai Registry

## Current State

Full-stack Web3 registry with admin panel, community ratings, analytics, tipping, OISY wallet integration, and pay-to-list. Admin uses a password-based auth flow. Backend calls (bulk import, save profile, etc.) occasionally fail with IC0508 "canister is stopped" errors after deployments.

## Requested Changes (Diff)

### Add
- `useCanisterHealth` hook: polls `getTotalEntriesCount` (a cheap read query) every 10 seconds to determine if the canister is alive. Exposes `status: 'online' | 'starting' | 'offline'` and `retry()`.
- `CanisterHealthBadge` component: small status pill showing online/starting/offline state, used in the admin header.
- Health check banner in `AdminDashboard`: if status is `offline` or `starting`, show a dismissible info banner warning the user to wait before attempting write operations.
- Pre-flight health guard in `BulkImportModal`: before submitting, check health status and surface a user-friendly message if canister is not ready instead of letting the raw IC error propagate.

### Modify
- `AdminDashboard` header: add `CanisterHealthBadge` next to the stats pills.
- `BulkImportModal`: integrate health pre-flight check before bulk import submission.

### Remove
- Nothing removed.

## Implementation Plan

1. Create `src/frontend/src/hooks/useCanisterHealth.ts` — polls `getTotalEntriesCount` via `createActorWithConfig`, classifies response into `online/starting/offline`, exposes `status`, `isChecking`, and `retry`.
2. Create `src/frontend/src/components/admin/CanisterHealthBadge.tsx` — renders a colored dot + label based on status. Green = online, amber = starting, red = offline.
3. Update `AdminDashboard.tsx` — import and render `CanisterHealthBadge` in the header stats row; add a dismissible amber banner when status is not `online`.
4. Update `BulkImportModal.tsx` — call `useCanisterHealth` and block submission with a friendly message if `status !== 'online'`, with a retry button.
5. Validate and build.
