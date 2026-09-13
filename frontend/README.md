# Jourvis website

The React/Vinext homepage at https://jourvis.ai uses the actual Jourvis V2 conversation engine and 20 published sample businesses. Editorial examples in the lower sections remain illustrations. The hero, three numbered sections, closing message and existing particle anchors/animations are preserved.

## Run and verify

Requires Node 22.13 or later. Run `npm ci`, then `npm run dev`. Before publishing run `npm run typecheck`, `npm run lint:jourvis`, `npm run test:frontend`, `npm run check:policies`, and `npm run build`.

Vercel uses `frontend` as its root, `npm run build`, and `dist/client` as its static output. `vercel.json` provides extensionless policy routes. Commits to main publish the connected Jourvis project, including jourvis.ai and jourvis.vercel.app. No provider secrets belong in this repository.

## Live demo

`public/jourvis-demo.json` contains the single public runtime origin. Update that value and deploy if the temporary V2 tunnel changes. The client accepts HTTPS Cloudflare quick tunnels and `api.jourvis.ai`; the latter requires separate verified infrastructure configuration. Local/preview origins are deliberately not allowed by the production runtime.

The runtime exposes a separate `web_chat` / `jourvis.ai` channel. It loads existing published business presets, uses deterministic understanding first and direct optional Groq second, and invokes n8n only for external actions. It does not reuse Messenger customer identities or alter Page routing. The runtime repository documents its private database function, binding, deployment and rollback in `docs/WEBSITE_DEMO_CHANNEL.md`.

Visitors explicitly start the demo. A signed anonymous token lasts up to 24 hours and is kept in tab session storage; conversation text stays in browser memory. Refresh recovers the latest prepared reply, not a full transcript. Closing the tab can lose access to the anonymous conversation and never cancels an appointment. The privacy/deletion pages explain recovery through support. There are no website push reminders.

Retries retain the original message ID, recover its durable receipt and acknowledge the exact reply before allowing another message. Expired choice buttons become a safe resume/help action. A real test Calendar invitation is possible only after the existing email and explicit confirmation gates. The initial notice explains this. The picture control sends only a boolean—no image, URL or file is uploaded.

## Design and guidance

The conversation sits beside a notebook of explicit gathered facts. It excludes contact details and medical intake, and only shows a confirmed appointment when the database reports that status. Visitors can collapse the notebook or copy their summary. The guide can bring them back to gathered details while exploring other sections; it does not send messages on their behalf.

The existing WebGL particle field, Canvas fallback, static companion, motion pause, reduced-motion handling and section order remain. New notebook/companion animations respect the same controls. Phone layouts stack the conversation and notebook.

## Main files

| File | Responsibility |
| --- | --- |
| `components/jourvis/InteractiveDemo.tsx` | Live conversation, choices, recovery, notebook and confirmation notice |
| `lib/jourvis/live-demo.ts` | Session, endpoint configuration and authenticated transport |
| `public/jourvis-demo.json` | Public runtime origin; no credentials |
| `components/jourvis/PageGuide.tsx` | Contextual guidance and return-to-conversation navigation |
| `app/live-demo.css` | Responsive live conversation and notebook design |
| `components/jourvis/JourvisExperience.tsx` | Existing page composition and character state |
| `components/jourvis/ParticleWorld.tsx` | Existing particle animation and anchors |
| `lib/jourvis/scenarios.ts` | Illustrative lower-section examples only |

## Policies and checks

Root `privacy.html` and `data-deletion.html` are authoritative. Run `npm run sync:policies` after editing them; the generated React routes are committed. Ordinary anchors preserve navigation in the static export.

Frontend tests cover existing illustration state and the live transport's retry identity, acknowledgement, connection refresh, pending replies and expired-session cleanup. Runtime tests separately cover authentication, Page isolation, all 20 native adapter conversations, database persistence and mock Calendar confirmation gates. Live provider tests require explicit authorization.

Legacy `test:browser` and `test:guide` scripts contain assertions for the former scripted demo. Do not interpret those scenarios as tests of this live channel; verify the new start, business selection, choices, typed reply, notebook, recovery and responsive layout directly. Existing policy-navigation checks remain applicable. The broad inherited lint includes unrelated vendored component findings; `lint:jourvis` scopes the maintained frontend.
