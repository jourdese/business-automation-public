# Business-site structure

Starting production commit: `53cb15b036c42f331f5297fe5675d83d29143fc0`.
Review branch: `restaurant/the-rib-crib-v2`. No production merge or deployment.

## Ownership

- `frontend/app/`: routes, metadata, root layout and shared application styles.
- `frontend/components/business-sites/BusinessSiteRenderer.tsx`: server-side presentation dispatch after database route resolution.
- `frontend/lib/businesses/registry.ts`: allowlisted custom presentations, not a replacement routing database.
- `frontend/components/business-sites/restaurant/shared/`: reusable restaurant chat transport and its scoped stylesheet.
- `frontend/lib/businesses/restaurant/shared/`: catalog-bound meal planning, enquiry/date helpers and per-business chat namespaces.
- `frontend/components/business-sites/restaurant/the-rib-crib/`: existing restaurant design, its local CSS module, icon and dialog.
- `frontend/lib/businesses/restaurant/the-rib-crib/`: unchanged menu/content, imported asset map, presentation config and thin meal-planner binding.
- `frontend/src/assets/businesses/restaurant/the-rib-crib/`: `branding/`, `food/`, `atmosphere/`, `source/`.
- `docs/archive/rib-crib-legacy/`: obsolete global CSS layers, compatibility component and embedded-image modules. Never import these into the application.

The `the-wild-tree/` packages contain README placeholders only. This refactor
neither implements the Wild Tree website nor registers a database route/preset.

## Preserved contracts

Public URLs, menu prices/descriptions, the database route resolver, demo transport,
receipt acknowledgements, Rib Crib event names, session-storage key, Philippine
time handling, enquiry-only wording and all public image URLs are retained.
The imported source image files were moved without changing their bytes.

`public/rib-crib/` deliberately remains in place: crawlers and shared links already
request its thumbnail URLs. New source assets can use the grouped source folder;
public URL migrations should be a separate backwards-compatible change.

The generic `BusinessDemoPage` remains the fallback for every database-resolved
business without a bespoke renderer. Renderer lookup verifies the adapter as well
as the path. A keyed component instance prevents chat state crossing routes.

## CSS migration

The six historical `app/rib-crib*.css` files are no longer imported globally.
The current page already used a CSS module. Its chat theme and the small set of
legacy defaults still used by the portalled chat were consolidated into
`RestaurantJourvisChat.module.css`, preserving cascade precedence and the latest
docked-panel/mascot/message-wrapping fixes. The internal `rib-*` chat class hooks
are intentionally retained; all are scoped to the local panel/theme classes.
Do not create another global `*-fix.css` or `*-final.css` file for a client.

## Adding another restaurant

1. Read the existing database route and obtain its own business/preset identity.
2. Put custom presentation and local styles in the business's component package.
3. Put presentation copy, asset mapping and config in its data package. Normalize
   authoritative database menu data instead of maintaining conflicting prices.
4. Bind `createMealPlanner` to that restaurant's catalog. It receives prices in
   major units for compatibility with the current frontend; database `priceCents`
   must be normalized at the data boundary, not passed directly as `price`.
5. Use `createRestaurantChatPresentation(publicPath)` to isolate event/DOM IDs.
6. Add the custom presentation to the allowlist and renderer map after it exists.
   Neither entry by itself publishes or authorizes a URL.
7. Keep reference/mock prices labelled and require explicit approval for database
   writes or a production deployment.

No business should import another business's menu binding or page stylesheet.
Do not create hardcoded `app/restaurant/<business>/` routes.

## Checks

From `frontend/`:

```sh
npm ci
npm run typecheck
npm run test:frontend
npm run build
```

`test:frontend` now includes all `scripts/*.test.ts`, including the previously
omitted meal-plan tests and the new registry, import, data-isolation and deployment
checks. A pre-existing regression test still expected the retired 600x315 JPEG;
it now checks the already-published PNG thumbnail and the existing 1200x630
metadata declaration. No thumbnail or metadata value was changed to satisfy it.

The review-only GitHub Actions workflow checks types, tests and build. It has
read-only repository permissions and contains no deployment step.

The starting commit also failed strict TypeScript checking because a queued chat
message widened `role` to `string`. Its existing literal is now marked `as const`;
this changes no runtime behavior. Dependencies and the lockfile are unchanged.
