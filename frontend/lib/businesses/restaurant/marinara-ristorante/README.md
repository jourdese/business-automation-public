# Marinara Ristorante menu draft

Branch: `restaurant/marinara-ristorante-v1`.
Preset: `demo_restaurant_marinara_ristorante.v1`.
Future path (not registered): `/restaurant/marinara-ristorante`.

## Menu provenance

100 selectable entries: 90 selected entries/variants transcribed from menu photos
in Eats Me, Jax!'s review published 6 April 2025, plus 10 invented demo concepts.
This is not 90 unique dishes, a complete transcription, or a verified current menu.
Separate solo/sharing sizes, 12/14-inch pizzas and cheese-wheel preparations are
intentionally separate keys. `dishKey`, `variant` and `printedName` preserve the
relationship and original printed wording. Cheese-wheel prices are full prices,
not supplements to the regular pasta price.

The 90 historical numeric amounts are reused as demo prices. They also remain in
`referencePriceCents` with a dated `sourceUrl`. All entries have
`priceSource: 'mock'`, `availabilitySource: 'demo-only'` and
`descriptionSource: 'demo-copy'`; this does not mean the historical amount itself
was invented. The 10 invented concepts have `isMock: true`, no source photograph
and no archival reference price. Unknown fees remain null, not zero-confirmed.
Historical bundle/weekday promotions and obscured amounts were not activated.

## Ownership

- `menu-data.ts`: source transcription and proposed concepts, in peso input units.
- `menu.ts`: immutable canonical menu in integer centavos, provenance and notices.
- `sources.ts`: source registry, dates, limitations and provisional business facts.
- `content.ts`: frontend projection; converts cents to pesos once.
- `meal-plan.ts`: binds the shared planner to this catalog, not another restaurant.
- `config.ts`: isolated storage/chat namespaces; runtime and site are disabled.
- `assets.ts`: null approved-asset slots, not hotlinked third-party food images.
- `website-content.ts`: proposed brand direction, distinct from verified evidence.
- `demo-preset.ts`: hidden draft fixture and conflict-safe INSERT-only SQL exporter.

## Database and release boundary

Only a draft `platform.capability_presets` record is seeded. Its menu path is
`metadata.demo.fixture.restaurant.menu`. No business client identity, capability
assignment, public route, live chat, booking or kitchen integration is created.
No database schema, other restaurant preset, or existing route is changed.

The code and database are separate copies synchronized by explicit reviewed seeds,
not by an automatic sync service. Identical re-runs are no-ops; a changed existing
record causes the seed to abort rather than overwrite it.

From `frontend/`:

```sh
node --experimental-strip-types scripts/export-marinara-menu.ts --json
node --experimental-strip-types scripts/export-marinara-menu.ts --sql
npm run typecheck
npm run test:frontend
npm run build
```

The exporter writes stdout only. It has no database credentials or network calls.
An implemented restaurant website is a separate next step. This package does not
register a renderer or claim the restaurant authorized publication of the concept.
