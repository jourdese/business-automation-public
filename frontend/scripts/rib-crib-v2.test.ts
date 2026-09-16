import test from 'node:test';
import assert from 'node:assert/strict';
import { dishes, platters, moreMenu, allDishes, peso } from '../lib/rib-crib-v2/content.ts';
import { sanitizePlan, adjustPlan, summarizePlan, mealPlanPrompt, manilaToday, reservationPrompt } from '../lib/rib-crib-v2/meal-plan.ts';

test('one price source per dish, and conflicting Sisig Tacos is deliberately unpriced', () => {
  assert.equal(new Set(allDishes.map(item => item.id)).size, allDishes.length);
  assert.equal(dishes.find(item => item.id === 'tacos')?.price, null);
  assert.equal(dishes.find(item => item.id === 'wings')?.price, 245);
  assert.equal(moreMenu.find(group => group.title === 'Wings only')?.items[0].price, 215);
  assert.ok(allDishes.every(item => item.source === 'menu-1' || item.source === 'menu-2'));
});
test('sanitization ignores unknown, prototype, invalid and nonnumeric selections', () => {
  assert.deepEqual(sanitizePlan(null), {});
  assert.deepEqual(sanitizePlan([]), {});
  assert.deepEqual(sanitizePlan({ribs:3.7,wings:Infinity,unknown:2,fries:-1,tacos:400,tea:'2'}), {ribs:3,tacos:20});
  assert.deepEqual(sanitizePlan(JSON.parse('{"__proto__":3,"constructor":2,"toString":1,"ribs":1}')), {ribs:1});
});
test('quantity bounds, removal, unknown IDs and immutable updates', () => {
  const original={ribs:1};
  assert.deepEqual(adjustPlan(original,'ribs',1),{ribs:2});
  assert.deepEqual(original,{ribs:1});
  assert.deepEqual(adjustPlan(original,'ribs',-1),{});
  assert.deepEqual(adjustPlan({ribs:20},'ribs',1),{ribs:20});
  assert.deepEqual(adjustPlan(original,'constructor',1),original);
});
test('subtotal never treats an unknown price as a verified free item', () => {
  assert.deepEqual(summarizePlan({ribs:2,tacos:1,'iced-tea':2}),{subtotal:840,count:5,unpriced:1});
  assert.equal(summarizePlan({'rib-crib-platter':1}).subtotal,875);
  assert.match(peso(1045),/1,045/);
});
test('a plan creates an enquiry, not an order or guessed serving guarantee', () => {
  const prompt=mealPlanPrompt({barkada:1,tacos:2});
  assert.match(prompt,/Barkada Platter/);
  assert.match(prompt,/not a confirmed order/);
  assert.doesNotMatch(prompt,/₱|serves \d|guarantee/i);
  assert.ok(platters.every(item=>!item.portion?.includes('people')));
});
test('Manila date is stable across UTC day boundary', () => {
  assert.equal(manilaToday(new Date('2026-09-15T17:00:00Z')),'2026-09-16');
});
test('reservation validates calendar dates, time and group size', () => {
  assert.equal(reservationPrompt('2026-09-15','19:00','4','2026-09-16'),null);
  assert.equal(reservationPrompt('2026-02-30','19:00','4','2026-01-01'),null);
  assert.equal(reservationPrompt('2026-09-16','25:00','4','2026-09-16'),null);
  assert.equal(reservationPrompt('2026-09-16','19:00','0','2026-09-16'),null);
  assert.equal(reservationPrompt('2026-09-16','19:00','4.5','2026-09-16'),null);
  assert.equal(reservationPrompt('2026-09-16','19:00','41','2026-09-16'),null);
  const valid=reservationPrompt('2026-09-16','19:00','4','2026-09-16');
  assert.match(valid!,/7:00 PM \(Philippine time\)/);
  assert.match(valid!,/not a confirmed reservation/);
  assert.match(reservationPrompt('2026-09-16','00:00','1','2026-09-16')!,/12:00 AM/);
});
