# The Wild Tree demo menu

The approved menu is now implemented as **51 entries**: 17 photo-backed dish names
and 34 invented additions. The expansion includes 9 proposed Wild Tree Signatures.
The earlier approximate total of 48 was a counting error, not a reduced scope.

## Source of truth

- `menu.ts`: canonical keys, names, categories, integer `priceCents`, aliases,
  descriptions and provenance. `wildTreeOriginalMenu` and
  `wildTreeMockMenuExpansion` remain separate and combine into `wildTreeMenu`.
- `content.ts`: derives all frontend dishes and converts cents to pesos exactly
  once. It carries `sourceLabel` and `priceNote` into the UI-facing data.
- `meal-plan.ts`: binds the shared planner to this catalog only; generated prompts
  label concept dishes and fictional prices. Subtotals do not apply unknown fees.
- `demo-preset.ts`: builds the same menu into a menu-only draft capability preset,
  plus a conflict-safe INSERT-only SQL exporter.

Photo-backed means the **name** is supported by the supplied asset, not that its
price, recipe, portion size or stock has been verified. Every item has
`priceSource: 'mock'`, `descriptionSource: 'demo-copy'` and
`availabilitySource: 'demo-only'`. Invented names additionally have `isMock: true`
and `source: 'mock-concept'`. `available: true` permits demo selection only.

## Images

The 17 original entries reference the exact supplied image filenames in
`src/assets/businesses/restaurant/the-wild-tree/`. Some are menu composites, not
cropped food photographs. `sourceAsset` is an evidence filename, not a public URL.
The UI-facing `image` is a semantic key; an asset-import map is still required when
building the page. All invented dishes have `sourceAsset: null` and `image: null`.
Do not silently attach another dish's photo to an invented concept.

## Database seed and visibility

Target: `platform.capability_presets` with
`preset_key = 'demo_restaurant_the_wild_tree.v1'`.
Menu path: `metadata.demo.fixture.restaurant.menu`.

The preset is **draft**, with `demo.ready = false`, `demo.visible = false`,
booking disabled and calendar invitations disabled. No public route is created.
The page/renderer, approved business facts and runtime capabilities still need
separate setup. Rib Crib's preset and the 21 active public demo routes are untouched.
A data commit is not a website deployment or a live kitchen/order integration.

The source module and database are separate copies: the SQL export produces a
snapshot of the canonical module. It is NOT an automatic sync service. Re-running
an identical seed is a no-op; a changed existing preset causes an exception instead
of overwriting it. Future edits require an explicit reviewed database update.

Offline exports, from `frontend/`:

```sh
node --experimental-strip-types scripts/export-wild-tree-menu.ts --json
node --experimental-strip-types scripts/export-wild-tree-menu.ts --sql
```

The exporter only writes stdout; it has no database credentials or network calls.
No price, tax, service-charge, dietary or real-availability claim should be made
from this fixture. Display the supplied notices when implementing the website.

Run `npm run typecheck`, `npm run test:frontend`, and `npm run build` before merging.
