# V2 QA report

Date: 2026-09-16. Review target: `/restaurant/the-rib-crib` on `restaurant/the-rib-crib-v2`.

## What was actually tested

The new TypeScript/TSX source was transpiled locally and rendered in Chromium with the real supplied image bytes. The offline component harness uses preinstalled **React 18.2**, not the project's React 19.2.6 / Vinext runtime. Browser storage and chat transport were explicit test fixtures; fixture responses are labeled. No live restaurant request, database write or Vercel deployment was made.

- **7/7 pure helper tests passed** with Node's TypeScript stripping.
- **14 referenced modules transpiled with zero syntactic diagnostics.** This is not a semantic TypeScript check.
- **39 browser assertions passed** in the offline component harness.
- Actual rendered component screenshots captured at mobile and desktop sizes; this is not a generated website mockup or a deployed URL.

## Browser checks

1. Actual V2 components mounted in offline React 18.2 test harness
2. No demo network initialization on page load
3. No page horizontal overflow at 320px
4. One visible H1 at 320px
5. No page horizontal overflow at 390px
6. One visible H1 at 390px
7. No page horizontal overflow at 768px
8. One visible H1 at 768px
9. No page horizontal overflow at 1024px
10. One visible H1 at 1024px
11. No page horizontal overflow at 1440px
12. One visible H1 at 1440px
13. No page horizontal overflow at 1920px
14. One visible H1 at 1920px
15. Eight initial featured dishes
16. Drinks filter
17. Useful empty search state
18. Reset restores all dishes
19. Dish details open native dialog
20. Escape returns focus to dish trigger
21. Meal shortlist opens
22. Unpriced items explicitly excluded from confirmed subtotal
23. Quantity change updates subtotal
24. Shortlist stored under restaurant scope
25. All five platters selectable with correctly changing detail/photo
26. Reservation opens one existing chat in The Rib Crib preset
27. Reservation remains a draft until the user sends
28. Reservation draft includes 12-hour Philippine time
29. Exactly one session initialization
30. Choice ID preserved in transport request
31. Failed turn retry retains message ID
32. Reopening chat does not create a competing session or greeting
33. All mounted image assets decoded
34. Mobile navigation and Escape focus handling
35. Reduced motion disables continuous component animation
36. No horizontal overflow at 200% CSS zoom
37. No JavaScript page errors
38. Unavailable engine never displays a loaded or online status
39. Unavailable engine prevents sending

## Issues found and corrected during review

The mobile menu's Escape handling originally only covered navigation descendants; it now also handles the opener in the header. Menu add actions were made 44px high and moved below the price to reduce conflicts with the fixed assistant. Platter selection tests use the exact item/index rather than a partial-name match that confused the first two platters. The supplied wood texture was added deliberately to the sharing section. All mounted images decoded, and the zero-results search state and unknown-price subtotal were checked.

## Important unverified items

A full application checkout/dependency installation was not possible: container networking could not resolve GitHub/npm, and local HTTP navigation is restricted here. Therefore the existing project lint, semantic typecheck, complete frontend suite, Vinext production build, full-app homepage regression and live-engine end-to-end tests were **not run**. No claim is made that those checks pass. The 200% check uses CSS zoom, not native browser zoom. Automated contrast/screen-reader audits were not performed. The fixed dock and shortlist are separated from each other; as with any floating UI, the page can scroll behind them.

The implementation does not change the homepage source, shared character/palette, route resolver, conversation transport or Vercel configuration. This is a source-scope check, not a substitute for rendering the entire real application.

## Run in the real local project before production

From the `frontend` directory:

```sh
npm run lint:jourvis
npm run typecheck
npm run test:frontend
node --experimental-strip-types --test scripts/rib-crib-v2.test.ts
npm run build
npm run dev
```

Then open the dev server's printed origin at `/restaurant/the-rib-crib`. Verify the live demo backend is reachable and its current business preset matches The Rib Crib. Check the homepage and another business route, keyboard/touch navigation, representative viewport widths, native browser zoom, current menu facts and asset loading in the actual Vinext build. Do not deploy until approved.
