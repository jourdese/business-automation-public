import { marinaraMenu, marinaraMenuPolicy } from './menu.ts';
export const restaurantContent = Object.freeze({ name: 'Marinara Ristorante', fullName: 'Marinara Ristorante Bistro & Pub', ...marinaraMenuPolicy });
export const menuCategories = Object.freeze([...new Set(marinaraMenu.map(item => item.category))]);
export const allDishes = Object.freeze(marinaraMenu.map(item => Object.freeze({
  ...item, id: item.key, price: item.priceCents / 100, image: null,
  sourceLabel: item.isMock ? 'Demo concept' : 'Archived 2025 menu', priceNote: 'Demo price · confirm current price',
})));
export type MarinaraDish = (typeof allDishes)[number];
export const dishById: Readonly<Record<string, MarinaraDish | undefined>> = Object.freeze(Object.fromEntries(allDishes.map(item => [item.id, item])));
export function peso(value: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value);
}
