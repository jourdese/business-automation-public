import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBusinessSite } from '../lib/businesses/registry.ts';
import { createRestaurantChatPresentation } from '../lib/businesses/restaurant/shared/chat-config.ts';
import { createMealPlanner } from '../lib/businesses/restaurant/shared/meal-plan.ts';

const frontend = fileURLToPath(new URL('..', import.meta.url));
const read = (path: string) => readFileSync(join(frontend, path), 'utf8');

test('custom presentation requires both the known database path and its adapter', () => {
  assert.equal(resolveBusinessSite('/restaurant/the-rib-crib', 'restaurant'), 'the-rib-crib');
  assert.equal(resolveBusinessSite('/restaurant/the-rib-crib', 'dental_clinic'), null);
  assert.equal(resolveBusinessSite('/restaurant/the-wild-tree', 'restaurant'), null);
  assert.equal(resolveBusinessSite('/dental/dental-clinic', 'dental_clinic'), null);
  assert.equal(resolveBusinessSite('__proto__', 'restaurant'), null);
});

test('registry selects presentation but never replaces database route authorization', () => {
  const route = read('app/[vertical]/[business]/page.tsx');
  assert.match(route, /resolvePublicBusinessRoute\(vertical, business\)/);
  assert.match(route, /if \(!route\) notFound\(\)/);
  assert.match(route, /BusinessSiteRenderer/);
  assert.match(route, /listPublicBusinessRoutes/);
  const generic = read('components/jourvis/BusinessDemoPage.tsx');
  assert.doesNotMatch(generic, /RibCrib|the-rib-crib/);
  const renderer = read('components/business-sites/BusinessSiteRenderer.tsx');
  assert.match(renderer, /key=\{business.publicPath\}/);
  assert.match(renderer, /import\('\.\/restaurant\/the-rib-crib\/RibCribPage'\)/);
});

test('root layout no longer imports restaurant patch styles', () => {
  const layout = read('app/layout.tsx');
  assert.doesNotMatch(layout, /import ['"].*(?:rib-crib|wild-tree)/);
  assert.equal(readdirSync(join(frontend, 'app')).some(name => name.startsWith('rib-crib')), false);
  assert.ok(existsSync(join(frontend, '../docs/archive/rib-crib-legacy/styles/rib-crib.css')));
});

test('restaurant chat event and DOM namespaces cannot leak across business paths', () => {
  const a = createRestaurantChatPresentation('/restaurant/first-business');
  const b = createRestaurantChatPresentation('/restaurant/second-business');
  for (const key of ['openEvent', 'stateEvent', 'panelId', 'messageId', 'disclaimerId'] as const) {
    assert.notEqual(a[key], b[key]);
  }
  assert.throws(() => createRestaurantChatPresentation('restaurant/unsafe'), /canonical/);
  assert.throws(() => createRestaurantChatPresentation('/restaurant/../../other'), /canonical/);
});

test('the shared chat contains no Rib Crib business name, menu claims or preset literal', () => {
  const chat = read('components/business-sites/restaurant/shared/RestaurantJourvisChat.tsx');
  assert.doesNotMatch(chat, /The Rib Crib|unlimited wings|demo_restaurant\.v1/);
  assert.match(chat, /scope = business.publicPath/);
  assert.match(chat, /presetKey: business.presetKey/);
  assert.match(chat, /presentation.quickPrompts/);
  assert.match(chat, /presentation.openEvent/);
  assert.match(chat, /createBusinessDemoBootstrap/);
});

test('Rib Crib storage and event contracts remain backward compatible', () => {
  const config = read('lib/businesses/restaurant/the-rib-crib/config.ts');
  assert.match(config, /mealPlanStoragePrefix: 'ribcrib.meal-plan.v2'/);
  assert.match(config, /openEvent: 'ribcrib:jourvis'/);
  assert.match(config, /stateEvent: 'ribcrib:chat-state'/);
  assert.match(config, /panelId: 'rib-jourvis-panel'/);
  assert.match(config, /Do you have unlimited wings/);
});

test('meal-planner factories use their own menus even when item IDs overlap', () => {
  const a = createMealPlanner({ meal: { name: 'First restaurant meal', price: 100 } }, n => `PHP ${n}`);
  const b = createMealPlanner({ meal: { name: 'Second restaurant meal', price: 250 } }, n => `PHP ${n}`);
  assert.equal(a.summarizePlan({ meal: 2 }).subtotal, 200);
  assert.equal(b.summarizePlan({ meal: 2 }).subtotal, 500);
  assert.match(a.mealPlanPrompt({ meal: 1 }), /First restaurant/);
  assert.doesNotMatch(a.mealPlanPrompt({ meal: 1 }), /Second restaurant/);
  assert.match(b.mealPlanPrompt({ meal: 1 }), /Second restaurant/);
});

test('unknown-price items and unsupported dish IDs remain explicit in shared calculations', () => {
  const planner = createMealPlanner({ meal: { name: 'Ask staff', price: null } }, n => `PHP ${n}`);
  assert.deepEqual(planner.summarizePlan({ meal: 2, other: 1 }), { subtotal: 0, count: 2, unpriced: 2 });
  assert.equal(planner.priceSummary({ meal: 2 }), 'PHP 0 + items to confirm');
  assert.deepEqual(planner.sanitizePlan(JSON.parse('{"__proto__":1,"constructor":2,"meal":3}')), { meal: 3 });
});

test('moved local source imports and asset references all resolve', () => {
  const ignore = new Set(['node_modules', 'dist', '.next', '.vinext', 'outputs', 'work', '.wrangler']);
  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      if (ignore.has(entry.name)) return [];
      const path = join(dir, entry.name);
      return entry.isDirectory() ? walk(path) : /\.(tsx?|mjs)$/.test(path) ? [path] : [];
    });
  }
  for (const file of walk(frontend)) {
    const source = readFileSync(file, 'utf8');
    const imports = source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g);
    for (const [, specifier] of imports) {
      if (!specifier.startsWith('@/') && !specifier.startsWith('.')) continue;
      const name = specifier.split('?')[0];
      const base = name.startsWith('@/') ? resolve(frontend, name.slice(2)) : resolve(dirname(file), name);
      const candidates = extname(base) ? [base] : [base, ...['.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx'].map(suffix => base + suffix)];
      assert.ok(candidates.some(existsSync), `${file}: unresolved ${specifier}`);
    }
  }
});

test('Vercel deployment guards and the existing public thumbnail URL are unchanged', () => {
  const rootConfig = JSON.parse(readFileSync(join(frontend, '../vercel.json'), 'utf8'));
  const frontendConfig = JSON.parse(read('vercel.json'));
  assert.equal(rootConfig.git.deploymentEnabled, false);
  assert.equal(frontendConfig.git.deploymentEnabled, false);
  assert.match(read('app/[vertical]/[business]/page.tsx'), /https:\/\/jourvis.ai\/rib-crib\/rib-crib-thumbnail.png/);
  assert.ok(existsSync(join(frontend, 'public/rib-crib/rib-crib-thumbnail.png')));
});
