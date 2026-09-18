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
- Four recipe-mapped menu items connected to ingredient economics and simulated POS usage.

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

- Complete local/browser review of the current Command Center purchasing and receiving flow.
- Verify no useful legacy procurement edge case remains after the new supplier lifecycle and pre-contact safeguards.
- Decide whether any remaining selected-item detail from legacy deserves a shared Command Center equivalent.
- Remove the legacy reference card/link after parity sign-off.
- Redirect the legacy Autoinventory route to `/command-center/marinara-ristorante/operations/inventory`.
- Remove legacy-only implementation once the redirect has been reviewed.

## After legacy retirement

- Replace browser-local runtime persistence with the production Jourvis data/action provider.
- Connect real POS/menu, supplier, finance/accounting, and other external systems.
- Keep external side effects behind Jourvis actions/integrations rather than placing integration logic in the UI.
