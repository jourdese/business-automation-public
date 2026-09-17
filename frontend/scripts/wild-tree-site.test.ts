import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wildTreeAssetFolders, sourceAssetPath, WILD_TREE_ASSET_ROOT } from '../lib/businesses/restaurant/the-wild-tree/asset-manifest.ts';
import { filterWildTreeMenu } from '../lib/businesses/restaurant/the-wild-tree/menu-view.ts';
import { wildTreeSiteConfig, wildTreePreviewBusiness, isWildTreeBusiness } from '../lib/businesses/restaurant/the-wild-tree/config.ts';
import { wildTreeMenu } from '../lib/businesses/restaurant/the-wild-tree/menu.ts';

const frontend = fileURLToPath(new URL('..', import.meta.url));
const read = (path: string) => readFileSync(join(frontend, path), 'utf8');
const site = 'components/business-sites/restaurant/the-wild-tree/';
const data = 'lib/businesses/restaurant/the-wild-tree/';

test('all 38 user assets are reorganized without changing filenames or bytes', () => {
  const names = Object.keys(wildTreeAssetFolders).sort();
  assert.equal(names.length, 38);
  const pairs = names.map(name => {
    const path = sourceAssetPath(name);
    assert.ok(path);
    const bytes = readFileSync(join(frontend, path));
    const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    return `${name}:${blob}`;
  });
  assert.equal(createHash('sha256').update(pairs.join('\n')).digest('hex'), '46997271d9cd559a5c38b4a3c2945ac0b4eebca3d2cba0a7c16ae20528e2fd10');
  assert.deepEqual(readdirSync(join(frontend, WILD_TREE_ASSET_ROOT)).sort(), ['README.md', 'atmosphere', 'branding', 'food', 'source']);
  assert.equal(sourceAssetPath('../../private'), null);
  assert.equal(sourceAssetPath('__proto__'), null);
});

test('the menu supports aliases, punctuation, category and provenance filters', () => {
  assert.equal(filterWildTreeMenu('').length, 51);
  assert.equal(filterWildTreeMenu('', 'All', 'supplied-photo').length, 17);
  assert.equal(filterWildTreeMenu('', 'All', 'mock-concept').length, 34);
  assert.deepEqual(filterWildTreeMenu('PADTHAI').map(item => item.id), ['pad_thai']);
  assert.deepEqual(filterWildTreeMenu('prawn soup').map(item => item.id), ['tom_yum_goong']);
  assert.deepEqual(filterWildTreeMenu('kare-kare', 'Filipino').map(item => item.id), ['beef_kare_kare']);
  assert.equal(filterWildTreeMenu('', 'Wild Tree Signatures', 'mock-concept').length, 9);
  assert.equal(filterWildTreeMenu('', 'Drinks', 'supplied-photo').length, 0);
  assert.equal(filterWildTreeMenu('not_a_real_dish').length, 0);
  assert.equal(filterWildTreeMenu('guaranteed allergen free').length, 0);
});

test('Wild Tree runtime and saved meal plans have their own identities', () => {
  assert.equal(isWildTreeBusiness(wildTreePreviewBusiness), true);
  assert.equal(isWildTreeBusiness({ ...wildTreePreviewBusiness, presetKey: 'demo_restaurant.v1' }), false);
  assert.equal(isWildTreeBusiness({ ...wildTreePreviewBusiness, publicPath: '/restaurant/the-rib-crib' }), false);
  assert.equal(isWildTreeBusiness({ ...wildTreePreviewBusiness, adapterKey: 'dental_clinic' }), false);
  assert.equal(wildTreeSiteConfig.runtimeEnabled, false);
  assert.equal(wildTreeSiteConfig.mealPlanStoragePrefix, 'wildtree.meal-plan.v1');
  assert.match(wildTreeSiteConfig.chat.openEvent, /the-wild-tree/);
  assert.doesNotMatch(wildTreeSiteConfig.chat.openEvent, /ribcrib/);
});

test('preview is development only and never overrides database route resolution', () => {
  const preview = read('app/preview/the-wild-tree/page.tsx');
  assert.match(preview, /process.env.NODE_ENV !== 'development'\) notFound\(\)/);
  assert.match(preview, /index: false, follow: false/);
  const routes = read('lib/jourvis/public-business-routes.ts');
  assert.doesNotMatch(routes, /the-wild-tree|preview/);
  assert.match(read('app/[vertical]/[business]/page.tsx'), /if \(!route\) notFound\(\)/);
});

test('the new restaurant uses its own CSS module and never imports Rib Crib files', () => {
  for (const name of readdirSync(join(frontend, site)).filter(name => /\.(tsx|css)$/.test(name))) {
    const contents = read(site + name);
    assert.doesNotMatch(contents, /from ['"][^'"]*the-rib-crib/);
    assert.doesNotMatch(contents, /src=['"]\/src\//);
  }
  assert.doesNotMatch(read('app/layout.tsx'), /import ['"][^'"]*wild-tree/);
  assert.match(read(site + 'WildTreePage.tsx'), /stored\?\.key === planKey/);
  assert.match(read(site + 'WildTreePage.module.css'), /prefers-reduced-motion/);
});

test('image lookup covers only original dish keys; mock concepts never borrow a photograph', () => {
  const assetCode = read(data + 'assets.ts');
  const imagePart = assetCode.slice(assetCode.index('export const menuImages'));
  for (const item of wildTreeMenu) {
    const mapped = new RegExp(`\\b${item.key}:`).test(imagePart);
    assert.equal(mapped, !item.isMock, item.key);
  }
  assert.match(read(site + 'WildTreeMenu.tsx'), /No dish photo/);
  assert.match(read(site + 'WildTreeMenu.tsx'), /Demo price/);
});

test('concierge prepares copyable drafts without pretending to run an active AI session', () => {
  const concierge = read(site + 'WildTreeConcierge.tsx');
  assert.match(concierge, /config.runtimeEnabled \? <RestaurantJourvisChat/);
  assert.match(concierge, /navigator.clipboard.writeText\(draft\)/);
  assert.match(concierge, /Nothing has been sent/);
  assert.doesNotMatch(concierge, /demoRequest\(|fetch\(/);
  assert.match(read(site + 'WildTreePage.tsx'), /No availability is checked and no table is booked/);
});
