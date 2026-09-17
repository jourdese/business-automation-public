import { marinaraMenuRows, type MenuRow } from './menu-data.ts';
import { marinaraSources, MARINARA_SOURCE_PUBLICATION_DATE } from './sources.ts';
export const MARINARA_PRESET_KEY = 'demo_restaurant_marinara_ristorante.v1';
export const MARINARA_MENU_VERSION = 'marinara-menu.v1';

function makeItem(row: MenuRow) {
  const [key, name, category, pricePesos, sourceId, description, aliases, variant, dishKey, printedName] = row;
  const priceCents = Math.round(pricePesos * 100);
  if (!/^[a-z][a-z0-9_]*$/.test(key) || !Number.isSafeInteger(priceCents) || priceCents <= 0) throw new Error(`Invalid Marinara menu item: ${key}`);
  if (sourceId !== null && !Object.prototype.hasOwnProperty.call(marinaraSources, sourceId)) throw new Error(`Unknown Marinara source: ${sourceId}`);
  return Object.freeze({
    key, name, category, priceCents, aliases: Object.freeze([...aliases]), description,
    active: true, available: true, dishKey, variant, printedName,
    isMock: sourceId === null, source: sourceId ? 'archived-menu-photo' : 'mock-concept',
    sourceId, sourceUrl: sourceId ? marinaraSources[sourceId].url : null,
    sourcePublicationDate: sourceId ? MARINARA_SOURCE_PUBLICATION_DATE : null,
    referencePriceCents: sourceId ? priceCents : null,
    priceSource: 'mock', descriptionSource: 'demo-copy', availabilitySource: 'demo-only',
    sourceAsset: null,
  } as const);
}
export type MarinaraMenuItem = ReturnType<typeof makeItem>;
export const marinaraMenu: readonly MarinaraMenuItem[] = Object.freeze(marinaraMenuRows.map(makeItem));
if (new Set(marinaraMenu.map(item => item.key)).size !== marinaraMenu.length) throw new Error('Duplicate Marinara menu keys.');
export const marinaraOriginalMenu = Object.freeze(marinaraMenu.filter(item => !item.isMock));
export const marinaraMockMenuExpansion = Object.freeze(marinaraMenu.filter(item => item.isMock));
export const marinaraMenuCounts = Object.freeze({ original: marinaraOriginalMenu.length, expansion: marinaraMockMenuExpansion.length, total: marinaraMenu.length });
export const marinaraMenuPolicy = Object.freeze({
  currency: 'PHP', priceUnit: 'minor', allPricesAreMock: true, serviceChargePercent: null, taxIncluded: null,
  menuNotice: `${marinaraMenuCounts.original} selected menu entries/variants are backed by photographed 2025 menu pages. ${marinaraMenuCounts.expansion} additional entries are invented demo concepts. This is not a complete or current restaurant menu.`,
  priceNotice: 'Prices are demo values. Archived menu amounts are retained as references where legible, not verified current restaurant prices.',
  availabilityNotice: 'Available means selectable in this demo only; actual stock and service must be confirmed with the restaurant.',
  descriptionNotice: 'Descriptions are demo copy, not verified recipes, ingredients, portions or dietary guidance.',
  chargesNotice: 'Taxes and service charges are unverified and excluded from this demo estimate.',
  allergyNotice: 'Confirm ingredients, allergens and cross-contact with restaurant staff. No allergen-free preparation is guaranteed.',
  demoNotice: 'Planning demo only. No real order, payment, reservation, calendar invitation or staff notification is submitted.',
  variantNotice: 'Solo, sharing, pizza size and cheese-wheel entries are distinct selections. Cheese-wheel prices are full entry prices, not add-on fees. Portion suitability requires confirmation.',
});
