import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { marinaraPreviewBusiness, marinaraSiteConfig } from '../lib/businesses/restaurant/marinara-ristorante/config.ts';
import { filterMarinaraMenu } from '../lib/businesses/restaurant/marinara-ristorante/menu-view.ts';
import { summarizePlan } from '../lib/businesses/restaurant/marinara-ristorante/meal-plan.ts';
import { resolveBusinessSite } from '../lib/businesses/registry.ts';
const source = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');
const imageFiles = (relative: string) => readdirSync(new URL(relative, import.meta.url)).filter((name) => /\.(?:png|jpe?g|webp|svg)$/i.test(name));

test('Marinara has an isolated custom presentation without replacing database routing', () => {
  assert.equal(resolveBusinessSite('/restaurant/marinara-ristorante', 'restaurant'), 'marinara-ristorante');
  assert.equal(resolveBusinessSite('/restaurant/marinara-ristorante', 'dental_clinic'), null);
  assert.equal(resolveBusinessSite('/restaurant/the-rib-crib', 'restaurant'), 'the-rib-crib');
  assert.equal(resolveBusinessSite('/restaurant/the-wild-tree', 'restaurant'), 'the-wild-tree');
});

test('Marinara keeps its own preset, storage and chat namespace', () => {
  assert.equal(marinaraPreviewBusiness.presetKey, 'demo_restaurant_marinara_ristorante.v1');
  assert.equal(marinaraSiteConfig.mealPlanStoragePrefix, 'marinara.meal-plan.v1');
  assert.match(marinaraSiteConfig.chat.openEvent, /marinara-ristorante/);
  assert.equal(marinaraSiteConfig.runtimeEnabled, false);
});

test('all supplied Marinara image groups are wired into the visual story', () => {
  assert.equal(imageFiles('../src/assets/businesses/restaurant/marinara-ristorante/branding/').length, 8);
  assert.equal(imageFiles('../src/assets/businesses/restaurant/marinara-ristorante/atmosphere/').length, 1);
  assert.equal(imageFiles('../src/assets/businesses/restaurant/marinara-ristorante/food/').length, 28);
  const assetModule = source('../lib/businesses/restaurant/marinara-ristorante/assets.ts');
  assert.match(assetModule, /foodGallery:[^]*/);
  for (const filename of ['marinara-buon-cibo-logo-full.png', 'marinara-coverphoto.jpg', 'marinara-buon-cibo-logo-orange.png', 'marinara-logo-meta-thumbnail.png', 'marinara-logo.jpg', 'marinara-interior.jpg', 'marinara-menu-garden-amore-set.jpg']) {
    assert.match(assetModule, new RegExp(filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('menu search understands names, variants and aliases while preserving source filters', () => {
  assert.ok(filterMarinaraMenu('cheese wheel', 'All', 'archived-menu-photo').length >= 3);
  assert.ok(filterMarinaraMenu('quattro formaggi', 'Pizza', 'archived-menu-photo').length >= 2);
  assert.ok(filterMarinaraMenu('', 'All', 'mock-concept').length >= 10);
});

test('sample Marinara dinner uses its own catalog and totals PHP 2,460', () => {
  const summary = summarizePlan({ arugula_peach_pecan_solo: 1, shrimp_mushroom_alfredo_cheese_wheel: 1, quattro_formaggi_pizza_12: 1, seafood_marinara_solo: 1 });
  assert.equal(summary.subtotal, 2460);
  assert.equal(summary.count, 4);
});

test('Marinara page owns its design while reusing shared restaurant settings', () => {
  const page = source('../components/business-sites/restaurant/marinara-ristorante/MarinaraPage.tsx');
  const css = source('../components/business-sites/restaurant/marinara-ristorante/MarinaraPage.module.css');
  assert.match(page, /restaurant\/shared\/prompts/);
  assert.match(page, /MarinaraMealPlanner/);
  assert.match(page, /MarinaraConcierge/);
  assert.doesNotMatch(page + css, /WildTreePage|RibCribPage|rib-crib\.css/);
});
