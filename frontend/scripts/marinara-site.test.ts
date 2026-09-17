import test from 'node:test';
import assert from 'node:assert/strict';
import { foodGallery, assets } from '../lib/businesses/restaurant/marinara-ristorante/assets.ts';
import { marinaraPreviewBusiness, marinaraSiteConfig } from '../lib/businesses/restaurant/marinara-ristorante/config.ts';
import { filterMarinaraMenu } from '../lib/businesses/restaurant/marinara-ristorante/menu-view.ts';
import { summarizePlan } from '../lib/businesses/restaurant/marinara-ristorante/meal-plan.ts';
import { resolveBusinessSite } from '../lib/businesses/registry.ts';

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

test('all supplied Marinara food images are part of the visual story', () => {
  assert.equal(foodGallery.length, 28);
  assert.equal(new Set(foodGallery.map((item) => item.src)).size, 28);
  assert.ok(assets.logoFull && assets.logoClear && assets.logoThumb && assets.logoRed && assets.cover && assets.brandMark && assets.motto && assets.interior);
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
