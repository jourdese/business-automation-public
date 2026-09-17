# The Wild Tree v1 — branch-only website implementation

Branch: `restaurant/the-wild-tree-v1`.
Starting user asset commit: `5c88c9920153b97e9efe81cf0e2891a0741fc7c5`.

## Same architecture, different visual design

The implementation follows the Rib Crib business-site separation: page components,
local CSS module, restaurant data package, asset mapping and shared restaurant
helpers. It does not copy the Rib Crib page sequence, barbecue imagery or fonts.

The new page uses the supplied hero interior, restaurant detail, shared table,
cocktail lineup, exact supplied light/dark logos and Taste with Tradition artwork.
Its sequence is architectural hero, early table-enquiry controls, editorial
atmosphere gallery, combined menu/meal-planner/concierge workspace, then visit info.

All 38 supplied assets are moved without changing their bytes or filenames into
branding (11), atmosphere (3), food (17), and source (7). A manifest maps unchanged
menu provenance filenames to the new folders. No image is invented or substituted
for a mock menu addition. Group menu artwork is shown intact in detail dialogs.

## Working in the local preview

From the repository root:

```sh
git switch restaurant/the-wild-tree-v1
cd frontend
npm ci
npm run dev
```

Use `/preview/the-wild-tree` on the local address printed by the dev server.
It is a development-only, noindex page, not a second production restaurant route.
The public `[vertical]/[business]` route still resolves against Supabase and 404s
unknown/unpublished businesses. The custom renderer allowlist now includes Wild
Tree, ready for a separately approved database route when the restaurant is ready.

## Available interactions

- Search by name and alias; category and source filters; browse all 51 entries.
- Inspect intact source artwork and descriptions in a keyboard-accessible dialog.
- Add, increase, decrease, remove and clear dishes; quantities are capped at 20.
- Persist only dish IDs/quantities in a business-scoped session-storage key.
- Explicit sample meal plan totals PHP 1,750 using mock prices; fees are unverified.
- Transfer a meal plan, pickup enquiry or validated date/time/party size into a draft.
- Copy the enquiry with honest clipboard fallback; no message is sent.
- Responsive navigation, mobile planning dock, reduced-motion behavior and image fallback.

## Boundaries retained

Supabase was inspected read-only. Its Wild Tree preset is still draft, hidden,
not ready, with no public route. The shared real Jourvis chat component is wired
behind `runtimeEnabled: false`; no live session is opened while the preset is
unavailable. The visible concierge is a draft editor, not simulated AI output.
Enquiries do not check table availability or send bookings, invitations or orders.

All 51 prices remain fictional and all descriptions remain demo copy. The 17
photo-backed names and 34 invented additions keep distinct labels. No tax or
service-charge percentage is invented. Supplied operating-hours artwork is
attributed and requires confirmation, including next-day closing on Friday/Saturday.

No main merge, deployment, Rib Crib branch update, dependency change, database write,
menu mutation or existing thumbnail/public-URL migration is part of this work.

## Validation

`npm run typecheck`, `npm run test:frontend`, `npm run build` and the CI browser
checks cover the implementation. Asset preservation is checked against a digest
of all original blob hashes. Browser QA writes screenshots at 1440, 1024, 768,
390 and 320px plus `qa.json` to `frontend/outputs/wild-tree/`.
See the actual GitHub Actions job for pass/fail results rather than treating these
commands or coverage descriptions as proof that a particular run passed.
