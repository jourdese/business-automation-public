# The Wild Tree assets

All 38 supplied image/vector files are preserved byte-for-byte, grouped like the Rib Crib package:

- `branding/`: original logo, supplied light/dark logo variants, tree emblems and Taste with Tradition artwork.
- `atmosphere/`: hero interior, interior detail and shared-table image.
- `food/`: individual dish artwork, alternate prawn soup image and cocktail lineup.
- `source/`: original composite menu/reference artwork and operating-hours graphic.

`frontend/lib/businesses/restaurant/the-wild-tree/asset-manifest.ts` maps the unchanged source filenames to these paths. The menu's `sourceAsset` values remain provenance filenames (not URLs), so the canonical menu and database seed are unchanged.

The browser imports go through `assets.ts` with Vite `?url` imports. Do not put `/src/assets/...` paths into HTML or copy Rib Crib images here. Composite menus are displayed intact; the full artwork is available in the detail dialog. Invented menu additions have no dish photograph.

The new atmosphere images are supplied concept artwork. The page labels illustrative imagery and all fictional menu prices; it does not claim these are current restaurant photography, prices or stock.
