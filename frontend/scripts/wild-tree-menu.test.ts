import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { wildTreeOriginalMenu, wildTreeMockMenuExpansion, wildTreeMenu, wildTreeMockMenuKeys, wildTreeMenuPolicy } from '../lib/businesses/restaurant/the-wild-tree/menu.ts';
import { allDishes, dishById, menuCategories } from '../lib/businesses/restaurant/the-wild-tree/content.ts';
import { adjustPlan, sanitizePlan, summarizePlan, priceSummary, mealPlanPrompt } from '../lib/businesses/restaurant/the-wild-tree/meal-plan.ts';
import { wildTreeDemoPreset, wildTreeSeedSql } from '../lib/businesses/restaurant/the-wild-tree/demo-preset.ts';

const expectedOriginals = [
  ['chicken_pandan', 29500], ['beef_satay', 32500], ['pomelo_salad', 29500], ['chu_chee_pla', 49500],
  ['tom_yum_goong', 42500], ['pad_thai', 45500], ['crab_curry', 59500], ['crab_fried_rice', 42500],
  ['deep_fried_sea_bass', 69500], ['thai_steak', 54500], ['spicy_pork_spine_soup', 49500],
  ['beef_kare_kare', 61500], ['pork_kawali', 42500], ['lumpiang_shanghai', 29500],
  ['native_chicken_tinola', 44500], ['mango_sticky_rice', 25500], ['thai_tea_panna_cotta', 24500],
];

test('the 17 original entries retain their approved keys, order and mock prices', () => {
  assert.deepEqual(wildTreeOriginalMenu.map(item => [item.key, item.priceCents]), expectedOriginals);
  assert.equal(wildTreeMockMenuExpansion.length, 34);
  assert.equal(wildTreeMenu.length, 51);
  assert.equal(new Set(wildTreeMenu.map(item => item.key)).size, 51);
});

test('photo-backed names never imply verified prices, recipes or real stock', () => {
  for (const item of wildTreeMenu) {
    assert.match(item.key, /^[a-z][a-z0-9_]*$/);
    assert.ok(Number.isSafeInteger(item.priceCents) && item.priceCents > 0);
    assert.equal(item.priceSource, 'mock');
    assert.equal(item.descriptionSource, 'demo-copy');
    assert.equal(item.availabilitySource, 'demo-only');
    assert.ok(menuCategories.includes(item.category));
    assert.ok(item.aliases.length > 0);
  }
  for (const item of wildTreeOriginalMenu) {
    assert.equal(item.isMock, false);
    assert.equal(item.source, 'supplied-photo');
    assert.ok(item.sourceAsset);
    assert.ok(existsSync(new URL(`../src/assets/businesses/restaurant/the-wild-tree/${item.sourceAsset}`, import.meta.url)));
  }
});

test('all additions and signature concepts remain explicitly invented without borrowed dish images', () => {
  for (const item of wildTreeMockMenuExpansion) {
    assert.equal(item.isMock, true);
    assert.equal(item.source, 'mock-concept');
    assert.equal(item.sourceAsset, null);
    assert.ok(wildTreeMockMenuKeys.has(item.key));
    assert.equal(dishById[item.key]?.image, null);
    assert.equal(dishById[item.key]?.sourceLabel, 'Demo concept');
  }
  assert.equal(wildTreeMenu.filter(item => item.category === 'Wild Tree Signatures').length, 9);
  assert.ok(wildTreeMenu.filter(item => item.category === 'Wild Tree Signatures').every(item => item.isMock));
});

test('Prawn Soup remains an alias of Tom Yum Goong, not a duplicate dish', () => {
  assert.deepEqual(wildTreeMenu.filter(item => item.aliases.includes('prawn soup')).map(item => item.key), ['tom_yum_goong']);
  assert.equal(dishById.prawn_soup, undefined);
});

test('frontend prices normalize from cents once and cover every menu entry', () => {
  assert.equal(allDishes.length, 51);
  for (const item of wildTreeMenu) {
    assert.equal(dishById[item.key]?.price, item.priceCents / 100);
    assert.equal(dishById[item.key]?.id, item.key);
    assert.equal(dishById[item.key]?.priceNote, 'Demo price');
  }
  assert.equal(dishById.pad_thai?.price, 455);
});

test('mixed original and invented meal totals use the Wild Tree catalog only', () => {
  const plan = { pad_thai: 2, wild_tree_tamarind_wings: 1, thai_milk_tea: 4 };
  assert.deepEqual(summarizePlan(plan), { subtotal: 2035, count: 7, unpriced: 0 });
  assert.equal(adjustPlan({}, 'wild_tree_tamarind_wings', 1).wild_tree_tamarind_wings, 1);
  assert.deepEqual(sanitizePlan({ rib_crib_platter: 1, pad_thai: 2 }), { pad_thai: 2 });
  assert.match(priceSummary(plan), /demo subtotal/);
  assert.match(mealPlanPrompt(plan), /Wild Tree Tamarind Wings \[demo concept\]/);
  assert.match(mealPlanPrompt(plan), /fictional demo/);
});

test('unknown fees are never silently assumed to be the earlier unverified 6 percent', () => {
  assert.equal(wildTreeMenuPolicy.serviceChargePercent, null);
  assert.equal(wildTreeMenuPolicy.taxIncluded, null);
  assert.equal(summarizePlan({ pad_thai: 1, tom_yum_goong: 1, beef_kare_kare: 1, mango_sticky_rice: 1 }).subtotal, 1750);
  assert.match(priceSummary({ pad_thai: 1 }), /taxes and service charges unverified/);
});

test('database fixture and frontend share one canonical menu, with publishing and booking disabled', () => {
  const preset = wildTreeDemoPreset;
  assert.equal(preset.preset_key, 'demo_restaurant_the_wild_tree.v1');
  assert.equal(preset.status, 'draft');
  assert.equal(preset.metadata.demo.ready, false);
  assert.equal(preset.metadata.demo.visible, false);
  assert.equal(preset.metadata.demo.fixture.booking.enabled, false);
  assert.equal(preset.metadata.demo.fixture.booking.sendCalendarInvites, false);
  assert.equal(preset.metadata.demo.fixture.restaurant.menu, wildTreeMenu);
  assert.equal(preset.metadata.menuSeed.totalCount, 51);
  assert.doesNotMatch(JSON.stringify(preset), /rib.crib|0927 087 4592|Tagum/i);
});

test('SQL export is idempotent and refuses to overwrite changed data or publish routes', () => {
  const sql = wildTreeSeedSql();
  assert.match(sql, /^BEGIN;/);
  assert.match(sql, /ON CONFLICT \(preset_key\) DO NOTHING/);
  assert.match(sql, /Existing Wild Tree preset differs/);
  assert.doesNotMatch(sql, /UPDATE\s+platform|DELETE\s+FROM|INSERT\s+INTO\s+platform.public_business_routes/i);
  const json = sql.split('$wild_tree_menu_payload$')[1];
  assert.deepEqual(JSON.parse(json), JSON.parse(JSON.stringify(wildTreeDemoPreset)));
});
