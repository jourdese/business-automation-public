# Header logo image recovery

The reported production screenshot showed the browser's broken-image icon in the
header. On inspection the original SVG URL returned HTTP 200 with image/svg+xml;
the exact cause of that user's earlier request failure was not reproduced by the
HTTP check. Do not describe it as a confirmed missing upload or invalid SVG.

The header now uses the supplied matching transparent PNG, with the supplied SVG
as a fallback. Both source assets remain unchanged. Photo checks an already-failed
DOM image on mount as well as handling later error events: the original component
could miss an image failure before React hydrated the exported HTML. Duplicate
error observations advance once; failed URLs are never retried in a loop. If both
formats fail, accessible brand text is rendered instead of a broken native image.

The new `frontend/scripts/wild-tree-image-qa.mjs` serves `dist/client` on loopback
and exercises the exported `/restaurant/the-wild-tree` page. It checks normal
images, desktop/mobile logo visibility, the meal planner, JavaScript-disabled
rendering, a forced PNG failure before hydration, SVG recovery, and total failure
without a retry loop. Screenshots and qa.json are uploaded with browser QA.
Read the actual CI result for success/failure rather than treating this test
coverage description as proof of a passing run.

This patch does not change restaurant data, CSS, booking, chat enablement, routes,
Rib Crib source, or Vercel deployment settings. Deployment remains local/manual.
