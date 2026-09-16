# V2 creative direction — Around the Table

## Three studies

Open `design-studies.html` from a local checkout to compare lightweight visual studies. They are design artifacts, not alternative production routes or unfinished application components.

**A — The Grill Poster.** Full-bleed dark food image, condensed uppercase display type, compact editorial caption and one strong menu action. Strong appetite impact and proximity to existing barbecue materials. Rejected as the primary system because long menus become visually heavy and image-overlay readability needs constant management.

**B — Around the Table (selected).** Warm cream, a confident red/white wordmark, an asymmetric serif-led hero, a photographic arch, an inset food print and a darker sharing chapter. Different sections have different jobs: appetite, browse, compare, gather, enquire, optional assistance. Best balance of brand continuity, hospitality, mobile readability and useful menu depth.

**C — Crib Club.** Graphic red/cream blocks, oversized numbered menu navigation and a modular food mosaic. More playful and highly navigable. Useful influence on filters and section indexing, but rejected as the main composition because the identity competes with the food when repeated through a long page.

The existing screenshot/layout was not copied. The production implementation combines the selected editorial direction with practical menu interaction and restrained brand graphics.

## Visual system

- Restaurant palette: cream `#F7F2E9`, paper `#FFFCF7`, red `#861D28`, deep red `#5C1520`, dark ink `#29201E` and warm dividers.
- Canonical Jourvis SVG geometry and mint/emerald/navy palette remain unchanged. Its existing compact launcher stays fixed bottom-right; no new global particle engine is installed.
- Georgia/Times display fallback and Segoe UI/Arial body text avoid external font loading or additional font licenses. The supplied white wordmark remains the visual signature.
- Large display hierarchy, varied editorial image proportions, short customer copy and clear 44px-or-larger primary touch actions. The menu’s add action is left-aligned below price, away from the dock’s usual right-edge position.
- Transparent graphics are contained intact; photo surfaces use appropriate cover crops. Interior JPG and quote PNG are separate layers. BBQ artwork has the same deliberate base/quote separation. No white-image-on-white mistake and no seam-overlap pixel patches.

## Interaction system

Menu category filters and search cover the eight featured dishes. Native details reveals more text menu groups. Individual dish dialogs use the browser’s native dialog top layer, Escape, focus containment and focus return. Platter choices update one image/details stage. A session-scoped meal shortlist stores dish IDs and bounded quantities only, explicitly excluding unconfirmed prices from its subtotal. It is not a checkout.

Reservations validate date/time/guest count and create a 12-hour Philippine-time enquiry draft in the existing chat. The 1–40 input range is a UI validation bound, not a restaurant seating-capacity claim. Availability still needs confirmation.

All questions enter one `RibCribJourvisChat`. Initialization is deduplicated, the existing preset/transport/acknowledgement contract is preserved, failed turns retain their message ID for retry, and unavailable connections cannot claim that the restaurant preset is loaded. No live connection is fabricated.

## Motion and architecture

CSS-only light image/hover/reveal transitions; content is visible before enhancements run. Reduced-motion rules disable continuous decorative animation. No scroll hijack, delayed intro, autoplay media or added runtime package.

V2 uses its own CSS Module and root marker, not `.rib-crib-page`. The existing route entry delegates to V2 without altering database route resolution. Old restaurant CSS no longer matches the new restaurant layout. Shared homepage, route resolver, configuration, transport and character files stay unchanged. The chat receives an optional route-scoped presentation class; no parallel chat engine is created.

## Performance and remaining work

Build-time `?url` imports preserve the existing Vite asset handling; no raw `/src` browser paths or DOM asset-repair bridge. Images have declared sizes, eager/high-priority hero loading and lazy lower-page loading. The 27 original files are preserved. No optimized derivatives are claimed: several source PNGs remain large, so a later measured image-optimization pass is recommended before production. The new application requires no package installation beyond the existing project dependencies.
