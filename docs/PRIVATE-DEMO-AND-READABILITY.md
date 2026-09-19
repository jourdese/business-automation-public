# Marinara owner access and private practice

Marinara's main Command Center belongs to its invited owners and staff. The requested initial owner is bound to the verified Supabase account for `jourpalacio@gmail.com`. A public restaurant URL, sign-in, or demo request cannot grant that membership.

## What a visitor does

1. Open `/account` and enter their own email address. Once auth email delivery is enabled, that address receives a real sign-in link. Verify it in the same browser.
2. `/command-center` shows invited businesses first. Marinara's owners use their Marinara workspace. An optional **Create my seven-day demo** card is available to other verified visitors as well.
3. Creating a demo explicitly makes one private copy of the immutable Marinara sample catalog: 12 photographed dishes, 38 ingredients, six fictional suppliers, seven preceding days of mock history plus today's sample queue. It does not copy another business's operational records.
4. Open **Try ordering as a customer** in the same signed-in browser. Submit a test order, then accept, prepare, mark ready and complete it in Orders. Recipe reservations, consumption and completed-order sales use the real Command Center database logic, inside the private workspace.
5. In Purchasing, review the sample basil request. Select **Simulate supplier quote**, review and approve its terms, then **Simulate supplier confirmation**. Record a partial or complete mock delivery. The conversation is explicitly marked simulated.
6. Try Watch, Contact or Buy modes in Settings. Private Contact and Buy modes use the same rule thresholds and approvals but simulated correspondence. They do not connect a supplier, spend money, call n8n, or email anyone.
7. Return with the same account to resume. Access expires exactly seven days after creation; repeat clicks and refreshes do not extend it or allocate another workspace. The expiry appears in the chooser and workspace. Invited business access is unaffected.

The only real email in this practice flow is the visitor's requested sign-in link. There is no demo supplier email, automatic invitation, or optional live test-email button. Supplier registration and invited business operations remain separate flows.

## Boundaries and limits

- Verified `auth.users` identity and current DB membership are checked server-side. Private workspaces additionally require the original demo owner and unexpired access, including public-looking menu, QR, receipt and realtime paths.
- One workspace per account is enforced by a unique owner field and a transactional user-row lock. Allocation is all-or-nothing. New trial orders and manual purchases are limited to 100 each; idempotent retries remain valid.
- All private supplier records are fictional and separately allocated. Invitations, real supplier links, grants and external jobs are rejected. `integrations_ready` cannot be enabled on a private demo, even by accidental administrative configuration.
- Simulated supplier correspondence has its own table and per-purchase/version deduplication; it is never recorded as a real Meta/Gmail/provider delivery receipt.
- Expiry denies access; it does **not** claim immediate deletion. Expired records remain for administrative cleanup under an approved retention process. This release does not silently delete business records, schedule a purge, or recreate expired trials.

## Deployment order

The additive `20260919172559_command_center_private_demo.sql` migration is required before deploying this branch. It is tested with isolated PGlite databases; it has not been applied to live Supabase as part of this follow-up. It adds private-demo fields, constraints and guards, a simulated-message table and checked RPC handling. Existing schema/data are not reset.

The two staged COMMANDCENTER n8n workflows remain unpublished. Sign-in emails still require the matching server configuration, scoped auth-mail grant, working public n8n endpoint and post-deployment Supabase Send Email Hook setup described in [AUTH-EMAIL-N8N.md](AUTH-EMAIL-N8N.md). Saving an n8n credential alone does not enable email delivery. No provider messages were sent during verification.

The user remains the final production approver. No merge to `main`, Vercel deployment, workflow publication or live demo allocation is performed by this follow-up.

## Readability target and verification

The design targets relevant [WCAG 2.2 AA criteria](https://www.w3.org/WAI/WCAG22/quickref/), with particular attention to [text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [200% text resizing](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [320 CSS-pixel reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), keyboard focus and target size.

- Normal text: at least 4.5:1 contrast; large text: at least 3:1. Green owner surfaces and cream/terracotta restaurant surfaces retain their character with darker supporting text.
- Supporting text and controls are at least `1rem` (16px with the default root); base body copy is `1.125rem` (18px). Font sizes use relative units. WCAG does not itself prescribe a universal 16px minimum; this is our readability choice.
- Buttons and key controls use a 44px minimum target. Labels, status words and units remain visible; color is not the sole signal.
- Tables may scroll inside their own region. Ordinary content reflows; the closed mobile navigation is hidden from keyboard focus. Graph date labels are HTML text so shrinking an SVG does not shrink the labels.
- Jourvis's lower-right launcher retains its shape, position and animations. Only its tooltip text grows. Reduced-motion handling remains available.

Local browser checks cover public Marinara, account/chooser, owner overview, purchasing and its quote dialog at desktop and narrow widths, plus isolated demo creation and supplier quote/approval/confirmation. Computed text/contrast checks and keyboard/text-resize checks are recorded with the PR. This is not a claim of a complete independent accessibility certification; screen-reader and real-device acceptance testing remain part of release review.

Recorded local checks (September 20, 2026):

| Check                                                                                      | Result                                                                                                   |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Public Marinara and owner chooser at 320 CSS px                                            | No page-level horizontal overflow; readable text and controls                                            |
| Owner Overview, Orders, Menu, Inventory, Purchasing, Reports and Settings at desktop width | No failures in the computed text-size/contrast scan                                                      |
| Owner sections and menu edit form with a temporary 200% root text size                     | No page-level horizontal overflow or clipped availability labels after fixes                             |
| Public Marinara with 200% text                                                             | All text remains relative-sized; no page-level horizontal overflow                                       |
| Basket and menu-edit dialogs                                                               | Escape dismisses and returns focus to the opening button; visible text passes the computed contrast scan |
| Private demo creation and simulated purchasing                                             | Local browser flow succeeds; no provider calls                                                           |
| Database/application checks                                                                | 31 tests pass, including expired access, leaked tokens, full quotas and idempotent retries               |

Computed scans check rendered text against composed solid backgrounds. The three restaurant elements with photo/gradient backgrounds were reviewed visually; this is not a substitute for a complete accessibility audit. Temporary text-size rules were removed after verification.

For local private-menu verification, start the disposable fixture with `$env:CC_FIXTURE_PRIVATE_DEMO='1'; node scripts/local-fixture.mjs`. The synthetic fixture identity is only available in local development and is rejected on Vercel/production. Never set fixture variables in production.
