import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
    : 'playwright'
);
const base = process.env.FRONTEND_URL || 'http://localhost:3001';
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
  headless: true,
});
const checks = [],
  errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  assert.deepEqual(
    await page
      .locator('[data-world-section]')
      .evaluateAll((els) => els.map((el) => el.dataset.worldSection)),
    ['hero', 'demo', 'outcomes', 'principles', 'final'],
  );
  assert.deepEqual(
    await page
      .locator('[data-particle-anchor]')
      .evaluateAll((els) => els.map((el) => el.dataset.particleAnchor)),
    ['hero', 'demo', 'final'],
  );
  checks.push('Existing section sequence and character anchors preserved');
  assert.equal(await page.locator('#jourvis-guide-panel').count(), 0);
  await page.getByRole('button', { name: 'Open Jourvis page guide' }).focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => document.activeElement?.id === 'guide-title',
  );
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#jourvis-guide-panel').count(), 0);
  assert.equal(
    await page
      .getByRole('button', { name: 'Open Jourvis page guide' })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  checks.push(
    'Guide opens only on request; keyboard opening, Escape and focus return work',
  );
  await page.getByRole('button', { name: 'Open Jourvis page guide' }).click();
  await page.getByRole('button', { name: 'Show me the demo' }).click();
  await page.waitForFunction(() => document.activeElement?.id === 'demo');
  await page
    .locator('#demo')
    .getByRole('button', { name: 'Run this example' })
    .click();
  await page.locator('.result-fact').waitFor();
  await page.getByRole('button', { name: 'Open Jourvis page guide' }).click();
  assert.match(
    await page.locator('#jourvis-guide-panel > p').innerText(),
    /sample result is ready/,
  );
  await page.getByRole('button', { name: 'Close guide', exact: true }).click();
  checks.push(
    'Initial Run example action works and guide reflects the demo result',
  );
  // Navigate through the guide rather than invoking a synthetic scroll.
  await page.getByRole('button', { name: 'Open Jourvis page guide' }).click();
  await page
    .getByRole('navigation', { name: 'Explore with Jourvis' })
    .getByRole('button', { name: 'My approach & FAQ' })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector('.page-guide')?.getAttribute('data-section') ===
      'principles',
  );
  await page.waitForFunction(
    () =>
      document.querySelector('.page-guide')?.getAttribute('data-in-gap') ===
      'true',
  );
  assert.equal(
    await page.locator('.guide-trigger .companion-mark').isVisible(),
    true,
  );
  await page.getByRole('button', { name: 'Open Jourvis page guide' }).click();
  await page.getByRole('button', { name: 'Take me to the FAQ' }).click();
  await page.waitForFunction(
    () => document.activeElement?.id === 'jourvis-faq',
  );
  checks.push(
    'Companion remains present between anchors; contextual FAQ action navigates and focuses',
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole('button', { name: 'Open Jourvis page guide' }).click();
    const box = await page.locator('.guide-panel').boundingBox();
    assert.ok(
      box &&
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= width &&
        box.y + box.height <= 844,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page
      .getByRole('button', { name: 'Close guide', exact: true })
      .click();
  }
  checks.push('Guide fits desktop, tablet and 390px / 320px phones');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base + '/?graphics=off', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Open Jourvis page guide' }).click();
  await page
    .getByRole('navigation', { name: 'Explore with Jourvis' })
    .getByRole('button', { name: 'Next steps' })
    .click();
  await page.waitForFunction(
    () => document.activeElement?.id === 'final-title',
  );
  checks.push(
    'Guide navigation works with reduced motion and graphics disabled',
  );
  const social = await page.request.get(base + '/jourvis-social.png');
  assert.equal(social.status(), 200);
  assert.match(social.headers()['content-type'], /image\/png/);
  assert.equal(await page.locator('meta[property="og:image"]').count(), 1);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally {
  await browser.close();
}
