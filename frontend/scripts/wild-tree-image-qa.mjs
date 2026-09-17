// Exercise the exported production files, not the Vite development asset server.
// This server binds to loopback and never deploys or calls the conversation engine.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = resolve('dist/client');
const output = 'outputs/wild-tree/images';
const path = '/restaurant/the-wild-tree';
const logoSelector = '[data-wild-tree] > header a[aria-label="The Wild Tree, back to top"]';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.rsc': 'text/x-component', '.woff2': 'font/woff2' };
await mkdir(output, { recursive: true });
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    for (const candidate of [file, `${file}.html`, resolve(file, 'index.html')]) {
      if ((await stat(candidate).catch(() => null))?.isFile()) {
        response.writeHead(200, { 'Content-Type': mime[extname(candidate)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        response.end(await readFile(candidate)); return;
      }
    }
    response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain' }).end('Bad request');
  }
});
await new Promise((yes, no) => { server.once('error', no); server.listen(0, '127.0.0.1', yes); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
const checks = [];
const errors = [];
const contexts = [];
let status = 'failed';
async function newPage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block', ...options });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  return page;
}
async function loadedLogo(page, extension) {
  await page.waitForFunction(({ selector, extension }) => {
    const image = document.querySelector(`${selector} img`);
    return image?.complete && image.naturalWidth > 0 && new URL(image.currentSrc).pathname.endsWith(extension);
  }, { selector: logoSelector, extension });
}
try {
  const page = await newPage();
  const response = await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200, 'Production export must contain the database-approved Wild Tree route.');
  await loadedLogo(page, '.png');
  await page.locator('[data-wild-tree] img').evaluateAll(images => { for (const image of images) image.loading = 'eager'; });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('[data-wild-tree] img')).every(image => image.complete && image.naturalWidth > 0));
  assert.equal(await page.locator('[data-wild-tree] span[role="img"]').count(), 0, 'Normal production images must load rather than show text fallbacks.');
  checks.push('Exported production page loads the supplied PNG header logo and all initially rendered images.');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await loadedLogo(page, '.png');
    const box = await page.locator(`${logoSelector} img`).boundingBox();
    assert.ok(box && box.width > 50 && box.height > 20 && box.x >= 0 && box.x + box.width <= width, `Logo should be visible at ${width}px.`);
    await page.screenshot({ path: `${output}/production-${width}.png`, animations: 'disabled' });
  }
  checks.push('Header logo is visible in desktop and mobile production screenshots.');
  await page.getByRole('button', { name: 'Try a sample meal plan', exact: true }).click();
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="wild-tree-subtotal"]')?.textContent.replace(/[^0-9.]/g, '')) === 1750);
  checks.push('The production build hydrates and the sample meal planner still totals PHP 1,750.');

  const noJS = await newPage({ javaScriptEnabled: false });
  assert.equal((await noJS.goto(`${base}${path}`, { waitUntil: 'load' })).status(), 200);
  await loadedLogo(noJS, '.png');
  checks.push('The header PNG also loads with JavaScript disabled.');

  // Delay application scripts until the initial logo request has already failed.
  const earlyFailure = await newPage();
  let release;
  const gate = new Promise(resolveGate => { release = resolveGate; });
  await earlyFailure.route('**/*', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (/wild-tree-logo-reference-matched\.[^/]+\.png$/.test(pathname)) {
      await route.fulfill({ status: 404, contentType: 'text/plain', body: 'Intentional image failure' }); return;
    }
    if (pathname.endsWith('.js')) await gate;
    await route.continue();
  });
  try {
    await earlyFailure.goto(`${base}${path}`, { waitUntil: 'commit' });
    await earlyFailure.waitForFunction(selector => {
      const image = document.querySelector(`${selector} img`);
      return image?.complete && image.naturalWidth === 0;
    }, logoSelector);
    assert.equal(await earlyFailure.evaluate(() => sessionStorage.getItem('wildtree.meal-plan.v1:/restaurant/the-wild-tree')), null, 'Application hydration must still be blocked.');
  } finally { release(); }
  await loadedLogo(earlyFailure, '.svg');
  await earlyFailure.screenshot({ path: `${output}/png-failure-svg-recovery.png`, animations: 'disabled' });
  checks.push('A PNG failure before hydration recovers to the supplied SVG rather than leaving a broken-image icon.');

  const bothFail = await newPage();
  const attempts = [];
  await bothFail.route('**/*', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (/wild-tree-logo-reference-matched\.[^/]+\.(png|svg)$/.test(pathname)) {
      attempts.push(pathname);
      await route.fulfill({ status: 404, contentType: 'text/plain', body: 'Intentional image failure' }); return;
    }
    await route.continue();
  });
  await bothFail.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  await bothFail.locator(`${logoSelector} span[role="img"]`).waitFor();
  assert.equal(await bothFail.locator(`${logoSelector} img`).count(), 0);
  assert.equal(await bothFail.locator(`${logoSelector} span[role="img"]`).getAttribute('aria-label'), 'The Wild Tree');
  const count = attempts.length;
  assert.ok(count >= 2 && count <= 4, 'At most the primary, fallback and preload requests are allowed.');
  await bothFail.waitForTimeout(500);
  assert.equal(attempts.length, count, 'Failed image sources must not be retried in a loop.');
  checks.push('When both sources fail, an accessible brand label replaces the image without a retry loop.');
  assert.deepEqual(errors, [], 'No production browser runtime errors.');
  status = 'passed';
} finally {
  await writeFile(`${output}/qa.json`, JSON.stringify({ status, checks, errors }, null, 2));
  console.log(JSON.stringify({ status, checks, errors }, null, 2));
  for (const context of contexts) await context.close();
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
