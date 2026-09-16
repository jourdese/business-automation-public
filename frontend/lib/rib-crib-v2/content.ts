/** Restaurant-facing content is kept separate from presentation and the Jourvis preset.
 * Prices/inclusions: supplied menu photographs; date unknown. See docs/rib-crib-v2/research.md.
 * These are indicative menu references, never live stock, availability or booking promises.
 */
export type MenuCategory = 'Ribs & wings' | 'Small plates' | 'Drinks' | 'Platters';
export type Dish = {
  id: string;
  name: string;
  category: MenuCategory;
  price: number | null;
  image: string;
  description: string;
  portion?: string;
  source: 'menu-1' | 'menu-2';
  priceNote?: string;
};

export const restaurantContent = {
  name: 'The Rib Crib',
  facebook: 'https://www.facebook.com/theribcrib.tcph',
  hero: {
    eyebrow: 'Ribs. Wings. Platters.',
    title: 'Bring your appetite.',
    aside: 'And your favourite people.',
    description: 'A little of this. A plate of that. Find your next craving, put a feast together, and make a plan to meet.',
    action: 'Explore the menu',
  },
  priceDisclaimer: 'Menu prices are indicative. Please confirm current prices, inclusions and availability with the restaurant.',
  imageDisclaimer: 'Food and atmosphere imagery is illustrative brand artwork; actual presentation may differ.',
  demoDisclaimer: 'This is a Jourvis demo. No kitchen order or table reservation is submitted.',
} as const;

export const dishes: readonly Dish[] = [
  { id: 'ribs', name: 'Barbecue Ribs', category: 'Ribs & wings', price: 395, image: 'ribs', portion: '2 pieces · house special', description: 'Two pieces of barbecue ribs, with unlimited rice and iced tea. A good place to begin.', source: 'menu-1' },
  { id: 'wings', name: 'Chicken Wings', category: 'Ribs & wings', price: 245, image: 'wings', portion: '6 pieces · house special', description: 'Six wings with unlimited rice and iced tea. Choose your flavour with the restaurant. This is the house special, not the wings-only option.', source: 'menu-1' },
  { id: 'unlimited', name: 'Unlimited Wings', category: 'Ribs & wings', price: 325, image: 'unlimited', portion: 'Rice & iced tea', description: 'Wings, rice and iced tea. Ask the restaurant about the current unlimited-wings offer and its terms.', source: 'menu-2' },
  { id: 'tacos', name: 'Sisig Tacos', category: 'Small plates', price: null, image: 'tacos', description: 'Sisig, in a taco. Ask the restaurant to confirm the current price before making your plan.', source: 'menu-1', priceNote: 'Ask for today’s price' },
  { id: 'fries', name: 'Plain Fries', category: 'Small plates', price: 115, image: 'fries', description: 'Start with fries, or add a side to your ribs and wings.', source: 'menu-1' },
  { id: 'salad', name: 'Rib Crib Salad', category: 'Small plates', price: 325, image: 'salad', description: 'A different direction for your table. Ask about the current ingredients and any dietary requirements.', source: 'menu-1' },
  { id: 'juice', name: 'Juice', category: 'Drinks', price: 55, image: 'juice', description: 'Something to sip alongside your meal. Ask about the available flavours.', source: 'menu-2' },
  { id: 'iced-tea', name: 'Iced Tea', category: 'Drinks', price: 25, image: 'tea', portion: 'By the glass', description: 'A glass of iced tea for the table.', source: 'menu-2' },
];

export const platters: readonly Dish[] = [
  { id: 'rib-crib-platter', name: 'Rib Crib Platter', category: 'Platters', price: 875, image: 'platter', portion: '6 cups of rice', description: '18 pieces of chicken wings, calamares, dynamitas, cheesy bacon fries and 6 cups of rice.', source: 'menu-2' },
  { id: 'platter-ribs', name: 'Rib Crib Platter with Ribs', category: 'Platters', price: 1045, image: 'platterRibs', portion: '6 cups of rice', description: 'A platter with ribs and 6 cups of rice. Ask the restaurant about the full assortment.', source: 'menu-2' },
  { id: 'barkada', name: 'Barkada Platter', category: 'Platters', price: 1520, image: 'barkada', portion: '8 cups of rice', description: '18 pieces of chicken wings, 6 pieces of barbecue ribs, calamares, cheesy bacon fries and 8 cups of rice.', source: 'menu-2' },
  { id: 'bbq-platter', name: 'BBQ Ribs Platter', category: 'Platters', price: 2225, image: 'bbqPlatter', portion: '8 cups of rice', description: 'A ribs-focused platter with 8 cups of rice. Ask about the full assortment and portions for your group.', source: 'menu-2' },
  { id: 'mega', name: 'Mega Platter', category: 'Platters', price: 2950, image: 'mega', portion: '8 cups of rice', description: 'Bacon-wrapped wings, chicken wings, ribs, grilled shrimps, calamares, shanghai, dynamitas, tacos, cheesy bacon fries and 8 cups of rice.', source: 'menu-2' },
];

export type MenuLine = { name: string; price: number; note?: string };
export const moreMenu: readonly { title: string; source: 'menu-1' | 'menu-2'; items: readonly MenuLine[] }[] = [
  { title: 'More starters', source: 'menu-1', items: [
    { name: 'Cheesy Bacon Fries', price: 185 }, { name: 'Buffalo Fries', price: 245 },
    { name: 'Potato Wedges', price: 215, note: 'With garlic sauce' }, { name: 'Crispy Tacos', price: 245 },
    { name: 'Rib Crib Tacos', price: 265 }, { name: 'Nachos', price: 275 },
    { name: 'Calamares', price: 245 }, { name: 'Chicken Quesadillas', price: 275 },
  ] },
  { title: 'More house specials', source: 'menu-1', items: [
    { name: 'Grilled Porkchop', price: 365, note: '2 pieces' }, { name: 'Chicken Inasal', price: 195 },
    { name: 'Belly Strips', price: 275, note: '4 pieces' }, { name: 'Bacon Wrapped Wings', price: 325 },
    { name: 'Hunger Buster', price: 375 }, { name: 'BKM', price: 425 },
  ] },
  { title: 'For sharing', source: 'menu-2', items: [
    { name: 'Salted Egg Prawns', price: 325 }, { name: 'Garlic Shrimps', price: 295 },
    { name: 'Kinilaw', price: 225 }, { name: 'Suglaw', price: 245 },
    { name: 'Pork Sisig', price: 225 }, { name: 'Pork Sisig with egg', price: 245 },
    { name: 'Rib Crib Dinakdakan', price: 265 }, { name: 'Pork/Chicken Chopsuey', price: 225 },
    { name: 'Seafood Chopsuey', price: 265 }, { name: 'Pork/Chicken Canton', price: 225 },
    { name: 'Seafood Canton', price: 265 }, { name: 'Kawali', price: 225 },
    { name: 'Sizzling Mixed Seafoods', price: 265 }, { name: 'Lumpia Shanghai', price: 210, note: '12 pieces' },
    { name: 'Pork Pinakbet', price: 245 }, { name: 'Seafood Pinakbet', price: 285 },
    { name: 'Sinigang na Baboy', price: 295 }, { name: 'Sinigang na Hipon', price: 295 },
    { name: 'Fried Chicken — half', price: 250 }, { name: 'Fried Chicken — whole', price: 450 },
    { name: 'Fish fillet', price: 275, note: 'With tartar sauce' }, { name: 'Crispy pata', price: 850 },
  ] },
  { title: 'Wings only', source: 'menu-2', items: [
    { name: '6 pieces', price: 215 }, { name: '9 pieces', price: 245 }, { name: '12 pieces', price: 325 },
    { name: '15 pieces', price: 375 }, { name: '18 pieces', price: 425 }, { name: '36 pieces', price: 775 },
    { name: '72 pieces', price: 1510 },
  ] },
  { title: 'Meats & another platter', source: 'menu-2', items: [
    { name: '2 pcs Ribs', price: 325, note: 'Without rice · corn & coleslaw' },
    { name: '4 pcs Ribs', price: 585, note: 'Without rice · corn & coleslaw' },
    { name: 'Chicken Inasal', price: 165, note: 'Without rice' },
    { name: 'Grilled Platter', price: 1845, note: '8 cups of rice' },
  ] },
  { title: 'A little extra', source: 'menu-2', items: [
    { name: 'Sizzling Brownies', price: 225 }, { name: 'Blueberry Cheesecake', price: 125 },
    { name: 'Rice', price: 25 }, { name: 'Garlic Rice', price: 45 }, { name: 'Unli Rice', price: 55 },
    { name: 'Corn', price: 25 }, { name: 'Coleslaw', price: 25 }, { name: 'Canned drinks', price: 65 },
    { name: 'Bottled water', price: 25 }, { name: 'Kalamansi', price: 35 },
  ] },
];

export const allDishes: readonly Dish[] = [...dishes, ...platters];
export const dishById = Object.fromEntries(allDishes.map((dish) => [dish.id, dish])) as Record<string, Dish | undefined>;
export const quickPrompts = ['Help me choose a platter.', 'How do pickup requests work?', 'I’d like to plan a table reservation.'];

export function peso(value: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value);
}
