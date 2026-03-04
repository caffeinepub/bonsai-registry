# Bonsai Registry — Admin Management Panel

## Current State

- The public registry is fully built: 600+ entries across 34 ecosystems, stored as **static data** in `registryData.ts`.
- The backend (`main.mo`) already has admin-only CRUD: `addRegistryEntry`, `updateRegistryEntry`, `removeRegistryEntry`, `bulkImportEntries`, and authorization via `AccessControl`.
- Authentication hooks (`useInternetIdentity`, `useActor`) are in place.
- The frontend reads purely from static data and does NOT call the backend for registry data yet.
- No admin UI exists.

## Requested Changes (Diff)

### Add

- **Admin Panel (`/admin` route)** — protected route, only accessible after Internet Identity login and confirmed admin role.
  - Login gate: show II login button if not authenticated; show "Not authorized" if logged in but not admin.
  - Dashboard overview: total entries, total ecosystems, a quick-stats bar.
  - **Ecosystem Manager**: list all ecosystems (from static data + any backend-added ones), ability to reorder, rename, add new ecosystem group with slug/name/token/tier fields.
  - **Entry Manager**: full data table of all entries with search/filter by ecosystem & category, sortable columns (name, ecosystem, tier, date).
  - **Add Entry form**: drawer/modal with all fields — name, description, URL, ecosystem (dropdown populated from existing groups), categories (multi-select), tier (1–5), logoUrl (optional).
  - **Edit Entry**: inline edit or drawer pre-filled with entry data.
  - **Delete Entry**: confirmation dialog before removal.
  - **Bulk Import**: textarea accepting JSON array of entries, validate and import all at once.
  - **Bulk Export**: download current static + backend entries as JSON file.
  - Optimistic UI: immediately reflect adds/edits/deletes in the table without full reload; refetch in background.

- **Admin nav trigger**: a small discrete "Admin" link in the Footer (not prominent in public header — keep public UI clean).

- **Backend data bridge**: the public registry view should merge static `registryData.ts` entries with any entries stored in the backend (fetched on load), de-duplicating by URL. This means the public view always reflects admin-added entries too.

### Modify

- **App.tsx**: add routing (React Router or simple hash-based view state) to support `/admin` alongside the main registry view.
- **Footer.tsx**: add a discrete "Admin" link at the bottom.
- **Header.tsx**: optionally show a small admin indicator badge when admin is logged in.
- **registryData.ts**: no structural changes; it remains the seed/static dataset.

### Remove

- Nothing removed from the public view.

## Implementation Plan

1. Add React Router to the frontend for `/` (public registry) and `/admin` (admin panel).
2. Create `AdminPage.tsx` — the top-level admin route with auth gate.
3. Create `useRegistryAdmin` hook — wraps backend CRUD calls with React Query mutations.
4. Create `useIsAdmin` hook — calls `isCallerAdmin()` and caches the result.
5. Create `EntryTable.tsx` — sortable, filterable data table for all registry entries.
6. Create `EntryFormDrawer.tsx` — add/edit form in a Sheet/Drawer with all fields.
7. Create `DeleteEntryDialog.tsx` — AlertDialog confirmation for deletions.
8. Create `BulkImportModal.tsx` — JSON paste area with validation.
9. Create `EcosystemManager.tsx` — list/add/reorder ecosystem groups (stored locally + backend metadata).
10. Update `App.tsx` to include router and merge backend entries into the public view.
11. Update `Footer.tsx` to include the Admin link.
12. Apply all deterministic `data-ocid` markers on interactive surfaces.
