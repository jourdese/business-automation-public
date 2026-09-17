import { wildTreeMenu, wildTreeMenuPolicy, type WildTreeCategory, type WildTreeMenuItem } from './menu.ts';

export const restaurantContent = Object.freeze({
  name: 'The Wild Tree',
  ...wildTreeMenuPolicy,
  signatureCategoryLabel: 'Wild Tree Signatures · demo concepts',
});
export const menuCategories: readonly WildTreeCategory[] = Object.freeze([
  'Appetizers', 'Thai', 'Filipino', 'Wild Tree Signatures', 'Rice & Noodles',
  'Vegetables', 'Sides', 'Desserts', 'Drinks',
]);
export type WildTreeDish = Readonly<WildTreeMenuItem & {
  id: string; price: number; image: string | null; priceNote: string; sourceLabel: string;
}>;

/** Normalize cents once for the existing major-unit meal planner. Never hand-enter a second price. */
export const allDishes: readonly WildTreeDish[] = Object.freeze(wildTreeMenu.map(entry => Object.freeze({
  ...entry, id: entry.key, price: entry.priceCents / 100,
  image: entry.sourceAsset ? entry.key : null,
  priceNote: 'Demo price',
  sourceLabel: entry.isMock ? 'Demo concept' : 'Photo-backed name · demo price',
})));
export const dishById: Readonly<Record<string, WildTreeDish | undefined>> = Object.freeze(
  Object.fromEntries(allDishes.map(dish => [dish.id, dish])),
);
export function peso(value: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value);
}
