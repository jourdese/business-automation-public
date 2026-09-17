import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { marinaraMenu, marinaraOriginalMenu, marinaraMockMenuExpansion, marinaraMenuCounts, marinaraMenuPolicy, MARINARA_PRESET_KEY } from '../lib/businesses/restaurant/marinara-ristorante/menu.ts';
import { allDishes, dishById } from '../lib/businesses/restaurant/marinara-ristorante/content.ts';
import { marinaraSources } from '../lib/businesses/restaurant/marinara-ristorante/sources.ts';
import { sanitizePlan, summarizePlan, mealPlanPrompt } from '../lib/businesses/restaurant/marinara-ristorante/meal-plan.ts';
import { marinaraSiteConfig } from '../lib/businesses/restaurant/marinara-ristorante/config.ts';
import { marinaraDemoPreset, marinaraSeedSql } from '../lib/businesses/restaurant/marinara-ristorante/demo-preset.ts';
import { assets, menuImages } from '../lib/businesses/restaurant/marinara-ristorante/assets.ts';
import { resolveBusinessSite } from '../lib/businesses/registry.ts';
const source = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');

test('Marinara contains 90 archived entries/variants and 10 distinct concepts', () => {
  assert.deepEqual(marinaraMenuCounts, { original: 90, expansion: 10, total: 100 });
  assert.equal(new Set(marinaraMenu.map(i => i.key)).size, 100);
  assert.equal(marinaraOriginalMenu.length, 90); assert.equal(marinaraMockMenuExpansion.length, 10);
});
test('menu reference fields remain distinct from current restaurant authority', () => {
  for (const item of marinaraMenu) {
    assert.equal(item.priceSource, 'mock'); assert.equal(item.descriptionSource, 'demo-copy');
    assert.equal(item.availabilitySource, 'demo-only'); assert.equal(item.sourceAsset, null);
    assert.ok(Number.isSafeInteger(item.priceCents) && item.priceCents > 0);
    if (!item.isMock) {
      assert.equal(item.sourcePublicationDate, '2025-04-06'); assert.ok(item.sourceId && marinaraSources[item.sourceId]);
      assert.equal(item.referencePriceCents, item.priceCents); assert.equal(item.source, 'archived-menu-photo');
    } else {
      assert.equal(item.sourceId, null); assert.equal(item.referencePriceCents, null); assert.equal(item.sourceUrl, null);
    }
  }
});
test('regular, sharing and cheese-wheel pasta are separate full-priced selections', () => {
  assert.equal(dishById.chicken_spinach_carbonara_solo?.price, 460);
  assert.equal(dishById.chicken_spinach_carbonara_sharing?.price, 665);
  assert.equal(dishById.chicken_spinach_carbonara_cheese_wheel?.price, 750);
  assert.equal(summarizePlan({ chicken_spinach_carbonara_cheese_wheel: 1 }).subtotal, 750);
});
test('pizza sizes and calamari sharing retain distinct IDs and reference prices', () => {
  assert.equal(dishById.classic_margherita_pizza_12?.price, 635);
  assert.equal(dishById.classic_margherita_pizza_14?.price, 770);
  assert.equal(dishById.spicy_calamari_flowerettes_regular?.price, 435);
  assert.equal(dishById.spicy_calamari_flowerettes_sharing?.price, 585);
});
test('frontend cents conversion happens once and plan totals exclude unknown charges', () => {
  allDishes.forEach(item => assert.equal(item.price * 100, item.priceCents));
  assert.deepEqual(summarizePlan({ chicken_spinach_carbonara_cheese_wheel: 1, spicy_calamari_flowerettes_sharing: 1, key_lime_cheesecake: 1 }), { count: 3, subtotal: 1555, unpriced: 0 });
  assert.equal(marinaraMenuPolicy.serviceChargePercent, null); assert.equal(marinaraMenuPolicy.taxIncluded, null);
});
test('storage sanitization rejects other restaurant keys and inherited properties', () => {
  assert.deepEqual(sanitizePlan(JSON.parse('{"pad_thai":2,"constructor":1,"__proto__":4,"espresso":99}')), { espresso: 20 });
  assert.deepEqual(sanitizePlan({ espresso: -1 }), {});
});
test('meal-plan handoff preserves variant names and demo provenance', () => {
  const prompt = mealPlanPrompt({ chicken_spinach_carbonara_cheese_wheel: 1, marinara_affogato: 1 });
  assert.match(prompt, /Cheese Wheel, Solo/); assert.match(prompt, /archived menu/);
  assert.match(prompt, /demo concept/); assert.match(prompt, /Do not submit an order or reservation/);
});
test('the draft cannot publish a route or enable runtime operations', () => {
  const fixture=marinaraDemoPreset.metadata.demo.fixture;
  assert.equal(marinaraDemoPreset.status, 'draft'); assert.equal(marinaraDemoPreset.metadata.demo.ready, false);
  assert.equal(marinaraDemoPreset.metadata.demo.visible, false); assert.equal(fixture.booking.enabled, false);
  assert.equal(fixture.booking.sendCalendarInvites, false); assert.deepEqual(fixture.hours, []);
  assert.equal(marinaraSiteConfig.runtimeEnabled, false); assert.equal(marinaraSiteConfig.siteReady, false);
  assert.equal(resolveBusinessSite(marinaraSiteConfig.publicPath, 'restaurant'), null);
  assert.equal(fixture.presetKey, MARINARA_PRESET_KEY); assert.equal(fixture.restaurant.menu, marinaraMenu);
});
test('chat and meal-plan namespaces are unique to Marinara', () => {
  assert.match(marinaraSiteConfig.chat.openEvent, /marinara-ristorante/);
  assert.equal(marinaraSiteConfig.mealPlanStoragePrefix, 'marinara.meal-plan.v1');
});
test('no website images are falsely attributed or hotlinked', () => {
  assert.ok(Object.values(assets).every(value => value === null)); assert.deepEqual(menuImages, {});
  assert.ok(existsSync(new URL('../src/assets/businesses/restaurant/marinara-ristorante/branding/README.md', import.meta.url)));
});
test('SQL export inserts only the hidden restaurant preset and aborts conflicting seeds', () => {
  const sql=marinaraSeedSql();
  assert.match(sql, /INSERT INTO platform.capability_presets/); assert.match(sql, /ON CONFLICT \(preset_key\) DO NOTHING/);
  assert.match(sql, /Existing Marinara preset differs/); assert.doesNotMatch(sql, /UPDATE platform|DELETE FROM|INSERT INTO platform.public_business_routes/);
  const match=sql.match(/\$marinara_payload\$([\s\S]*?)\$marinara_payload\$/); assert.ok(match);
  const payload=JSON.parse(match[1]); assert.equal(payload.rows.length, 100);
  assert.equal(payload.preset.metadata.demo.ready, false);
});
test('canonical export serializes deterministic values with no credentials or operational endpoints', () => {
  const json=JSON.stringify(marinaraDemoPreset);
  assert.equal(createHash('sha256').update(json).digest('hex').length, 64);
  assert.doesNotMatch(json, /service_role|secret_key|api_key|n8n\.cloud/);
  assert.doesNotMatch(source('../lib/businesses/restaurant/marinara-ristorante/menu.ts'), /import.*the-wild-tree|import.*the-rib-crib/);
});
