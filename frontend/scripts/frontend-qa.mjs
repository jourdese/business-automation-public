import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const base = process.env.FRONTEND_URL || 'http://localhost:3000';
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    headless: true,
  });
  const checks = [],
    errors = [],
    external = [];
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && url.origin !== new URL(base).origin)
      external.push(request.url());
  });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.graphics);
  await page.waitForTimeout(1000);
  fs.mkdirSync('outputs', { recursive: true });
  await page.screenshot({ path: 'outputs/hero-desktop.png' });
  assert.equal(
    await page.locator('h1').innerText(),
    'Your business,\nwith room\nto breathe.',
  );
  checks.push('Hero renders immediately as semantic text');
  await page
    .locator('.hero-actions')
    .getByRole('button', { name: 'Try Jourvis' })
    .click();
  await page.waitForFunction(() => document.activeElement?.id === 'demo');
  checks.push('Try Jourvis focuses the actual demo');
  const demo = page.locator('#demo');
  await demo.getByRole('tab', { name: 'Answer a customer question' }).click();
  await demo.locator('.result-kicker').getByText('A CLEAR ANSWER').waitFor();
  assert.match(await demo.locator('.result-fact').innerText(), /Complimentary/);
  checks.push('General question resolves to sample business information');
  await demo.getByRole('tab', { name: 'Find an appointment' }).click();
  await demo.getByRole('radio', { name: '11:00 AM' }).waitFor();
  await demo.getByRole('radio', { name: '11:00 AM' }).check();
  assert.match(
    await demo.locator('.appointment-summary').innerText(),
    /11:00 AM/,
  );
  await demo.getByRole('radio', { name: '2:30 PM' }).check();
  assert.match(
    await demo.locator('.appointment-summary').innerText(),
    /2:30 PM/,
  );
  assert.match(
    await demo.locator('.result-footnote').innerText(),
    /Nothing is booked or sent/,
  );
  await demo.screenshot({ path: 'outputs/demo-appointment-desktop.png' });
  checks.push(
    'Appointment time can be selected and changed; remains a preview',
  );
  await demo.getByRole('tab', { name: 'Bring in a person' }).click();
  await demo.locator('.handoff-summary').waitFor();
  assert.match(
    await demo.locator('.handoff-summary').innerText(),
    /Custom project/,
  );
  assert.equal(
    await page
      .locator('.jourvis-experience')
      .getAttribute('data-companion-state'),
    'handoff',
  );
  checks.push('Handoff prepares fictional context and uses the handoff state');
  await demo
    .getByRole('button', { name: 'Dental clinic', exact: true })
    .click();
  assert.equal(await demo.locator('.handoff-summary').count(), 0);
  assert.match(
    await demo.locator('.assistant-message').innerText(),
    /What can I take off/,
  );
  await demo.getByRole('tab', { name: 'Answer a customer question' }).click();
  await demo
    .locator('.result-fact')
    .getByText('PHP 800 · 30 minutes')
    .waitFor();
  checks.push(
    'Preset change clears the scenario and produces the dental answer',
  );
  await demo.getByRole('button', { name: 'Replay this example' }).click();
  await demo
    .locator('.result-fact')
    .getByText('PHP 800 · 30 minutes')
    .waitFor();
  await demo.getByRole('tab', { name: 'Find an appointment' }).click();
  await demo.getByRole('radio', { name: '9:30 AM' }).waitFor();
  await demo.getByRole('radio', { name: '9:30 AM' }).check();
  assert.match(
    await demo.locator('.appointment-summary').innerText(),
    /Dental consultation/,
  );
  await demo.getByRole('tab', { name: 'Bring in a person' }).click();
  await demo.locator('.handoff-summary').waitFor();
  assert.match(
    await demo.locator('.handoff-summary').innerText(),
    /existing treatment/,
  );
  await demo.getByRole('button', { name: 'Reset', exact: true }).click();
  assert.equal(await demo.locator('.handoff-summary').count(), 0);
  // A preset switch while processing must cancel the old response.
  await demo.getByRole('tab', { name: 'Find an appointment' }).click();
  await demo
    .getByRole('button', { name: 'General business', exact: true })
    .click();
  await page.waitForTimeout(800);
  assert.equal(await demo.locator('.sample-slots').count(), 0);
  assert.match(
    await demo.locator('.assistant-message').innerText(),
    /What can I take off/,
  );
  checks.push(
    'All dental scenarios, replay, reset and rapid preset switching work',
  );
  await page
    .locator('#outcomes')
    .getByRole('button', { name: 'Where are you?' })
    .click();
  assert.match(
    await page.locator('.resolved-answer').innerText(),
    /Online consultations/,
  );
  await page
    .locator('.timeline-slots')
    .getByRole('button', { name: '2:30 PM' })
    .click();
  assert.match(await page.locator('.mini-appointment').innerText(), /2:30 PM/);
  await page
    .getByRole('button', { name: 'Bring the details together' })
    .click();
  assert.match(await page.locator('.handoff-details').innerText(), /Alex/);
  await page.getByRole('button', { name: 'See the scattered details' }).click();
  assert.equal(await page.locator('.loose-details').count(), 1);
  checks.push('All three editorial outcome controls update their visual');
  const faq = page.getByRole('button', {
    name: 'Is this connected to a real business?',
  });
  await faq.click();
  assert.equal(await faq.getAttribute('aria-expanded'), 'true');
  await faq.click();
  assert.equal(await faq.getAttribute('aria-expanded'), 'false');
  checks.push('FAQ expands and collapses');
  await page
    .locator('.final-actions')
    .getByRole('button', { name: 'Try Jourvis' })
    .click();
  await page.waitForFunction(() => document.activeElement?.id === 'demo');
  checks.push('Closing CTA returns focus to the preview');
  await page.getByRole('button', { name: 'Pause motion' }).click();
  assert.equal(
    await page
      .getByRole('button', { name: 'Resume motion' })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.getByRole('button', { name: 'Resume motion' }).click();
  checks.push('Manual motion control works');
  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(
      overflow,
      false,
      'No horizontal overflow at ' + viewport.width,
    );
    if (viewport.width !== 320)
      await page.screenshot({
        path: 'outputs/page-' + viewport.width + '.png',
        fullPage: true,
      });
  }
  checks.push(
    '768px tablet, 390px phone and 320px narrow viewport have no horizontal overflow',
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('.motion-toggle').isVisible(), false);
  assert.equal(await page.locator('.motion-preference').isVisible(), true);
  await page.keyboard.press('Tab');
  assert.equal(
    await page.locator('.skip').evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  checks.push('Reduced motion and keyboard skip navigation work');
  // Test graphics fallback with actual initialization denial.
  const failed = await context.newPage();
  await failed.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await failed.goto(base, { waitUntil: 'networkidle' });
  assert.equal(
    await failed.locator('html').getAttribute('data-graphics'),
    'static',
  );
  await failed
    .locator('#demo')
    .getByRole('tab', { name: 'Find an appointment' })
    .click();
  await failed.getByRole('radio', { name: '11:00 AM' }).check();
  assert.match(
    await failed.locator('.appointment-summary').innerText(),
    /11:00 AM/,
  );
  await failed.close();
  checks.push(
    'Graphics initialization failure keeps the complete demo working',
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(base + '/?graphics=canvas', { waitUntil: 'networkidle' });
  assert.equal(
    await page.locator('html').getAttribute('data-graphics'),
    'canvas',
  );
  await page.goto(base, { waitUntil: 'networkidle' });
  if ((await page.locator('html').getAttribute('data-graphics')) === 'webgl') {
    await page.evaluate(() => {
      const c = document.querySelector('.particle-world canvas');
      const gl = c?.getContext('webgl');
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    });
    await page.waitForFunction(
      () => document.documentElement.dataset.graphics === 'canvas',
    );
    checks.push('WebGL context loss switches to Canvas 2D');
  }
  checks.push('Canvas fallback is available');
  for (const route of ['/privacy', '/data-deletion']) {
    await page.goto(base + route + (process.env.FRONTEND_STATIC ? '.html' : ''), { waitUntil: 'networkidle' });
    assert.equal(await page.locator('article.document').count(), 1);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  checks.push(
    'Policy routes preserved; no page errors or external service requests',
  );
  console.log(JSON.stringify({ checks, errors, external }, null, 2));
  fs.writeFileSync(
    'outputs/browser-qa.json',
    JSON.stringify({ checks, errors, external }, null, 2),
  );
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
