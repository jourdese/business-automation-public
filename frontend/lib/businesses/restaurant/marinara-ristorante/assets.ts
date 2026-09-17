/// <reference types="vite/client" />
import logoFull from '@/src/assets/businesses/restaurant/marinara-ristorante/branding/marinara-buon-cibo-logo-full.png?url';
import brandMark from '@/src/assets/businesses/restaurant/marinara-ristorante/branding/marinara-buon-cibo-logo.png?url';
import motto from '@/src/assets/businesses/restaurant/marinara-ristorante/branding/marinara-buon-cibo.png?url';
import cover from '@/src/assets/businesses/restaurant/marinara-ristorante/branding/marinara-coverphoto.jpg?url';
import logoClear from '@/src/assets/businesses/restaurant/marinara-ristorante/branding/marinara-logo-clear.png?url';
import logoThumb from '@/src/assets/businesses/restaurant/marinara-ristorante/branding/marinara-logo-meta-thumbnail.png?url';
import logoRed from '@/src/assets/businesses/restaurant/marinara-ristorante/branding/marinara-logo.jpg?url';
import interior from '@/src/assets/businesses/restaurant/marinara-ristorante/atmosphere/marinara-interior.jpg?url';
import food01 from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-1.jpg?url';
import food02 from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-2.jpg?url';
import food03 from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-3.jpg?url';
import food04 from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-4.jpg?url';
import food05 from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-5.jpg?url';
import food06 from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-6.jpg?url';
import food07 from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-7.jpg?url';
import food08 from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-8.jpg?url';
import food09 from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-9.jpg?url';
import food10 from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-10.jpg?url';
import food11 from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-11.jpg?url';
import food12 from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-12.jpg?url';
import arugula from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-Arugula Salad with Peaches and Pecan.jpg?url';
import burrata from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-Burrata Pizza.jpg?url';
import cucumberLemon from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-Cucumber Lemon.jpg?url';
import salmon from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-Grilled Salmon Fillet.jpg?url';
import chickenMushroom from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-Herb Spring Chicken in Mushroom.jpg?url';
import honeyLemon from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-Honey Lemon.jpg?url';
import keyLime from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-Key Lime Cheesecake.jpg?url';
import orangeJuice from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-Orange Juice.jpg?url';
import quattro from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-Quattro Formaggi Pizza.jpg?url';
import sangria from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-Sangria.jpg?url';
import seafood from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-Seafood Marinara.jpg?url';
import cranberry from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-Shrimp & Cranberry Salad.jpg?url';
import alfredo from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-Shrimp & Mushroom Alfredo.jpg?url';
import coffee from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-coffee.jpg?url';
import dolceMamma from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-dolce-mamma-set.jpg?url';
import gardenAmore from '@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-garden-amore-set.jpg?url';

function assetUrl(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'src' in value && typeof value.src === 'string') return value.src;
  throw new Error('Invalid Marinara asset import.');
}

export const assets = Object.freeze({
  logoFull: assetUrl(logoFull), brandMark: assetUrl(brandMark), motto: assetUrl(motto), cover: assetUrl(cover),
  logoClear: assetUrl(logoClear), logoThumb: assetUrl(logoThumb), logoRed: assetUrl(logoRed), interior: assetUrl(interior),
});

export const namedDishImages: Readonly<Record<string, string | undefined>> = Object.freeze({
  'arugula with peach pecan': assetUrl(arugula), 'arugula salad with peaches and pecan': assetUrl(arugula),
  'burrata': assetUrl(burrata), 'burrata pizza': assetUrl(burrata), 'cucumber lemon': assetUrl(cucumberLemon),
  'grilled salmon fillet': assetUrl(salmon), 'herb spring chicken in mushroom': assetUrl(chickenMushroom),
  'honey lemon': assetUrl(honeyLemon), 'key lime cheesecake': assetUrl(keyLime), 'orange juice': assetUrl(orangeJuice),
  'quattro formaggi': assetUrl(quattro), 'quattro formaggi pizza': assetUrl(quattro), 'sangria': assetUrl(sangria),
  'seafood marinara': assetUrl(seafood), 'shrimp cranberry salad': assetUrl(cranberry), 'shrimp and cranberry salad': assetUrl(cranberry),
  'shrimp mushroom alfredo': assetUrl(alfredo), 'shrimp and mushroom alfredo': assetUrl(alfredo), 'coffee': assetUrl(coffee),
});

export type MarinaraGalleryImage = { id: string; src: string; alt: string; label: string };
export const foodGallery: readonly MarinaraGalleryImage[] = Object.freeze([
  { id: 'plate-01', src: assetUrl(food01), alt: 'Supplied Marinara plated dish photograph', label: 'From the table' },
  { id: 'plate-02', src: assetUrl(food02), alt: 'Supplied Marinara creamy pasta photograph', label: 'Pasta moment' },
  { id: 'plate-03', src: assetUrl(food03), alt: 'Supplied Marinara sauced main photograph', label: 'Bistro comfort' },
  { id: 'dessert-04', src: assetUrl(food04), alt: 'Supplied Marinara dessert photograph', label: 'Something sweet' },
  { id: 'dessert-05', src: assetUrl(food05), alt: 'Supplied Marinara layered dessert photograph', label: 'Dolce' },
  { id: 'dessert-06', src: assetUrl(food06), alt: 'Supplied Marinara chocolate dessert photograph', label: 'After dinner' },
  { id: 'dessert-07', src: assetUrl(food07), alt: 'Supplied Marinara cheesecake photograph', label: 'One more slice' },
  { id: 'pizza-08', src: assetUrl(food08), alt: 'Supplied Marinara pizza photograph', label: 'Pizza for the table' },
  { id: 'plate-09', src: assetUrl(food09), alt: 'Supplied Marinara grilled main photograph', label: 'From the grill' },
  { id: 'plate-10', src: assetUrl(food10), alt: 'Supplied Marinara grilled meat plate photograph', label: 'A hearty plate' },
  { id: 'drink-11', src: assetUrl(food11), alt: 'Supplied Marinara beverage photograph', label: 'Raise a glass' },
  { id: 'drink-12', src: assetUrl(food12), alt: 'Supplied Marinara drink photograph', label: 'Stay for another' },
  { id: 'arugula', src: assetUrl(arugula), alt: 'Arugula salad with peaches and pecan', label: 'Arugula · peach · pecan' },
  { id: 'burrata', src: assetUrl(burrata), alt: 'Burrata pizza', label: 'Burrata pizza' },
  { id: 'cucumber-lemon', src: assetUrl(cucumberLemon), alt: 'Cucumber lemon drink', label: 'Cucumber lemon' },
  { id: 'salmon', src: assetUrl(salmon), alt: 'Grilled salmon fillet', label: 'Grilled salmon' },
  { id: 'chicken-mushroom', src: assetUrl(chickenMushroom), alt: 'Herb spring chicken in mushroom', label: 'Herb chicken' },
  { id: 'honey-lemon', src: assetUrl(honeyLemon), alt: 'Honey lemon drink', label: 'Honey lemon' },
  { id: 'key-lime', src: assetUrl(keyLime), alt: 'Key lime cheesecake', label: 'Key lime cheesecake' },
  { id: 'orange-juice', src: assetUrl(orangeJuice), alt: 'Orange juice', label: 'Fresh orange' },
  { id: 'quattro', src: assetUrl(quattro), alt: 'Quattro Formaggi pizza', label: 'Quattro Formaggi' },
  { id: 'sangria', src: assetUrl(sangria), alt: 'Sangria', label: 'Sangria' },
  { id: 'seafood-marinara', src: assetUrl(seafood), alt: 'Seafood Marinara pasta', label: 'Seafood Marinara' },
  { id: 'cranberry-salad', src: assetUrl(cranberry), alt: 'Shrimp and cranberry salad', label: 'Shrimp & cranberry' },
  { id: 'alfredo', src: assetUrl(alfredo), alt: 'Shrimp and mushroom Alfredo', label: 'Shrimp & mushroom Alfredo' },
  { id: 'coffee', src: assetUrl(coffee), alt: 'Coffee at Marinara', label: 'Coffee after' },
  { id: 'dolce-mamma', src: assetUrl(dolceMamma), alt: 'Dolce Mamma shared table set', label: 'Dolce Mamma set' },
  { id: 'garden-amore', src: assetUrl(gardenAmore), alt: 'Garden Amore shared table set', label: 'Garden Amore set' },
]);
