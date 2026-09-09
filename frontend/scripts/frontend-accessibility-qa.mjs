import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const base = process.env.FRONTEND_URL || 'http://localhost:3000';
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    headless: true,
  });
  try {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    await p.addInitScript(() => {
      window.jourvisFrameCount = 0;
      const raf = window.requestAnimationFrame;
      window.requestAnimationFrame = function (callback) {
        return raf.call(window, (time) => {
          window.jourvisFrameCount++;
          callback(time);
        });
      };
    });
    await p.goto(base, { waitUntil: 'networkidle' });
    await p.getByRole('button', { name: 'Pause motion' }).click();
    await p.waitForTimeout(500);
    const before = await p.evaluate(() => window.jourvisFrameCount);
    await p.waitForTimeout(300);
    const after = await p.evaluate(() => window.jourvisFrameCount);
    assert.equal(after, before, 'Animation clock stops when paused');
    await p
      .locator('#demo')
      .getByRole('tab', { name: 'Answer a customer question' })
      .focus();
    await p.keyboard.press('ArrowRight');
    await p.keyboard.press('Enter');
    await p.getByRole('radio', { name: '9:30 AM' }).waitFor();
    await p.getByRole('radio', { name: '9:30 AM' }).focus();
    await p.keyboard.press('Space');
    await p.keyboard.press('ArrowRight');
    assert.match(
      await p.locator('.appointment-summary').innerText(),
      /11:00 AM/,
    );
    const faq = p.getByRole('button', {
      name: 'What can I do in this preview?',
    });
    await faq.focus();
    await p.keyboard.press('Enter');
    assert.equal(await faq.getAttribute('aria-expanded'), 'true');
    await p.keyboard.press('Enter');
    assert.equal(await faq.getAttribute('aria-expanded'), 'false');
    await p.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
      scrollTo(0, 0);
    });
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await p.screenshot({ path: 'outputs/text-200-percent.png' });
    await p.evaluate(() => (document.documentElement.style.fontSize = ''));
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(base, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1000);
    await p.screenshot({ path: 'outputs/mobile-hero.png' });
    await p
      .locator('.hero-actions')
      .getByRole('button', { name: 'Try Jourvis' })
      .click();
    await p
      .locator('#demo')
      .getByRole('tab', { name: 'Find an appointment' })
      .click();
    await p.getByRole('radio', { name: '11:00 AM' }).check();
    await p.locator('.result-panel').scrollIntoViewIfNeeded();
    await p.screenshot({ path: 'outputs/mobile-appointment.png' });
    console.log(
      JSON.stringify({
        pausedClock: true,
        keyboardTabsSlotsFAQ: true,
        textEnlargement200: true,
        mobileBooking: true,
      }),
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
