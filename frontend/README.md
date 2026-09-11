# Jourvis — the living bitfield

A working React frontend, built in the existing Vinext/Vite application. The homepage combines editorial HTML with one persistent WebGL particle field and a small pixel companion. No backend, credentials, authentication, databases or automation workflows were added.

## Run

Requires Node 22.13 or later and npm. The existing package lock and dependencies are preserved.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vinext (normally http://localhost:3000).

```sh
npm run build
npm run typecheck
npm run lint:jourvis
npm run test:frontend
```

The production build exports static HTML/assets to `dist/client`. A static host should serve extensionless policy routes from their matching HTML files. The inherited `npm start` command targets a Worker build; use `npm run dev` for local development, or serve the static export for production.

## GitHub and Vercel

The React source belongs in [`frontend/` in jourdese/business-automation-public](https://github.com/jourdese/business-automation-public/tree/main/frontend). The original root-level policy website remains in place for the existing Meta policy URLs.

The Jourvis Vercel project uses `frontend` as its root directory, the Other framework preset, `npm ci`, `npm run build`, and `dist/client` as its output. These build settings and extensionless routes are declared in `vercel.json`. The production address is https://jourvis.ai, including `/privacy` and `/data-deletion`. `www.jourvis.ai` redirects to the apex domain. The existing `jourvis.vercel.app` deployment alias remains available.

No environment secrets are required. The optional Sites development plugin runs only when a local `.openai/hosting.json` exists and the build is outside Vercel; that local hosting file is excluded from the published GitHub source. Vercel deployment does not depend on it. Commits to `main` containing frontend changes trigger the connected Jourvis deployment.

## Public policy maintenance

The root `privacy.html` and `data-deletion.html` are the authoritative published policy text. After editing them, run `npm run sync:policies` from `frontend/` to update the React routes, then `npm run check:policies` to verify parity. The generated routes are checked in so the Vercel build is self-contained.

Site navigation uses ordinary browser links for the static export. This fixes the client-router exception that previously made policy links appear unresponsive. Run `npm run test:policy-navigation` after a build to verify actual clicks, keyboard access, policy cross-links, refresh, mobile layouts and exact policy text against the root documents. It starts a temporary local static server; set `FRONTEND_URL` to test a deployed host instead. It uses the same `PLAYWRIGHT_MODULE` and `CHROME_PATH` settings as the main browser suite.

## The experience

- A spacious hero introduces Jourvis as an AI business assistant. The wordmark and HTML remain visible while graphics initialize.
- General business / Dental clinic presets contain three deterministic examples: question, appointment and human handoff. Changing a preset resets its conversation, result, slot and pending timer.
- Appointment times can be selected and changed. Summaries are always labeled previews. No message, booking, calendar invitation or staff notification is sent.
- Three editorial outcome rows provide their own small, keyboard-operable demonstrations.
- FAQ, header links, closing CTA, replay and reset are functional. The closing CTA scrolls and focuses the actual demo.
- Privacy and data-deletion routes and their existing policy text are retained.

## Design and guide review

The design branch keeps the hero → demo → outcomes → principles/FAQ → closing sequence, the existing text/visual placement, and all three particle anchors. The first design pass refines hero copy and spacing, the demo frame and conversation bubbles, appointment summaries, and heading sizes. The same pixel silhouette appears in the guide, conversation avatar, favicon and social preview.

`PageGuide.tsx` provides a persistent, compact companion when the large character is outside the viewport. Its panel opens only on request, describes the current section, and offers navigation with focus management. It follows demo state without accepting free text, calling an AI service or storing visitor information. Escape closes it and returns focus; pointer clicks outside dismiss it. The guide remains usable with reduced motion and graphics disabled. The original character animation has smaller eye/body offsets and a restrained organizing gesture.

Review locally with `npm run dev -- --port 3001`. Run `npm run test:guide` with the same browser environment settings as the other QA scripts. Production publication requires the user's review and merge approval; local completion is not deployment.

## Important files

| File | Responsibility |
| --- | --- |
| `app/page.tsx` | Homepage route |
| `app/layout.tsx` | Shared HTML shell, metadata and server-rendered palette tokens |
| `app/globals.css` | Editorial design, responsive layout, focus and reduced-motion styling |
| `components/jourvis/JourvisExperience.tsx` | Page composition and explicit companion state machine |
| `components/jourvis/InteractiveDemo.tsx` | Accessible controls, deterministic conversation and preview results |
| `components/jourvis/PageGuide.tsx` | Contextual page guidance, scroll navigation and accessible panel |
| `components/jourvis/CompanionMark.tsx` | Shared small character silhouette |
| `app/refinements.css` | Scoped design refinement and guide presentation |
| `components/jourvis/ParticleWorld.tsx` | One animation clock, cached layout anchors, springs, pointer/focus behavior |
| `lib/jourvis/renderer.ts` | Batched WebGL square points and Canvas 2D fallback |
| `lib/jourvis/scenarios.ts` | Fictional business fixtures and guarded demo reducer |
| `lib/jourvis/config.ts` | Palette, motion budget, companion states and contact destinations |
| `components/jourvis/OutcomeSections.tsx` | Interactive editorial outcomes |
| `components/jourvis/PrinciplesSection.tsx` | Operating principles and expandable FAQ |
| `components/jourvis/SiteChrome.tsx` | Shared navigation and footer |

## Graphics and accessibility

The companion has explicit idle, curious, listening, organizing, completed and handoff states. Processing unfolds part of the constellation; completion briefly introduces gold. A measured, text-free rail carries particles between the conversation and its outcome.

The renderer batches square particles into one WebGL draw call. Canvas 2D is used if WebGL is unavailable or its context is lost; a static SVG companion remains if neither renderer initializes. High-frequency positions stay outside React. Layout is measured through resize observers and resize/focus events, never repeatedly inside the animation loop.

Initial ambient budgets are 560 desktop / 200 phone particles, plus the compact companion; device pixel ratio is capped at 1.5. Animation pauses in hidden tabs. Reduced-motion preference disables the pointer wake and continuously running animation; the manual motion control also stops the clock. No custom cursor, sound, camera, microphone or scroll interception is used.

Explicit diagnostic modes are available at `/?graphics=canvas` and `/?graphics=off`. With no graphics, the entire interface and local demo remain usable.

## Contact configuration

`siteConfig` in `lib/jourvis/config.ts` contains the user-supplied Jourvis Facebook Page URL and support email. The Facebook action is separate from the local preview and opens a new tab. Set `messengerUrl` to an empty string to hide it. No provider credentials are needed.

## Validation

Verified in local headless Chrome:

- Both presets, all six task combinations, replay, reset and rapid preset changes.
- Selecting and changing an appointment time; handoff summary and explicit no-send labels.
- All editorial controls, FAQ, hero and closing CTA focus behavior.
- Desktop 1440px, tablet 768px, phone 390px and narrow 320px layouts with no horizontal overflow.
- Keyboard skip link, task navigation, time selection and FAQ operation.
- 200% text enlargement at desktop width.
- Reduced motion, manual clock pause, forced graphics initialization failure, Canvas fallback and actual WebGL context loss.
- Policy routes, no browser page errors, and no external service requests during the demo.

Four reducer/state regression tests cover stale completions, valid slot selection, reset/replay isolation and contextual companion transitions. Type checking, frontend-scoped lint and the production build pass.

The inherited repository-wide `npm run lint` reports existing findings in unused vendored `components/ui` and `hooks/use-mobile.ts`. These unrelated components were not rewritten. No Lighthouse score, frame-rate guarantee, physical-device Safari test or assistive-technology certification is claimed.

Browser automation is in `scripts/frontend-qa.mjs` and `scripts/frontend-accessibility-qa.mjs`. They use an available Playwright installation without adding a production dependency. Set `PLAYWRIGHT_MODULE` to the module entry-file path and `CHROME_PATH` to a Chrome executable if needed. `FRONTEND_URL` selects the target for the main suite. Screenshots and raw QA results are generated under ignored `outputs/`.
