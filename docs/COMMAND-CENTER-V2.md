# COMMAND-CENTER V2

V2 is developed on `jourvis/command-center-v2`. V1 remains intact under `frontend` at reference commit `83487e6722d48823fa4f8dae113cec02ead1fd6e`.

The six areas are Overview, Orders, Menu, Inventory, Purchasing and Reports. Decisions and activity stay close to the record that caused them. Jourvis starts asleep; manual operations never depend on automation or a desktop tunnel.

Postgres owns orders, recipe versions, reservations, stock movements, quotes, approvals and receipts. Completed orders derive sales. Accepted orders reserve ingredients; preparation consumes them exactly once. Cancellation before preparation releases reservations; cancellation after preparation records waste and never invents returned stock. Incoming purchases are separate from physical inventory. Monetary values use integer centavos.

Owner routes use `/command-center/[businessId]` with verified Supabase identity and database membership checks. Public restaurant slugs and QR station tokens are discovery/routing identifiers, never owner authorization. Supplier accounts own only their catalog and quotations for approved relationships.

The initial Marinara owner is bound only after verifying the Supabase identity requested by the owner. No ownership is inferred from a public URL, browser state or editable auth metadata.

## Production approval

The user deploys production manually. Git deployment remains disabled. Do not deploy or promote production from this task. The final application must support this existing command sequence after the reviewed PR is merged:

```powershell
cd "C:\Users\Jour\Documents\business-automation-public"
git switch main
git pull origin main
npx vercel --prod --scope jour
```

Database migrations and integration readiness are checked separately before that final deployment. No provider messages are sent as tests. Existing Messenger/n8n routes, workflows and credentials remain unchanged.

## Run locally

Install the root dependencies and preserved frontend dependencies:

```powershell
npm ci
npm --prefix frontend ci
npm run build
npm run dev -- --port 3010
```

Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable key. Do not put a service-role key in this application. The application sends the signed-in user's Supabase JWT to the checked database RPC.

For isolated, disposable verification without Supabase, run `node scripts/local-fixture.mjs` in one terminal. In a second terminal, set `$env:CC_LOCAL_TEST_URL='http://127.0.0.1:4319'` before starting the dev server. This fixture uses PGlite and synthetic owner/supplier identities. It is explicitly rejected outside development or on Vercel. It never connects to n8n, Supabase, Gmail or Messenger.

## Routes and ownership

| Route                                       | Purpose                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `/account`                                  | Verified email sign-in                                                     |
| `/command-center`                           | Membership-scoped business chooser                                         |
| `/command-center/[businessId]`              | Overview, then `/orders`, `/menu`, `/inventory`, `/purchasing`, `/reports` |
| `/command-center/[businessId]/settings`     | Operating mode, invitations, rules and delivery recovery                   |
| `/command-center/[businessId]/activity`     | Audit trail                                                                |
| `/restaurant/marinara-ristorante`           | Redesigned public restaurant menu                                          |
| `/order/marinara-ristorante/[stationToken]` | Limited table ordering capability                                          |
| `/suppliers/register`                       | Verified supplier registration                                             |
| `/suppliers`                                | Own catalog and approved quotation relationships                           |
| `/command-center-v1`                        | Preserved V1 reference                                                     |

An administrator provisions one initial owner invitation against the exact requested email. It is claimed only after Supabase verifies that account, with no existing active owner. Normal staff/supplier invitations require an explicit, expiring invitation link. Admins cannot grant owner access. Only an owner can revoke staff membership. Neither public URLs nor editable user metadata grant access.

## Database and state boundaries

The additive migration creates `cc_private`, a checked `public.cc_api` wrapper, a scoped `public.cc_worker` wrapper and a minimal `public.cc_changes` invalidation table. It reuses the existing platform business/membership tables. All new private tables have RLS enabled and no client table-write grants. Privileged operations are narrowly scoped inside private functions with explicit authorization checks; public wrappers use invoker security.

| Source of truth                 | Stored facts                                                                     | Derived presentation                               |
| ------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------- |
| Orders and order items          | Status, origin, quantities, price snapshots, timestamps                          | Sales, average order, product mix                  |
| Recipe versions and order usage | Accepted recipe quantities; cost at preparation                                  | Estimated food cost; after-food-cost amount        |
| Ingredients and stock movements | Current physical/reserved stock and append-only movements                        | Available stock and reorder warnings               |
| Purchases and receipts          | Versioned terms, approval, supplier confirmation, physically received quantities | Incoming quantity, commitments, receiving progress |
| Rules and restaurant settings   | Authorized supplier product, packs, terms, ceilings, mode                        | What Jourvis may do next                           |
| External jobs and attempts      | One-time leases, results, uncertainty, provider references                       | Delivery/recovery status                           |

Orders reserve ingredients at acceptance and consume them at preparation. Cancellation before preparation releases reservations. Cancellation after preparation retains the consumption and records the reason; its zero-quantity waste annotation prevents double deduction. Completed orders alone count as sales. Recipe edits never change an accepted order's recipe. Receiving updates weighted ingredient cost and physical quantity atomically, with a stable request key for retries.

The seed includes exactly 12 photographed dishes, complete recipes, 38 ingredients, six fictional suppliers, eight paused QR tables, 90 days of history, today's seeded orders, a confirmed tomato delivery, a waiting basil quotation and a shrimp quote above authority. `origin` distinguishes seeded, manual, Jourvis and customer records. `node scripts/seed-demo.mjs YYYY-MM-DD` regenerates the deterministic SQL for a chosen date. The SQL skips an existing V2 restaurant; it never resets customer records. Seeded dates do not silently move forward each day.

## Realtime and request flow

```text
QR customer / owner / supplier
  → Next.js API (origin, body size and identity checks)
  → Postgres checked command (membership, relationship, state, idempotency)
  → order / inventory / purchasing + audit committed together
  → minimal business-change event
  → Supabase Realtime invalidation → fresh authorized owner snapshot
  → deterministic Jourvis rule evaluation on relevant writes
  → durable external job only when external communication is authorized
  → Next.js scoped worker → authenticated n8n action gateway
  → existing Gmail integration → provider receipt
  → Postgres action result → realtime owner update
```

Customer receipt polling exposes only that order, requiring its random receipt token. Owner views subscribe to business-scoped realtime events, refresh after reconnect/focus, and revalidate access periodically. Supplier views refresh after changes and every 15 seconds while visible. All panels read authoritative records; the browser stores only optional basket/receipt recovery state.

Sleeping keeps the business operating without autonomous actions. Watch surfaces stock/quote observations. Contact can request quotes for explicitly enabled ingredient rules. Buy additionally checks the quoted pack ceiling, exact authorized terms, minimum order, delivery fee, per-purchase ceiling and aggregate daily commitment. Current authority is checked again before dispatch. Incoming stock prevents unnecessary reorder requests. An unresolved purchase prevents duplicate requests for the same ingredient.

## External actions and n8n setup

`workflows/command-center-v2-actions.json` is an **inactive importable workflow**, separate from existing workflows. It requires deliberate credential binding before activation:

1. Import it as a new workflow; do not overwrite an existing workflow ID.
2. Bind the webhook's Header Auth credential named `Command Center V2 action key`. Its header name is `x-jourvis-action-key`; its random value must match server-only `CC_N8N_ACTION_SECRET`.
3. Bind the HTTP Request node's Header Auth credential named `Command Center Supabase publishable apikey`. Its header name is `apikey`; use the existing project's publishable key.
4. Confirm the existing `INTEGRATION | Gmail | Send Email` child workflow ID `0a0835d0b0258bd0` still resolves with its existing credential. Do not rotate or copy the Gmail secret.
5. Provision a random server-only `CC_ACTION_WORKER_TOKEN` (at least 40 characters). Save only its SHA-256 hex digest in `cc_private.runtime_grants`, scoped to the intended V2 restaurant. This grants access to its approved outbox, not general database access.
6. Set `CC_N8N_ACTION_URL` to the new workflow's HTTPS production URL. Set the two action secrets only in server environments, never in `NEXT_PUBLIC_*` values or Git.
7. Verify the gateway configuration and one-time lease behavior before setting `runtime_grants.enabled` and the restaurant's `integrations_ready` to true. Fictional suppliers and `.invalid` destinations remain blocked from external sending regardless of these switches.

The gateway consumes an expiring one-time lease in Postgres before reading the approved recipient/terms. Replaying the same webhook cannot send again. It invokes the existing Gmail leaf and returns its provider message ID. Transport timeout or a malformed result becomes **uncertain**, never an automatic resend. In Settings, an owner can record an independently verified provider outcome and separately authorize one new attempt only when no-send is established. Email acceptance does not itself mark a purchase confirmed: supplier confirmation remains a distinct business fact.

`after()` drains at most three queued actions after relevant application writes. When no action is queued, n8n is not called. This avoids n8n executions for ordinary navigation, reports and stock reads. A later authorized operation or the explicit **Evaluate rules / recover pending work** control resumes queued work. This is an event-driven demo; it does not promise overnight processing without an event. An always-on scheduled worker can be added later without changing the source of truth.

The existing Messenger delivery workflow remains Page-scoped and is not repurposed for supplier mail. Calendar, accounting and POS are future action types, not enabled integrations in this implementation.

## Before the user's final production deployment

1. Review and merge the feature PR through the normal approval process. This task does not merge `main` or deploy production.
2. Apply the new migration and seed only the intended V2 demo. Verify 12 menu items, complete recipes, balanced stock, sleeping automation and paused ordering.
3. Prepare the initial owner invitation for the requested email. Do not create a pre-verified user or take ownership based on an existing Meta/Google session.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the Vercel production environment. Leave optional action variables unset until the integration is ready.
5. In Supabase Auth, allow the exact callback `https://jourvis.ai/account/confirm`. Add explicit localhost or preview callbacks only when needed. Do not use unrestricted production redirect wildcards.
6. Keep Vercel Git deployment disabled. Vercel's Root Directory must be blank (the repository root), not `frontend`. The root `vercel.json` specifies Next.js, root install/build commands and preserved V1 generation. The old static `outputDirectory` override must not remain in project settings.
7. The user runs the deployment command above, verifies their email at `/account`, then chooses Marinara. Table QR ordering stays paused until deliberately opened in Settings.

## Rollback

Before first activation, record the current production deployment ID and Vercel project settings. The pre-V2 production deployment observed during preparation was `5h8Enaywyf3F4CPvaoKcKPo5gp8Y` (`jourvis-ab08gxndi-jour.vercel.app`); its project Root Directory was `frontend`, framework `Other`, Node `24.x`, with output/build/install overrides disabled. Application rollback is re-promoting that previous deployment. To rebuild the previous main commit instead, restore Root Directory to `frontend` first. V1 remains preserved under `frontend`; generated routes keep their runtime assets separate from Next.js assets.

For an operational pause, turn Jourvis to sleeping, pause QR ordering and disable only the new worker grant. Disable only the new Command Center n8n workflow if it was enabled. Retain uncertain delivery records for reconciliation. Existing Messenger workflows, Page routes, credentials and website conversation engine do not change.

Do not drop the schema to roll back. Retaining V2 orders, receipts and audit data avoids destructive data loss; older application deployments do not reference these additive tables.

## Validation and limits

### Prepared on 2026-09-19

- The additive `20260919133708_command_center_v2` migration and deterministic seed were applied to the existing project. Verification found exactly 12 dishes, no missing recipes, balanced stock movements, sleeping automation, paused QR ordering and no enabled external integrations. The three pre-existing businesses remain unchanged.
- One initial owner invitation was prepared for the specifically requested email, expiring after 30 days. No user was pre-verified and no membership was granted ahead of email verification.
- Production Vercel public Supabase connection variables and the exact `https://jourvis.ai/account/confirm` authentication callback were added. Vercel Root Directory was changed from `frontend` to the repository root for the next manual deployment. No deployment was triggered.
- The live anonymous Data API successfully returned the sanitized 12-item menu. Supabase's security advisor reports only informational no-policy notices for the deliberately inaccessible private tables; no V2 warning/error findings.
- Local tests cover the actual SQL, the action transport, gateway code and redirect/origin validation. Browser checks covered a real isolated QR order through acceptance, preparation, readiness and completion; owner mobile navigation; 390px restaurant layout; the preserved Jourvis launcher; and V1/home/privacy navigation.
- The new root dependency audit reports zero known advisories. The preserved V1 build toolchain reports 11 existing advisories (8 high, 2 moderate, 1 low), including vinext and its build dependencies. V1 is statically exported here; its old server is not deployed. Updating that toolchain needs a separate compatibility pass. Do not treat the passing application tests as resolution of these advisories.
- Supplier external delivery remains disabled until the new gateway is imported, its existing Gmail integration verified, and its scoped worker configured. No supplier emails, auth emails or provider tests were sent by this task.
- **Email sign-in readiness:** Custom SMTP is not configured. Supabase's default email service restricts delivery to project team members and is insufficient for supplier onboarding. Configure an authorized SMTP provider before public onboarding; do not disable email verification or add suppliers as project administrators to work around this. See [Supabase's SMTP requirements](https://supabase.com/docs/guides/auth/auth-smtp).

The migration directory in this repository contains only the new Command Center migration; the existing platform migrations live in the original backend repository. Do not use a blanket `db push` against this shared project from a fresh frontend clone. Verify migration history and apply only the reviewed additive migration when preparing another environment.

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm --prefix frontend run typecheck`, `npm --prefix frontend run test:frontend`, `npm --prefix frontend run check:policies`, and `npm run build`.

Database tests execute the actual migration and deterministic seed in isolated PGlite, including role grants, membership isolation, public order validation, stock transitions, quote permissions, authority ceilings, receiving and external-action recovery. They do not establish multi-connection PostgreSQL concurrency or production Realtime delivery. Browser checks use the isolated fixture and must be described as local checks. Live email verification, production Realtime and provider delivery require separate verification after configuration; do not infer them from a passing local build.

Reference behavior: [n8n Webhook authentication](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) and [Execute Sub-workflow completion](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/).
