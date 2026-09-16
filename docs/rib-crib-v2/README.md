# The Rib Crib V2

A restaurant-first, warm editorial redesign on `restaurant/the-rib-crib-v2`. The public route remains `/restaurant/the-rib-crib`.

## Review locally

```sh
git fetch origin
git switch restaurant/the-rib-crib-v2
git pull --ff-only origin restaurant/the-rib-crib-v2
cd frontend
npm run dev
```

Use the address printed by the dev server and append `/restaurant/the-rib-crib`. No dependencies were added. Main, the homepage and deployment settings are not part of this change.

## Implementation

`components/jourvis/RibCribPage.tsx` delegates to `components/rib-crib-v2/RibCribV2Page.tsx`. The existing database route and `InitialBusiness` props remain intact. A single `RibCribJourvisChat` serves navigation, menu, meal-plan and reservation entry points. `lib/rib-crib-v2` separates content, asset mapping and testable plan/date helpers. Original source assets remain in `src/assets/rib-crib` unchanged.

The page includes a new editorial hero, searchable/category-filtered featured menu, additional text-menu groups, dish details, five selectable platters, an optional meal shortlist, a validated enquiry form, atmosphere/pickup sections, an illustrative conversation introduction and the existing compact canonical Jourvis launcher.

## Research and review records

- `research.md`: source-derived findings, unavailable Facebook/comment evidence, price conflicts and owner-confirmation queue.
- `asset-manifest.md`: all 27 source assets accounted for; 25 used and two redundant identity variants retained.
- `design.md` and `design-studies.html`: three creative studies and the selected Around the Table direction.
- `qa.md`: exact tests, known limits and commands for real-project validation.

A separate review bundle includes screenshots, the visual contact sheet and the expanded machine-readable asset/source evidence index. The website is not deployed. Current restaurant prices/contact information and live backend behavior still need owner/local confirmation.
