# Bonsai Registry

## Current State
Full Web3 registry with admin panel, community ratings, user profiles, OISY wallet integration, anonymous analytics, tipping, and canister health check. Admin login uses a shared secret (`#WakeUp4`). Listing fees (ICP) are transferred to the backend canister on pay-to-list, but there is no mechanism to withdraw the accumulated balance.

## Requested Changes (Diff)

### Add
- Backend: `getIcpBalanceWithSecret(secret)` -- queries the ICP Ledger for the canister's own ICRC-1 balance and returns it in e8s
- Backend: `withdrawIcpWithSecret(secret, toAddress, amountE8s)` -- transfers ICP from the canister to a target ICRC-1 account (principal text), minus the 10_000 e8s ledger fee
- Frontend: "Treasury" card in the admin panel showing the current ICP balance (auto-fetched on load, refresh button) and a Withdraw form with a destination address field + amount field (defaults to full balance minus fee) with a submit button that calls `withdrawIcpWithSecret`

### Modify
- Admin panel layout: add the new Treasury card alongside the existing Listing Price card in the admin settings area

### Remove
- Nothing
