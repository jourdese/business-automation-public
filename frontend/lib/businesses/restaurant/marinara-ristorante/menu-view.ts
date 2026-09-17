import { allDishes, type MarinaraDish } from './content.ts';

function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function filterMarinaraMenu(query = '', category = 'All', source: 'all' | 'archived-menu-photo' | 'mock-concept' = 'all'): MarinaraDish[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  return allDishes.filter((dish) => {
    if (category !== 'All' && dish.category !== category) return false;
    if (source !== 'all' && dish.source !== source) return false;
    const haystack = normalize([dish.name, dish.printedName, dish.variant || '', dish.category, ...dish.aliases].join(' '));
    return tokens.every((token) => haystack.includes(token));
  });
}

export function imageLookupKey(value: string): string {
  return normalize(value);
}
