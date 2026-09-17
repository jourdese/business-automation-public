# Marinara Ristorante — research and menu foundation

Reviewed: 17 September 2026.
Branch: `restaurant/marinara-ristorante-v1`.
Base: `f0d10eb19681c211edb396b235919a5c472c99bb` (latest Wild Tree logo fix).
No changes are pushed to `main`, the Rib Crib branch or the Wild Tree branch.

## Source-derived observations

The business is Marinara Ristorante Bistro & Pub. Published sources identify an
Italian-American casual restaurant at Ascendido Building, Pryce Business Park,
J.P. Laurel Avenue, Davao City. The dated review directly links the Facebook ID
supplied by the user. The directory adds Bajada to the address.

Sources:
- https://www.instagram.com/marinararistorante/
- https://www.facebook.com/profile.php?id=61553975544995
- https://eatsmejax.com/2025/04/06/davao-marinara-ristorante-food-review/
- https://www.davaocitydirectory.com/food-and-beverages/restaurants/italian-cuisine/marinara-ristorante-bistro-pub.html

The Instagram/Facebook profiles did not fully load during review. The April 2025
review's seven menu photographs were inspected directly, not inferred from generic
Italian menus. Each selected menu entry records its image source and publication
date. Actual photo date is not claimed from its filename.

The menu artwork shows a flowing Marinara script wordmark, cream pages, muted
red/peach accents and framed category headings. The available cheese-wheel photo
shows large glazed frontage, daylight, wooden chairs, muted seating and a trolley
above a patterned rug. This is a partial interior view, not a full premises survey.
The review describes the space as spacious. Current hours, a current full menu,
official font names/hex colors and complete current interior styling are unverified.

## Design interpretation — proposed, not official

A lighter and warmer Italian-American bistro than Wild Tree: sociable meals,
relaxed dates and the spectacle of cheese-wheel preparation. Lead with food and
tableside preparation, followed by format/size choices, the menu and meal planner,
then atmosphere, desserts and visit information. Do not copy either earlier
restaurant's section sequence or stylesheet.

Proposed palette: cream #F8F1E7, muted terracotta #A75E52, blush #DDB4A6,
brown #49352D and warm gold #BE9A61. These are proposed UI colors, not a brand guide.
Proposed headline: "A little theatre. A lot of comfort." It is not an existing
restaurant tagline. Preserve an approved original logo once supplied.
Do not infer a coastal setting from the name or invent chef/ingredient claims.

## Implemented data and scaffold

100 selections: 90 photo-backed historical entries/variants + 10 proposed concepts.
The count includes separate solo/sharing, pizza-size and cheese-wheel entries.
It is not a complete/current menu. Historical amounts are retained as reference
prices and reused as demo values; every runtime price and availability is mock.
All descriptions are demo copy, not restaurant-verified ingredient information.

Proposed concepts include a bistro platter, burrata crostini, mushroom arancini,
lemon-caper prawn linguine, brown-butter mushroom pasta, porcini pizza,
orange-rosemary chicken, affogato, an alcohol-free basil spritz and coffee panna cotta.
They complement the source menu but are not claimed as actual house signatures.

The components folder is a scaffold only. Data, meal-plan binding, configuration,
source registry, asset slots and tests are implemented. No restaurant page or
renderer is added. Branding/atmosphere/food/source folders are ready for approved
uploads; third-party review photos are not copied into public website assets.
Temporary research-download workflows are removed after inspection.

Supabase target: `platform.capability_presets`, key
`demo_restaurant_marinara_ristorante.v1`, status draft, ready=false, visible=false.
No public route, capability assignment, booking, calendar invitation or live
conversation is enabled. No production deployment is part of this task.

## Validation

The new tests cover provenance, variants, cents conversion, catalog isolation,
meal planning, hidden-draft boundaries, asset slots and conflict-safe seed export.
The read-only Marinara CI runs type checking, all frontend tests and a production
build without a deployment step. Consult the actual run for pass/fail results.
