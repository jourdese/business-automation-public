# Marinara Ristorante presentation

This package is Marinara Ristorante's bespoke website presentation. It follows the
same ownership boundary as Rib Crib and The Wild Tree, while keeping its own layout,
visual language and interaction flow.

## Components

- `MarinaraPage.tsx` owns page state, table-enquiry drafts and business isolation.
- `MarinaraHero.tsx` uses the supplied Marinara brand and restaurant imagery.
- `MarinaraGallery.tsx` presents all 28 supplied food/drink/table images.
- `MarinaraMenu.tsx` browses the 100-entry demo catalog with source/category filters.
- `MarinaraMealPlanner.tsx` binds the shared restaurant planner to Marinara's catalog.
- `MarinaraConcierge.tsx` prepares/copies enquiries and can mount the shared Jourvis chat when the preset is ready.
- `Photo.tsx` provides local image failure handling.
- `MarinaraPage.module.css` is restaurant-owned; no global client stylesheet is added.

## Preview and release boundary

Use `/preview/marinara-ristorante` during local development. The preview is noindex
and development-only. Registering this presentation does not publish a public URL;
`/restaurant/marinara-ristorante` still requires a separately approved database route.
The current Marinara preset remains a hidden draft and `runtimeEnabled` remains false,
so no real Jourvis session, booking, payment or kitchen order is sent.

The visual system uses the supplied branding, dining-room image and all supplied food
media. Archived 2025 menu references and the 10 invented concepts remain explicitly
labelled; current prices, hours, fees, availability and ingredients are not asserted.
