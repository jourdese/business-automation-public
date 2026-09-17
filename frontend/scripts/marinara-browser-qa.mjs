import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const base = process.env.FRONTEND_URL || 'http://127.0.0.1:4173';
const output = 'outputs/marinara';
const storageKey = 'marinara.meal-plan.v1:/restaurant/marinara-ristorante';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [], external = [], checks = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => { const url = new URL(request.url()); if (url.protocol.startsWith('http') && url.origin !== new URL(base).origin) external.push(request.url()); });

async function subtotal(value) {
  await page.waitForFunction((expected) => Number(document.querySelector('[data-testid="marinara-subtotal"]')?.textContent?.replace(/[^0-9.]/g, '')) === Number(expected), value);
}
async function imagesReady() {
  await page.locator('[data-marinara] img').evaluateAll((images) => { for (const image of images) image.loading = 'eager'; });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('[data-marinara] img')).every((image) => image.complete && image.naturalWidth > 0));
}

try {
  const response = await page.goto(`${base}/preview/marinara-ristorante`, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  await page.locator('[data-marinara="true"]').waitFor();
  await page.evaluate((key) => sessionStorage.removeItem(key), storageKey);
  await page.reload({ waitUntil: 'networkidle' });
  assert.match(await page.locator('h1').innerText(), /little theatre/i);
  assert.equal(await page.locator('body > .site-header').isVisible(), false);
  await imagesReady();
  assert.equal(await page.locator('[aria-label="Marinara food gallery"] figure').count(), 28);
  checks.push('Preview renders the bespoke Marinara layout and all 28 supplied food images');

  const search = page.getByRole('searchbox', { name: 'Search Marinara menu' });
  await search.fill('quattro formaggi');
  await page.waitForFunction(() => document.querySelectorAll('[data-dish-id]').length === 2);
  await page.getByRole('button', { name: /Add Quattro Formaggi Pizza \(12-inch\)/ }).click();
  await subtotal(680);
  checks.push('Menu searches variants and meal planning uses Marinara catalog prices');

  await page.getByRole('button', { name: /Clear meal plan/i }).click();
  await subtotal(0);
  await page.getByRole('button', { name: 'Try a sample dinner' }).click();
  await subtotal(2460);
  checks.push('Sample dinner totals PHP 2,460 using four Marinara selections');

  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  await page.getByLabel('Visit date', { exact: true }).fill(date);
  await page.getByLabel('Visit time', { exact: true }).fill('19:30');
  await page.getByLabel('Number of guests', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Prepare enquiry', exact: true }).click();
  assert.match(await page.locator('#marinara-enquiry').inputValue(), /4 people/);
  assert.match(await page.locator('#marinara-enquiry').inputValue(), /7:30 PM/);
  checks.push('Table controls transfer a validated Philippine-time enquiry draft without booking');

  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `horizontal overflow at ${width}`);
    await page.screenshot({ path: `${output}/marinara-${width}.png`, fullPage: true, animations: 'disabled' });
  }
  checks.push('Responsive layouts render without horizontal document overflow from 320 to 1440px');

  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  checks.push('No browser runtime errors and no external requests during the preview session');
  console.log(JSON.stringify({ status: 'passed', checks, errors, external }, null, 2));
} finally {
  fs.writeFileSync(`${output}/qa.json`, JSON.stringify({ checks, errors, external }, null, 2));
  await browser.close();
}
