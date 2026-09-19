const logoFull = "/marinara/branding/marinara-buon-cibo-logo-full.png";
const brandMark = "/marinara/branding/marinara-buon-cibo-logo.png";
const motto = "/marinara/branding/marinara-buon-cibo.png";
const cover = "/marinara/branding/marinara-coverphoto.jpg";
const logoClear = "/marinara/branding/marinara-buon-cibo-logo-orange.png";
const logoThumb = "/marinara/branding/marinara-logo-meta-thumbnail.png";
const logoRed = "/marinara/branding/marinara-logo.jpg";
const interior = "/marinara/atmosphere/marinara-interior.jpg";
const food01 = "/marinara/food/marinara-menu-1.jpg";
const food02 = "/marinara/food/marinara-menu-2.jpg";
const food03 = "/marinara/food/marinara-menu-3.jpg";
const food04 = "/marinara/food/marinara-menu-4.jpg";
const food05 = "/marinara/food/marinara-menu-5.jpg";
const food06 = "/marinara/food/marinara-menu-6.jpg";
const food07 = "/marinara/food/marinara-menu-7.jpg";
const food08 = "/marinara/food/marinara-menu-8.jpg";
const food09 = "/marinara/food/marinara-menu-9.jpg";
const food10 = "/marinara/food/marinara-menu-10.jpg";
const food11 = "/marinara/food/marinara-menu-11.jpg";
const food12 = "/marinara/food/marinara-menu-12.jpg";
const arugula = "/marinara/food/marinara-menu-Arugula Salad with Peaches and Pecan.jpg";
const burrata = "/marinara/food/marinara-menu-Burrata Pizza.jpg";
const cucumberLemon = "/marinara/food/marinara-menu-Cucumber Lemon.jpg";
const salmon = "/marinara/food/marinara-menu-Grilled Salmon Fillet.jpg";
const chickenMushroom = "/marinara/food/marinara-menu-Herb Spring Chicken in Mushroom.jpg";
const honeyLemon = "/marinara/food/marinara-menu-Honey Lemon.jpg";
const keyLime = "/marinara/food/marinara-menu-Key Lime Cheesecake.jpg";
const orangeJuice = "/marinara/food/marinara-menu-Orange Juice.jpg";
const quattro = "/marinara/food/marinara-menu-Quattro Formaggi Pizza.jpg";
const sangria = "/marinara/food/marinara-menu-Sangria.jpg";
const seafood = "/marinara/food/marinara-menu-Seafood Marinara.jpg";
const cranberry = "/marinara/food/marinara-menu-Shrimp & Cranberry Salad.jpg";
const alfredo = "/marinara/food/marinara-menu-Shrimp & Mushroom Alfredo.jpg";
const coffee = "/marinara/food/marinara-menu-coffee.jpg";
const dolceMamma = "/marinara/food/marinara-menu-dolce-mamma-set.jpg";
const gardenAmore = "/marinara/food/marinara-menu-garden-amore-set.jpg";

function assetUrl(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "src" in value && typeof value.src === "string")
    return value.src;
  throw new Error("Invalid Marinara asset import.");
}

export const assets = Object.freeze({
  logoFull: assetUrl(logoFull),
  brandMark: assetUrl(brandMark),
  motto: assetUrl(motto),
  cover: assetUrl(cover),
  logoClear: assetUrl(logoClear),
  logoThumb: assetUrl(logoThumb),
  logoRed: assetUrl(logoRed),
  interior: assetUrl(interior),
});

export const namedDishImages: Readonly<Record<string, string | undefined>> = Object.freeze({
  "arugula with peach pecan": assetUrl(arugula),
  "arugula salad with peaches and pecan": assetUrl(arugula),
  burrata: assetUrl(burrata),
  "burrata pizza": assetUrl(burrata),
  "cucumber lemon": assetUrl(cucumberLemon),
  "grilled salmon fillet": assetUrl(salmon),
  "herb spring chicken in mushroom": assetUrl(chickenMushroom),
  "honey lemon": assetUrl(honeyLemon),
  "key lime cheesecake": assetUrl(keyLime),
  "orange juice": assetUrl(orangeJuice),
  "quattro formaggi": assetUrl(quattro),
  "quattro formaggi pizza": assetUrl(quattro),
  sangria: assetUrl(sangria),
  "seafood marinara": assetUrl(seafood),
  "shrimp cranberry salad": assetUrl(cranberry),
  "shrimp and cranberry salad": assetUrl(cranberry),
  "shrimp mushroom alfredo": assetUrl(alfredo),
  "shrimp and mushroom alfredo": assetUrl(alfredo),
  coffee: assetUrl(coffee),
});

export type MarinaraGalleryImage = { id: string; src: string; alt: string; label: string };
export const foodGallery: readonly MarinaraGalleryImage[] = Object.freeze([
  {
    id: "plate-01",
    src: assetUrl(food01),
    alt: "Supplied Marinara plated dish photograph",
    label: "From the table",
  },
  {
    id: "plate-02",
    src: assetUrl(food02),
    alt: "Supplied Marinara creamy pasta photograph",
    label: "Pasta moment",
  },
  {
    id: "plate-03",
    src: assetUrl(food03),
    alt: "Supplied Marinara sauced main photograph",
    label: "Bistro comfort",
  },
  {
    id: "dessert-04",
    src: assetUrl(food04),
    alt: "Supplied Marinara dessert photograph",
    label: "Something sweet",
  },
  {
    id: "dessert-05",
    src: assetUrl(food05),
    alt: "Supplied Marinara layered dessert photograph",
    label: "Dolce",
  },
  {
    id: "dessert-06",
    src: assetUrl(food06),
    alt: "Supplied Marinara chocolate dessert photograph",
    label: "After dinner",
  },
  {
    id: "dessert-07",
    src: assetUrl(food07),
    alt: "Supplied Marinara cheesecake photograph",
    label: "One more slice",
  },
  {
    id: "pizza-08",
    src: assetUrl(food08),
    alt: "Supplied Marinara pizza photograph",
    label: "Pizza for the table",
  },
  {
    id: "plate-09",
    src: assetUrl(food09),
    alt: "Supplied Marinara grilled main photograph",
    label: "From the grill",
  },
  {
    id: "plate-10",
    src: assetUrl(food10),
    alt: "Supplied Marinara grilled meat plate photograph",
    label: "A hearty plate",
  },
  {
    id: "drink-11",
    src: assetUrl(food11),
    alt: "Supplied Marinara beverage photograph",
    label: "Raise a glass",
  },
  {
    id: "drink-12",
    src: assetUrl(food12),
    alt: "Supplied Marinara drink photograph",
    label: "Stay for another",
  },
  {
    id: "arugula",
    src: assetUrl(arugula),
    alt: "Arugula salad with peaches and pecan",
    label: "Arugula · peach · pecan",
  },
  { id: "burrata", src: assetUrl(burrata), alt: "Burrata pizza", label: "Burrata pizza" },
  {
    id: "cucumber-lemon",
    src: assetUrl(cucumberLemon),
    alt: "Cucumber lemon drink",
    label: "Cucumber lemon",
  },
  { id: "salmon", src: assetUrl(salmon), alt: "Grilled salmon fillet", label: "Grilled salmon" },
  {
    id: "chicken-mushroom",
    src: assetUrl(chickenMushroom),
    alt: "Herb spring chicken in mushroom",
    label: "Herb chicken",
  },
  { id: "honey-lemon", src: assetUrl(honeyLemon), alt: "Honey lemon drink", label: "Honey lemon" },
  {
    id: "key-lime",
    src: assetUrl(keyLime),
    alt: "Key lime cheesecake",
    label: "Key lime cheesecake",
  },
  { id: "orange-juice", src: assetUrl(orangeJuice), alt: "Orange juice", label: "Fresh orange" },
  {
    id: "quattro",
    src: assetUrl(quattro),
    alt: "Quattro Formaggi pizza",
    label: "Quattro Formaggi",
  },
  { id: "sangria", src: assetUrl(sangria), alt: "Sangria", label: "Sangria" },
  {
    id: "seafood-marinara",
    src: assetUrl(seafood),
    alt: "Seafood Marinara pasta",
    label: "Seafood Marinara",
  },
  {
    id: "cranberry-salad",
    src: assetUrl(cranberry),
    alt: "Shrimp and cranberry salad",
    label: "Shrimp & cranberry",
  },
  {
    id: "alfredo",
    src: assetUrl(alfredo),
    alt: "Shrimp and mushroom Alfredo",
    label: "Shrimp & mushroom Alfredo",
  },
  { id: "coffee", src: assetUrl(coffee), alt: "Coffee at Marinara", label: "Coffee after" },
  {
    id: "dolce-mamma",
    src: assetUrl(dolceMamma),
    alt: "Dolce Mamma shared table set",
    label: "Dolce Mamma set",
  },
  {
    id: "garden-amore",
    src: assetUrl(gardenAmore),
    alt: "Garden Amore shared table set",
    label: "Garden Amore set",
  },
]);
