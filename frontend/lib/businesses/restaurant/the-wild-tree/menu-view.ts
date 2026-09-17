import { allDishes, type WildTreeDish } from './content.ts';
import type { WildTreeCategory } from './menu.ts';
export type MenuOrigin = 'all' | 'supplied-photo' | 'mock-concept';
export type MenuFilter = WildTreeCategory | 'All';
const normalize = (text: string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function filterWildTreeMenu(query: string, category: MenuFilter = 'All', origin: MenuOrigin = 'all'): readonly WildTreeDish[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return allDishes.filter(dish => {
    if (category !== 'All' && dish.category !== category) return false;
    if (origin !== 'all' && dish.source !== origin) return false;
    const searchable = normalize([dish.name, dish.category, ...dish.aliases].join(' '));
    return terms.every(term => searchable.includes(term));
  });
}
