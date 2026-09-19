# Jourvis Command Center Roadmap

Branch: `jourvis/command-center-v1`

The Command Center is not only an Operations dashboard. Every top-level tab must become a real business operating surface backed by the same shared Jourvis runtime and, later, production data providers.

## Phase 1 — Marinara operating foundation

Status: in progress / mostly implemented

- Overview
- Inventory
- Purchasing
- Suppliers
- Menu
- Recipes
- Waste
- Decisions
- Activity
- Menu + Recipe CRUD
- Compact expandable Menu library + fixed no-scroll editors
- Menu economics and recipe-impact preview
- Recipe → create Inventory Item → create/edit Supplier
- Menu/Recipe duplicate, archive filtering, bulk availability, category rename, and ordering
- Runtime schema v2, relationship validation, stronger IDs, legal purchase transitions, and action idempotency contract
- Item-level purchasing authority
- Supplier lifecycle and physical receiving
- Structured audit trail
- Canonical Marinara business configuration

Before production:
- visual local full-flow review of the new compact Menu/configuration drawers
- remaining parity sign-off
- retire legacy Autoinventory after visual sign-off
- move runtime validation/idempotency enforcement server-side with Jourvis V2

## Phase 2 — Forecast

Build Forecast from actual runtime/provider data, not static cards.

Initial runtime-backed forecast:
- projected stock at supplier delivery
- days of cover / projected stockout
- 7-day ingredient demand using configured daily use
- purchase quantity required to restore target levels
- incoming vs projected consumption
- supplier lead-time exposure
- which menu/recipes are affected by forecast shortages
- planned Jourvis action and whether owner authority is required

Later production forecast inputs:
- POS sales history
- reservations/orders
- weekday/seasonality
- events
- weather where materially useful
- promotions/menu changes
- supplier history
- forecast confidence and accuracy tracking

Future forecast surfaces:
- revenue
- covers/customer demand
- inventory
- purchasing
- cash
- labor

## Phase 3 — Performance

Replace illustrative performance numbers with derived business KPIs.

Runtime-backed first:
- inventory readiness
- menu recipe coverage
- active automated workflows
- owner exception rate
- automation/manual action mix
- purchasing cycle state
- waste activity
- supplier workflow throughput

Production:
- revenue
- gross profit
- operating profit
- gross margin
- food cost %
- average order value
- covers
- labor %
- waste %
- stockout frequency
- forecast accuracy
- supplier reliability
- automation success / exception rates

Every KPI should explain:
1. what changed
2. why
3. operational cause
4. what Jourvis did
5. what Jourvis plans next

## Phase 4 — Finance

Shared finance layer:
- P&L
- cash flow
- COGS
- ingredient/menu profitability
- purchasing commitments
- supplier spend
- expenses
- payables
- receivables
- reconciliation
- anomalies
- projected cash

Do not fabricate unavailable accounting data. Show provider/data-source state explicitly.

## Phase 5 — Briefings

Generate from the same runtime:
- daily owner briefing
- weekly operating review
- monthly business review
- custom date range

Include:
- what changed
- important KPIs
- forecast
- exceptions
- actions Jourvis completed
- owner decisions still needed
- priorities next

## Phase 6 — Insights

Cross-module intelligence rather than standalone dashboard observations.

Examples:
- recipe cost increase is creating margin pressure
- menu item demand is driving an ingredient stockout
- supplier lead time is causing repeated owner exceptions
- waste is concentrated in specific ingredients/menu items
- forecast misses are connected to specific days/events
- automation limits are unnecessarily causing manual approvals

## Phase 7 — Decisions

Decisions remains the human-authority queue for every module:
- purchasing
- finance
- staffing
- customer/refund exceptions
- menu/pricing changes
- forecast-driven actions
- future integrations

No separate approval system should be invented per module.

## Phase 8 — Activity / Audit

Activity remains the shared audit log:
- automatic vs manual
- actor
- reason
- configuration snapshot
- related entity/request
- before/after values where material
- integration result
- verification result

Production history moves from browser storage to durable server-side storage.

## Phase 9 — Production runtime

Command Center UI
→ Jourvis V2 API/runtime
→ domain engines
→ durable database
→ external providers/actions

- Supabase persistence
- business/user authentication
- roles and approval authority
- idempotency
- server-side state transitions
- provider adapters
- n8n only when an external workflow/action benefits from it
- POS / supplier communication / accounting / calendar / staff / CRM integrations

## Phase 10 — Reusable business platform

After Marinara:
1. Rib Crib as second real restaurant implementation
2. prove restaurant-generic architecture
3. expand to veterinary, salon, clinics, law firms, logistics, resorts, and other industries
4. keep shared top-level tabs; vary business-specific Operations modules
