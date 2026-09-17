# The Wild Tree restaurant package

The approved demo menu contains **51 entries**: 17 photo-backed dish names and 34
invented additions, including 9 proposed Wild Tree Signatures. All prices are mock.

## Data ownership

- `menu.ts`: unchanged canonical keys, names, categories, integer priceCents,
  aliases, descriptions and provenance. Original and invented arrays stay separate.
- `content.ts`: derives all UI dishes and converts centavos to pesos exactly once.
- `meal-plan.ts`: shared planner bound only to this restaurant; mock-aware prompts.
- `demo-preset.ts`: unchanged menu-only draft fixture and conflict-safe SQL export.
- `asset-manifest.ts`: exact supplied filenames mapped to grouped asset paths.
- `assets.ts`: build-time image URL imports; only original dishes get photographs.
- `website-content.ts`: proposed website copy and explicitly attributed hours.
- `config.ts`: business/preset identity, isolated events, storage prefix and disabled runtime.
- `menu-view.ts`: alias/name/category search with source and category filters.

Photo-backed means the name is supported by the supplied asset, not that price,
recipe, portion size or stock is verified. Every item has `priceSource: 'mock'`,
`descriptionSource: 'demo-copy'` and `availabilitySource: 'demo-only'`.
Invented names also have `isMock: true` and `source: 'mock-concept'`.

## Images

All 38 supplied files are preserved under
`src/assets/businesses/restaurant/the-wild-tree/{branding,food,atmosphere,source}/`.
`sourceAsset` remains the unchanged provenance filename, not a public URL.
`sourceAssetPath` resolves it to its repository folder. `assets.ts` handles browser
URLs through the same Vite import approach as Rib Crib. Composite artwork is shown
intact and can be opened in the detail dialog. Invented dishes have no source image.

## Preview and runtime

The independently designed page is registered with the shared BusinessSiteRenderer.
Local review: `npm run dev`, then `/preview/the-wild-tree`.
The preview refuses production access and does not bypass the database resolver.
The future public route remains `/restaurant/the-wild-tree`, but no route is inserted.

Supabase preset `demo_restaurant_the_wild_tree.v1` remains draft, hidden and not ready.
Bookings and calendar invitations remain disabled. This commit makes no database
changes. `runtimeEnabled` remains false; the concierge can prepare/copy enquiries,
but no live message is sent. It does not fabricate AI answers or booking success.

The source module and database are separate copies via a reviewed export, not an
automatic sync service. Identical seeds are a no-op; differing existing data causes
an exception rather than an overwrite. Canonical menu and seed files are unchanged
by the website implementation, so a file reorganization does not require re-seeding.

Offline exports (stdout only, no credentials or network):

```sh
node --experimental-strip-types scripts/export-wild-tree-menu.ts --json
node --experimental-strip-types scripts/export-wild-tree-menu.ts --sql
```

Run `npm run typecheck`, `npm run test:frontend`, and `npm run build` before merging.
Browser QA is `node scripts/wild-tree-browser-qa.mjs` with the documented external
Playwright module and FRONTEND_URL settings; CI installs it outside the project.
