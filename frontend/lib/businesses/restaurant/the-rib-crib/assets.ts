/// <reference types="vite/client" />
// Build-time URLs preserve Vite asset fingerprinting. No raw /src browser paths.
import hero from '@/src/assets/businesses/restaurant/the-rib-crib/food/rib-crib-hero-bbq-wings.png?url';
import interior from '@/src/assets/businesses/restaurant/the-rib-crib/atmosphere/rib-crib-restaurant-interior.jpg?url';
import interiorQuote from '@/src/assets/businesses/restaurant/the-rib-crib/atmosphere/rib-crib-restaurant-interior.png?url';
import wood from '@/src/assets/businesses/restaurant/the-rib-crib/atmosphere/rib-crib-dark-wood-background.png?url';
import orders from '@/src/assets/businesses/restaurant/the-rib-crib/atmosphere/rib-crib-orders-bbq-background.png?url';
import emblem from '@/src/assets/businesses/restaurant/the-rib-crib/branding/rib-crib-emblem.png?url';
import footer from '@/src/assets/businesses/restaurant/the-rib-crib/branding/rib-crib-footer-brand-lockup.png?url';
import wordmark from '@/src/assets/businesses/restaurant/the-rib-crib/branding/TheRibCribWhite.png?url';
import eatMeat from '@/src/assets/businesses/restaurant/the-rib-crib/branding/eat-meat-repeat.png?url';
import togetherQuote from '@/src/assets/businesses/restaurant/the-rib-crib/branding/rib-crib-good-food-good-people.png?url';
import flame from '@/src/assets/businesses/restaurant/the-rib-crib/branding/rib-crib-icon-signature-flavors.png?url';
import bbqQuote from '@/src/assets/businesses/restaurant/the-rib-crib/branding/rib-crib-life-is-better-with-bbq.png?url';
import fries from '@/src/assets/businesses/restaurant/the-rib-crib/food/rib-crib-plain-fries.png?url';
import salad from '@/src/assets/businesses/restaurant/the-rib-crib/food/rib-crib-salad.png?url';
import tacos from '@/src/assets/businesses/restaurant/the-rib-crib/food/rib-crib-sisig-tacos.png?url';
import wings from '@/src/assets/businesses/restaurant/the-rib-crib/food/rib-crib-chicken-wings-6pcs.png?url';
import ribs from '@/src/assets/businesses/restaurant/the-rib-crib/food/rib-crib-barbecue-ribs-2pcs.png?url';
import unlimited from '@/src/assets/businesses/restaurant/the-rib-crib/food/rib-crib-unlimited-wings.png?url';
import juice from '@/src/assets/businesses/restaurant/the-rib-crib/food/rib-crib-juice.png?url';
import tea from '@/src/assets/businesses/restaurant/the-rib-crib/food/rib-crib-iced-tea.png?url';
import platter from '@/src/assets/businesses/restaurant/the-rib-crib/food/rib-crib-platter.png?url';
import platterRibs from '@/src/assets/businesses/restaurant/the-rib-crib/food/rib-crib-platter-with-ribs.png?url';
import barkada from '@/src/assets/businesses/restaurant/the-rib-crib/food/rib-crib-barkada-platter.png?url';
import bbqPlatter from '@/src/assets/businesses/restaurant/the-rib-crib/food/rib-crib-bbq-ribs-platter.png?url';
import mega from '@/src/assets/businesses/restaurant/the-rib-crib/food/rib-crib-mega-platter.png?url';

// Handles the string URLs and static-image module shape used by the existing SSR pipeline.
function assetUrl(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'src' in value && typeof value.src === 'string') return value.src;
  return '';
}

export const assets: Record<string, string> = {
  hero: assetUrl(hero),
  interior: assetUrl(interior),
  interiorQuote: assetUrl(interiorQuote),
  wood: assetUrl(wood),
  orders: assetUrl(orders),
  emblem: assetUrl(emblem),
  footer: assetUrl(footer),
  wordmark: assetUrl(wordmark),
  eatMeat: assetUrl(eatMeat),
  togetherQuote: assetUrl(togetherQuote),
  flame: assetUrl(flame),
  bbqQuote: assetUrl(bbqQuote),
  fries: assetUrl(fries),
  salad: assetUrl(salad),
  tacos: assetUrl(tacos),
  wings: assetUrl(wings),
  ribs: assetUrl(ribs),
  unlimited: assetUrl(unlimited),
  juice: assetUrl(juice),
  tea: assetUrl(tea),
  platter: assetUrl(platter),
  platterRibs: assetUrl(platterRibs),
  barkada: assetUrl(barkada),
  bbqPlatter: assetUrl(bbqPlatter),
  mega: assetUrl(mega),
};
