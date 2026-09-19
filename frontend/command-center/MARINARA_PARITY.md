# Marinara Autoinventory → Jourvis Command Center parity

Branch: `jourvis/command-center-v1`

This checklist tracks migration from the legacy Marinara Autoinventory preview into the shared Jourvis Command Center. The goal is behavioral parity where the behavior is still useful, while keeping the newer Command Center architecture.

## Migrated / improved

- Inventory on-hand, incoming, full level, reorder level, daily use, zone, supplier, contact, pack size, price, lead time, purchase mode, and automation authority.
- Inventory search and storage-area filtering.
- Projected stock at supplier delivery.
- Restock quantity calculated from projected delivery stock, including expected lead-time consumption.
- Days of stock cover.
- Recipe usage ("used by") per ingredient.
- Signed manual stock corrections with explicit reasons.
- Separate waste/spoilage recording.
- Recipe/POS simulation with inventory deductions and negative-stock protection.
- Per-item Manual / Jourvis mode.
- Global autonomy switch.
- Rejected-item pause state and explicit Resume Jourvis control.
- Pre-contact automatic safeguards for quantity, fixed-price spend, hard pack-price ceiling, and lead time.
- Supplier-grouped owner restock suggestions.
- Group approval starts separate item-scoped purchase workflows so one item's authority never authorizes another item.
- Supplier and configured contact identity carried into each purchase.
- Purchase lifecycle: request sent → supplier viewed → agreement/quote → final supplier confirmation → in transit → partial/full receipt.
- Buyer and supplier confirmation states shown separately.
- Fixed-price owner approval and automatic approval paths.
- Quote request / quote received flow.
- Quote explanations for spend, price, quantity, delivery-fee, lead-time, negotiation, and owner-authority limits.
- Automatic quote acceptance within configured authority.
- Automatic counteroffer handling within target/hard-price/spend/counteroffer limits.
- Quantity edits clear stale supplier terms and restart the supplier workflow when required.
- Incoming stock is added only after final supplier confirmation.
- Partial receiving keeps the remaining quantity incoming.
- Full receiving closes the purchase and moves the remaining confirmed quantity on hand.
- Supplier directory with contacts, channels, phone, email, supplied items, prices, and lead times.
- Activity history with actor, automatic/manual mode, reason, related entity/request, timestamp, and configuration snapshot.
- Browser demo persistence and reset behavior.
- Marinara archived menu references separated from live/current price truth.
- Four original recipe-mapped menu items connected to ingredient economics and simulated POS usage.
- Full Menu CRUD with current selling price, category, variant/size, description, recipe mapping, availability, archive/restore, duplication, category rename, bulk availability, and display ordering.
- Compact expandable Menu library with landscape thumbnails; Add/Edit uses a fixed drawer so scrolling position is preserved.
- Menu economics: ingredient cost, food-cost %, gross profit per item, gross margin %, current-vs-archived price movement, food-cost warnings, and recipe-cost drift since the recipe was last saved.
- Full Recipe CRUD with archive/restore, duplication, notes, ingredient add/remove/quantity editing, live cost/serving impact, and linked-menu food-cost impact.
- Recipe change preview models ingredient quantity change, configured daily-use change, and stockout timing movement before save.
- Recipe editor can create a new Inventory ingredient without leaving the workflow.
- New ingredient setup includes unit, storage zone, stock/full/reorder levels, daily use, supplier/contact, purchasing mode, pack size/price, lead time, automation mode, trigger, and automatic spending limit.
- Supplier create/edit is available from the Suppliers operation and directly from Recipe → Create Inventory Item; editing the primary contact preserves any additional stored contacts.
- Runtime schema migrated to v2 while preserving existing browser storage.
- Collision-resistant request/entity/activity IDs replace array-length IDs.
- Purchase-state transition table and physical-receipt guards prevent invalid workflow jumps.
- Runtime integrity validation checks Menu → Recipe → Inventory → Supplier → Purchase relationships, duplicate IDs, supplier/contact ownership, negative stock, and supplier-confirmation invariants.
- Production action-provider contract now includes an idempotency key for retry-safe external side effects.

## Intentionally changed from legacy

- Legacy multi-line procurement objects are not the authority model for automatic work. Command Center keeps purchase authority item-scoped.
- Supplier grouping remains an owner-facing convenience; approving a group creates separate purchase workflows per item.
- Legacy tab/selected-item navigation is replaced by shared Command Center modules and cards.
- Legacy summary-label toggles and other presentation-only controls are not parity requirements.
- Legacy preview-only flags on individual supplier actions are not carried forward because the entire current Command Center runtime is explicitly a demo.
- Command Center Activity replaces the legacy string-only activity log with structured audit events.

## Compatibility retained temporarily

- `/restaurant/marinara-ristorante/Autoinventory-preview` remains available as a migration reference.
- Its local `inventory-config.ts` now only re-exports the canonical shared Marinara inventory configuration.
- Command Center reads the canonical configuration from `lib/businesses/restaurant/marinara-ristorante/inventory-config.ts`.

## Remaining before legacy retirement

- Complete the visual local/browser review on the current branch, especially the new compact Menu tiles/drawers and the nested Recipe → Inventory → Supplier flow.
- Browser-flow checklist: edit recipe → Menu economics change; change Menu price → food-cost/margin change; simulate sale → ingredient stock decreases; low stock → restock work appears; purchasing → supplier lifecycle; physical receive → incoming becomes on-hand; Menu/Recipe archive/restore; supplier create/edit preserves contact/item links.
- The code-level safety gate is already green: typecheck, scoped lint, runtime regression tests, production build, purchase-state tests, economics/recipe-impact tests, and runtime relationship validation.
- No Vercel preview exists for `jourvis/command-center-v1`, so legacy remains available until that visual review is completed.
- After visual sign-off: remove the legacy reference card/link, redirect the legacy Autoinventory route to `/command-center/marinara-ristorante/operations/inventory`, then remove legacy-only implementation.

## After legacy retirement

- Replace browser-local runtime persistence with the production Jourvis data/action provider.
- Connect real POS/menu, supplier, finance/accounting, and other external systems.
- Keep external side effects behind Jourvis actions/integrations rather than placing integration logic in the UI.
