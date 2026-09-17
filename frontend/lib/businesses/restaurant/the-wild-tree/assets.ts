/// <reference types="vite/client" />
// Same build-time URL pattern as Rib Crib; no raw /src browser paths.
import logoLight from '@/src/assets/businesses/restaurant/the-wild-tree/branding/wild-tree-logo-reference-matched.svg?url';
import logoDark from '@/src/assets/businesses/restaurant/the-wild-tree/branding/wild-tree-logo-espresso.png?url';
import emblem from '@/src/assets/businesses/restaurant/the-wild-tree/branding/wild-tree-tree-emblem-espresso.svg?url';
import tradition from '@/src/assets/businesses/restaurant/the-wild-tree/branding/wild-tree-taste-tradition.png?url';
import hero from '@/src/assets/businesses/restaurant/the-wild-tree/atmosphere/wild-tree-hero-interior.png?url';
import detail from '@/src/assets/businesses/restaurant/the-wild-tree/atmosphere/wild-tree-interior-detail.png?url';
import table from '@/src/assets/businesses/restaurant/the-wild-tree/atmosphere/wild-tree-shared-table.png?url';
import cocktails from '@/src/assets/businesses/restaurant/the-wild-tree/food/wild-tree-cocktail-lineup.png?url';
import hours from '@/src/assets/businesses/restaurant/the-wild-tree/source/the-wild-tree_Operating-Hours.jpg?url';
import chickenPandan from '@/src/assets/businesses/restaurant/the-wild-tree/source/the-wild-tree_Menu-Appetizer.jpg?url';
import chuCheePla from '@/src/assets/businesses/restaurant/the-wild-tree/source/the-wild-tree_Menu-Thai-Group-1.jpg?url';
import beefSatay from '@/src/assets/businesses/restaurant/the-wild-tree/food/the-wild-tree_Menu-Satay.jpg?url';
import pomelo from '@/src/assets/businesses/restaurant/the-wild-tree/food/the-wild-tree_Menu-Pomelo-Salad.jpg?url';
import tomYum from '@/src/assets/businesses/restaurant/the-wild-tree/food/the-wild-tree_Menu-Tom-Yum-Goong.jpg?url';
import padThai from '@/src/assets/businesses/restaurant/the-wild-tree/food/the-wild-tree_Menu-Pad-Thai.jpg?url';
import crabCurry from '@/src/assets/businesses/restaurant/the-wild-tree/food/the-wild-tree_Menu-Crab-Curry.jpg?url';
import crabRice from '@/src/assets/businesses/restaurant/the-wild-tree/food/the-wild-tree_Menu-Crab-Fried-Rice.jpg?url';
import seaBass from '@/src/assets/businesses/restaurant/the-wild-tree/food/the-wild-tree_Menu-Deep-See-Bass.jpg?url';
import steak from '@/src/assets/businesses/restaurant/the-wild-tree/food/the-wild-tree_Menu-Thai-Steak.jpg?url';
import porkSoup from '@/src/assets/businesses/restaurant/the-wild-tree/food/the-wild-tree_Menu-Spicey-Pork-Spine-Soup.jpg?url';
import kareKare from '@/src/assets/businesses/restaurant/the-wild-tree/food/the-wild-tree_Menu-Kare-Kare.jpg?url';
import kawali from '@/src/assets/businesses/restaurant/the-wild-tree/food/the-wild-tree_Menu-Pork-Kawali.jpg?url';
import shanghai from '@/src/assets/businesses/restaurant/the-wild-tree/food/the-wild-tree_Menu-Lumpiang-Shanghai.jpg?url';
import tinola from '@/src/assets/businesses/restaurant/the-wild-tree/food/the-wild-tree_Menu-Chicken-Tinola.jpg?url';
import mango from '@/src/assets/businesses/restaurant/the-wild-tree/food/the-wild-tree_Menu-Mango-Sticky-Rice.jpg?url';
import pannaCotta from '@/src/assets/businesses/restaurant/the-wild-tree/food/the-wild-tree_Menu-Thai-Tea-Panna-Cotta.jpg?url';

function assetUrl(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'src' in value && typeof value.src === 'string') return value.src;
  throw new Error('Invalid Wild Tree asset import.');
}
export const assets = Object.freeze(Object.fromEntries(Object.entries({
  logoLight, logoDark, emblem, tradition, hero, detail, table, cocktails, hours,
}).map(([key, value]) => [key, assetUrl(value)]))) as Readonly<Record<'logoLight' | 'logoDark' | 'emblem' | 'tradition' | 'hero' | 'detail' | 'table' | 'cocktails' | 'hours', string>>;

// Only the 17 photo-backed entries have images. Never borrow one for a mock dish.
export const menuImages: Readonly<Record<string, string | undefined>> = Object.freeze(
  Object.fromEntries(Object.entries({
    chicken_pandan: chickenPandan, beef_satay: beefSatay, pomelo_salad: pomelo,
    chu_chee_pla: chuCheePla, tom_yum_goong: tomYum, pad_thai: padThai,
    crab_curry: crabCurry, crab_fried_rice: crabRice, deep_fried_sea_bass: seaBass,
    thai_steak: steak, spicy_pork_spine_soup: porkSoup, beef_kare_kare: kareKare,
    pork_kawali: kawali, lumpiang_shanghai: shanghai, native_chicken_tinola: tinola,
    mango_sticky_rice: mango, thai_tea_panna_cotta: pannaCotta,
  }).map(([key, value]) => [key, assetUrl(value)])),
);
