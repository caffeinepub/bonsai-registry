# Bonsai Registry

## Current State
Full Web3 registry with admin panel, community ratings, OISY wallet integration, user profiles, leaderboard, analytics, tipping, and bulk import/export. The admin Treasury card shows the ICP balance held by the registry canister but has no way to send that ICP out — it only links to the NNS Dashboard.

## Requested Changes (Diff)

### Add
- Backend: `withdrawIcpWithSecret(secret, toAddress, amountE8s)` — verifies admin secret, calls the ICP Ledger canister (ICRC-1 `icrc1_transfer`) to transfer the specified amount from the canister's own account to the given principal address, returns the transaction block index or traps with a descriptive error.
- Backend: `getCanisterIcpBalanceWithSecret(secret)` — verifies admin secret, queries the ICP Ledger for the canister's own ICRC-1 balance and returns it as `Nat`.
- Frontend (AdminDashboard `TreasuryCard`): "Withdraw ICP" section with a principal/address input field, an amount input (ICP), a "Send" button protected by the admin password, success/error feedback, and balance auto-refresh after a successful withdrawal.

### Modify
- `TreasuryCard` component: replace the static NNS Dashboard paragraph with the new withdraw form UI. Keep the balance display and canister ID copy row.

### Remove
- Nothing removed.

## Implementation Plan
1. Regenerate backend with `withdrawIcpWithSecret` and `getCanisterIcpBalanceWithSecret` added alongside all existing functions.
2. Update `TreasuryCard` in `AdminDashboard.tsx` to add the withdraw form: principal input, ICP amount input, Send button, loading/error/success states.
3. Wire the Send button to call `actor.withdrawIcpWithSecret(secret, principal, amountE8s)` via a mutation; on success show a toast and refresh the balance query.
4. Validate and deploy.
