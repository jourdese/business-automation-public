import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const base = process.env.FRONTEND_URL || 'http://127.0.0.1:4173';
const output = 'outputs/wild-tree';
const storageKey = 'wildtree.meal-plan.v1:/restaurant/the-wild-tree';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
const checks = [], errors = [], external = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => {
  const url = new URL(request.url());
  if (url.protocol.startsWith('http') && url.origin !== new URL(base).origin) external.push(request.url());
});
async function subtotal(value) {
  await page.waitForFunction(expected => {
    const text = document.querySelector('[data-testid="wild-tree-subtotal"]')?.textContent;
    return text !== undefined && text !== null && Number(text.replace(/[^0-9.]/g, '')) === Number(expected);
  }, value);
}
async function imagesReady() {
  await page.locator('[data-wild-tree] img').evaluateAll(images => {
    for (const image of images) image.loading = 'eager';
  });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('[data-wild-tree] img')).every(image => image.complete && image.naturalWidth > 0));
}
try {
  const response = await page.goto(`${base}/preview/the-wild-tree`, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  await page.locator('[data-wild-tree="true"]').waitFor();
  await page.waitForFunction(key => sessionStorage.getItem(key) !== null, storageKey);
  assert.match(await page.locator('h1').innerText(), /Thai soul\.\s*Filipino heart\./);
  assert.equal(await page.locator('body > .site-header').isVisible(), false);
  assert.match(await page.locator('#wild-tree-jourvis').innerText(), /Live Jourvis chat is not connected yet/);
  await imagesReady();
  checks.push('Local preview renders supplied assets, distinct hero and explicit draft-runtime notice');

  const search = page.getByRole('searchbox', { name: 'Search dishes by name or alias' });
  await search.fill('PADTHAI');
  await page.waitForFunction(() => document.querySelectorAll('[data-dish-id]').length === 1);
  assert.equal(await page.locator('[data-dish-id]').getAttribute('data-dish-id'), 'pad_thai');
  await page.getByRole('button', { name: 'Add Pad Thai to meal plan', exact: true }).click();
  await subtotal(455);
  await page.getByRole('button', { name: 'Increase Pad Thai quantity', exact: true }).click();
  await subtotal(910);
  await page.getByRole('button', { name: 'Decrease Pad Thai quantity', exact: true }).click();
  await subtotal(455);
  await page.reload({ waitUntil: 'networkidle' });
  await subtotal(455);
  await page.getByRole('button', { name: 'Remove Pad Thai', exact: true }).click();
  await subtotal(0);
  checks.push('Menu alias search, add/increase/decrease/remove and session persistence work');

  await page.getByRole('button', { name: 'Try a sample meal plan', exact: true }).click();
  await subtotal(1750);
  await page.getByRole('button', { name: 'Discuss this plan with Jourvis', exact: true }).click();
  assert.match(await page.locator('#wild-tree-enquiry').inputValue(), /Pad Thai/);
  assert.match(await page.locator('#wild-tree-enquiry').inputValue(), /fictional demo values/);
  assert.equal(await page.locator('#wild-tree-plan').getByText('Unverified', { exact: true }).count(), 1);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copiedEnquiry = text; } } }));
  await page.getByRole('button', { name: 'Copy enquiry', exact: true }).click();
  await page.waitForFunction(() => typeof window.__copiedEnquiry === 'string');
  assert.match(await page.evaluate(() => window.__copiedEnquiry), /not submit an order/);
  checks.push('Sample subtotal is PHP 1,750; fees are not invented; copying a draft sends nothing');

  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  await page.getByLabel('Visit date', { exact: true }).fill(date);
  await page.getByLabel('Visit time', { exact: true }).fill('19:30');
  await page.getByLabel('Number of guests', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Prepare table enquiry', exact: true }).click();
  const enquiry = await page.locator('#wild-tree-enquiry').inputValue();
  assert.match(enquiry, /4 people/); assert.match(enquiry, /7:30 PM/); assert.match(enquiry, /not a confirmed reservation/);
  checks.push('Table form transfers a validated date, 12-hour time and guest count into an enquiry draft');

  await search.fill('Pad Thai');
  await page.getByRole('button', { name: 'View Pad Thai details', exact: true }).click();
  assert.equal(await page.locator('dialog[open]').count(), 1);
  assert.match(await page.locator('dialog').innerText(), /Demo price/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'View Pad Thai details', exact: true }).evaluate(element => element === document.activeElement), true);
  checks.push('Original artwork detail dialog opens, closes with Escape and restores focus');

  await search.fill('');
  await page.getByLabel('Menu source', { exact: true }).selectOption('mock-concept');
  await page.waitForFunction(() => document.querySelector('[data-dish-id]')?.getAttribute('data-dish-id') === 'thai_vegetable_spring_rolls');
  assert.equal(await page.locator('[data-dish-id] img').count(), 0);
  await page.getByRole('button', { name: 'View Thai Vegetable Spring Rolls details', exact: true }).click();
  assert.match(await page.locator('dialog').innerText(), /No dish photograph/);
  await page.keyboard.press('Escape');
  await page.getByLabel('Menu source', { exact: true }).selectOption('all');
  while (await page.getByRole('button', { name: /Show more dishes/ }).count()) await page.getByRole('button', { name: /Show more dishes/ }).click();
  assert.equal(await page.locator('[data-dish-id]').count(), 51);
  await imagesReady();
  checks.push('All 51 items can be browsed; all 34 concepts remain separately labelled without false images');

  await page.getByRole('group', { name: 'Menu categories' }).getByRole('button', { name: 'All', exact: true }).click();
  await page.locator('#wild-tree-enquiry').fill('Can you help us plan a mix of Thai and Filipino dishes?');
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await imagesReady();
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `Horizontal overflow at ${width}`);
    await page.screenshot({ path: `${output}/wild-tree-${width}.png`, fullPage: true, animations: 'disabled' });
    if (width === 390) {
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      assert.equal(await page.getByRole('navigation', { name: 'The Wild Tree navigation' }).isVisible(), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('button', { name: 'Open navigation', exact: true }).getAttribute('aria-expanded'), 'false');
    }
  }
  checks.push('1440, 1024, 768, 390 and 320px layouts render without document overflow; mobile navigation works');

  await page.evaluate(key => sessionStorage.setItem(key, '{invalid json'), storageKey);
  await page.reload({ waitUntil: 'networkidle' });
  await subtotal(0);
  await page.evaluate(key => sessionStorage.setItem(key, JSON.stringify({ pad_thai: 999, rib_crib_platter: 4, constructor: 5 })), storageKey);
  await page.reload({ waitUntil: 'networkidle' });
  await subtotal(9100);
  assert.equal(await page.getByRole('button', { name: 'Increase Pad Thai quantity', exact: true }).isDisabled(), true);
  checks.push('Corrupted storage recovers; unsupported restaurant IDs are discarded and quantities capped at 20');
  assert.deepEqual(external, [], 'Draft preview must not call live external services');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  checks.push('No browser errors and zero external browser requests, including no live chat or booking calls');
  console.log(JSON.stringify({ status: 'passed', checks, errors, external }, null, 2));
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true, animations: 'disabled' }).catch(() => {});
  throw error;
} finally {
  fs.writeFileSync(`${output}/qa.json`, JSON.stringify({ checks, errors, external }, null, 2));
  await browser.close();
}
