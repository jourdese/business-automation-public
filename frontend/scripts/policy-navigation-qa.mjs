import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { extname, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const output = resolve('dist/client');
let server;
let browser;
try {
  let base = process.env.FRONTEND_URL;
  if (!base) {
    server = http.createServer(async (request, response) => {
      try {
        let path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        path = path === '/' ? '/index.html' : extname(path) ? path : path + '.html';
        const file = resolve(output, '.' + path);
        if (relative(output, file).startsWith('..')) throw new Error('Outside static root');
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.rsc': 'text/x-component', '.png': 'image/png' };
        const data = await fs.readFile(file);
        response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
        response.end(data);
      } catch {
        if (!response.headersSent) response.writeHead(404);
        response.end('Not found');
      }
    });
    await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
    base = 'http://127.0.0.1:' + server.address().port;
  }
  browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  const errors = [];
  const checks = [];
  const normalize = text => text.replace(/\s+/g, ' ').trim();
  const expected = {};
  const sourcePage = await browser.newPage();
  for (const route of ['privacy', 'data-deletion']) {
    const html = await fs.readFile(resolve('..', route + '.html'), 'utf8');
    const article = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/)?.[0];
    assert.ok(article);
    await sourcePage.setContent(article);
    expected[route] = (await sourcePage.locator('article').locator('h1,h2,h3,p,li').allTextContents()).map(normalize);
  }
  await sourcePage.close();
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({viewport:{width,height:900}});
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, {waitUntil:'networkidle'});
    for (const route of ['privacy', 'data-deletion']) {
      await page.locator(`footer a[href="/${route}"]`).click();
      await page.waitForURL('**/' + route);
      await page.waitForLoadState('networkidle');
      assert.deepEqual((await page.locator('article.document').locator('h1,h2,h3,p,li').allTextContents()).map(normalize), expected[route]);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://jourvis.vercel.app/' + route);
      await page.reload({waitUntil:'networkidle'});
      assert.equal(await page.locator('article.document').count(),1);
    }
    await page.locator('article a[href="/privacy"]').click();
    await page.waitForURL('**/privacy');
    await page.locator('article a[href="/data-deletion"]').click();
    await page.waitForURL('**/data-deletion');
    assert.match(await page.locator('.contact-box a').getAttribute('href'), /^mailto:jourdesepalacio@gmail.com\?subject=/);
    await page.getByRole('link',{name:'Jourvis home',exact:true}).click();
    await page.waitForURL(base + '/');
    const deletionLink=page.locator('footer a[href="/data-deletion"]');
    await deletionLink.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/data-deletion');
    checks.push(`${width}px: footer clicks, keyboard activation, policy cross-links, home return, refreshed routes, source text parity, and canonical URLs`);
    if(width===390) {
      await fs.mkdir('outputs',{recursive:true});
      await page.screenshot({path:'outputs/policy-mobile.png',fullPage:true});
    }
    await page.close();
  }
  const noJs = await browser.newPage({javaScriptEnabled:false});
  await noJs.goto(base);
  await noJs.locator('footer a[href="/privacy"]').click();
  await noJs.waitForURL('**/privacy');
  assert.equal(await noJs.locator('article.document').count(),1);
  checks.push('Privacy is accessible with JavaScript disabled');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({base,checks,errors},null,2));
} finally {
  await browser?.close();
  if(server) await new Promise(resolveClose => server.close(resolveClose));
}
