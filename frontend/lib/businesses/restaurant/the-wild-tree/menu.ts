/** Approved demo seed. Photo-backed NAMES are not verified prices or recipes.
 * All prices, descriptions and availability are demo data; never publish as a live menu.
 * Keep this canonical array shared by the frontend view model and database seed export.
 */
export const WILD_TREE_PRESET_KEY = 'demo_restaurant_the_wild_tree.v1';
export const WILD_TREE_MENU_VERSION = 'wild-tree-menu.v1';

export type WildTreeCategory = 'Thai' | 'Filipino' | 'Desserts' | 'Appetizers' |
  'Wild Tree Signatures' | 'Rice & Noodles' | 'Vegetables' | 'Sides' | 'Drinks';
export type WildTreeMenuItem = Readonly<{
  key: string; name: string; category: WildTreeCategory; priceCents: number;
  active: true; available: true; aliases: readonly string[]; description: string;
  isMock: boolean; source: 'supplied-photo' | 'mock-concept'; sourceAsset: string | null;
  priceSource: 'mock'; descriptionSource: 'demo-copy'; availabilitySource: 'demo-only';
}>;

function item(key: string, name: string, category: WildTreeCategory, priceCents: number,
  aliases: readonly string[], description: string, sourceAsset: string | null = null): WildTreeMenuItem {
  if (!/^[a-z][a-z0-9_]*$/.test(key) || !Number.isSafeInteger(priceCents) || priceCents <= 0) {
    throw new Error(`Invalid Wild Tree demo menu entry: ${key}`);
  }
  return Object.freeze({ key, name, category, priceCents, aliases: Object.freeze([...aliases]),
    description, active: true, available: true, isMock: sourceAsset === null,
    source: sourceAsset ? 'supplied-photo' : 'mock-concept', sourceAsset,
    priceSource: 'mock', descriptionSource: 'demo-copy', availabilitySource: 'demo-only' });
}

export const wildTreeOriginalMenu: readonly WildTreeMenuItem[] = Object.freeze([
  item("chicken_pandan", "Chicken Pandan", "Thai", 29500, ["pandan chicken", "chicken pandan"], "Tender marinated chicken wrapped in fragrant pandan leaves, served with a savory dipping sauce.", "the-wild-tree_Menu-Appetizer.jpg"),
  item("beef_satay", "Beef Satay", "Thai", 32500, ["satay", "beef skewers"], "Beef skewers marinated in aromatic spices, grilled and served with a rich, creamy peanut sauce.", "the-wild-tree_Menu-Satay.jpg"),
  item("pomelo_salad", "Pomelo Salad", "Thai", 29500, ["pomelo", "thai pomelo salad"], "A fresh, bright salad layered with texture.", "the-wild-tree_Menu-Pomelo-Salad.jpg"),
  item("chu_chee_pla", "Chu Chee Pla", "Thai", 49500, ["chu chee pla", "fish curry", "thai fish curry"], "A richly sauced Thai fish dish featured in The Wild Tree menu photography.", "the-wild-tree_Menu-Thai-Group-1.jpg"),
  item("tom_yum_goong", "Tom Yum Goong", "Thai", 42500, ["tom yum", "tom yum soup", "prawn soup", "shrimp soup", "shrimp tom yum"], "Bold, sour, spicy, and aromatic.", "the-wild-tree_Menu-Tom-Yum-Goong.jpg"),
  item("pad_thai", "Pad Thai", "Thai", 45500, ["padthai", "thai noodles"], "A classic balance of tamarind, noodles, and shrimp.", "the-wild-tree_Menu-Pad-Thai.jpg"),
  item("crab_curry", "Crab Curry", "Thai", 59500, ["pu pad pong karee", "pu pad pong curry", "thai crab curry"], "Crab prepared in the Thai Pu Pad Pong Karee style.", "the-wild-tree_Menu-Crab-Curry.jpg"),
  item("crab_fried_rice", "Crab Fried Rice", "Thai", 42500, ["khao pad pu", "crab rice", "thai crab fried rice"], "Thai-style crab fried rice, presented as Khao Pad Pu.", "the-wild-tree_Menu-Crab-Fried-Rice.jpg"),
  item("deep_fried_sea_bass", "Deep Fried Sea Bass", "Thai", 69500, ["sea bass", "fried sea bass", "deep fried seabass"], "Crisp, bright, and made for the table.", "the-wild-tree_Menu-Deep-See-Bass.jpg"),
  item("thai_steak", "Thai Steak", "Thai", 54500, ["neua yang nam tok", "nam tok", "thai beef", "thai beef steak"], "Grilled Thai-style beef presented as Neua Yang Nam Tok.", "the-wild-tree_Menu-Thai-Steak.jpg"),
  item("spicy_pork_spine_soup", "Spicy Pork Spine Soup", "Thai", 49500, ["leng saap", "leng saab", "pork spine soup", "spicy pork soup"], "The Wild Tree presentation of the Thai pork-spine soup Leng Saap.", "the-wild-tree_Menu-Spicey-Pork-Spine-Soup.jpg"),
  item("beef_kare_kare", "Beef Kare-Kare", "Filipino", 61500, ["kare kare", "kare-kare", "beef kare kare"], "Familiar richness, refined for the table.", "the-wild-tree_Menu-Kare-Kare.jpg"),
  item("pork_kawali", "Pork Kawali", "Filipino", 42500, ["kawali", "lechon kawali", "pork kawali"], "Crispy texture filled with Filipino warmth.", "the-wild-tree_Menu-Pork-Kawali.jpg"),
  item("lumpiang_shanghai", "Lumpiang Shanghai", "Filipino", 29500, ["lumpia", "shanghai", "lumpiang shanghai"], "A crisp, familiar taste made for sharing.", "the-wild-tree_Menu-Lumpiang-Shanghai.jpg"),
  item("native_chicken_tinola", "Native Chicken Tinola", "Filipino", 44500, ["tinola", "chicken tinola", "native chicken", "native chicken tinola"], "Warm Filipino comfort served around the table.", "the-wild-tree_Menu-Chicken-Tinola.jpg"),
  item("mango_sticky_rice", "Mango Sticky Rice", "Desserts", 25500, ["sticky rice", "mango rice", "thai mango sticky rice"], "A sweet traditional dessert with a tropical finish.", "the-wild-tree_Menu-Mango-Sticky-Rice.jpg"),
  item("thai_tea_panna_cotta", "Thai Tea Panna Cotta", "Desserts", 24500, ["panna cotta", "thai tea dessert", "thai panna cotta"], "Thai tea, softly set and delicately sweet.", "the-wild-tree_Menu-Thai-Tea-Panna-Cotta.jpg"),
]);

// Invented additions approved for this demo, including the proposed signature concepts.
export const wildTreeMockMenuExpansion: readonly WildTreeMenuItem[] = Object.freeze([
  item("thai_vegetable_spring_rolls", "Thai Vegetable Spring Rolls", "Appetizers", 25500, ["vegetable spring rolls", "thai spring rolls", "spring rolls"], "Crisp vegetable spring rolls served with a sweet-tangy Thai dipping sauce."),
  item("shrimp_cakes", "Thai Shrimp Cakes", "Appetizers", 36500, ["shrimp cakes", "prawn cakes", "tod mun goong"], "Golden shrimp cakes with a crisp exterior and a light sweet chili dip."),
  item("green_papaya_salad", "Green Papaya Salad", "Appetizers", 29500, ["som tam", "som tum", "papaya salad", "green papaya"], "Shredded green papaya tossed with lime, chili, tomato, peanuts and a bright Thai dressing."),
  item("wild_tree_tamarind_wings", "Wild Tree Tamarind Wings", "Wild Tree Signatures", 38500, ["tamarind wings", "thai chicken wings", "wild tree wings"], "Crispy chicken wings glazed with tamarind, chili and a touch of palm sugar."),
  item("crispy_squid_nam_jim", "Crispy Squid with Nam Jim", "Appetizers", 39500, ["crispy squid", "fried squid", "calamari", "calamares"], "Crisp squid served with a bright lime, chili and herb dipping sauce."),
  item("tom_kha_gai", "Tom Kha Gai", "Thai", 39500, ["tom kha", "coconut chicken soup", "thai coconut soup"], "Aromatic chicken and coconut soup with galangal, lemongrass, lime leaf and herbs."),
  item("green_curry_chicken", "Thai Green Curry Chicken", "Thai", 45500, ["green curry", "chicken green curry", "gaeng kiew wan"], "Chicken simmered in fragrant green curry and coconut milk with vegetables and Thai basil."),
  item("panang_beef", "Panang Beef Curry", "Thai", 51500, ["panang curry", "beef panang", "panang beef"], "Tender beef in a rich Panang curry with coconut milk, kaffir lime and basil."),
  item("pad_kra_pao_pork", "Thai Basil Pork", "Thai", 42500, ["pad kra pao", "pad krapow", "basil pork", "thai pork basil"], "Savory stir-fried pork with garlic, chili and fragrant Thai basil."),
  item("cashew_chicken", "Thai Cashew Chicken", "Thai", 44500, ["cashew chicken", "chicken cashew", "thai chicken with cashews"], "Stir-fried chicken, roasted cashews, vegetables and dried chili in a savory Thai sauce."),
  item("pineapple_fried_rice", "Thai Pineapple Fried Rice", "Rice & Noodles", 39500, ["pineapple rice", "pineapple fried rice", "thai fried rice"], "Thai fried rice with pineapple, egg, vegetables and roasted cashews."),
  item("crispy_pork_sisig", "Crispy Pork Sisig", "Filipino", 39500, ["sisig", "pork sisig", "crispy sisig"], "Crisp pork with onion, chili and calamansi, served sizzling and made for sharing."),
  item("sinigang_na_hipon", "Sinigang na Hipon", "Filipino", 49500, ["shrimp sinigang", "sinigang shrimp", "sinigang na hipon"], "Shrimp and vegetables in a bright, sour tamarind broth."),
  item("bicol_express", "Bicol Express", "Filipino", 39500, ["bicol express", "spicy pork coconut"], "Pork slowly cooked in coconut milk with chili and savory bagoong."),
  item("inihaw_na_pusit", "Inihaw na Pusit", "Filipino", 49500, ["grilled squid", "inihaw pusit", "pusit"], "Grilled squid served with tomato, onion and a calamansi-soy dipping sauce."),
  item("pinakbet", "Pinakbet", "Filipino", 32500, ["pinakbet", "pakbet", "mixed filipino vegetables"], "A comforting mix of Filipino vegetables sautéed with savory bagoong."),
  item("crispy_pata", "Crispy Pata", "Filipino", 89500, ["crispy pata", "pork knuckle"], "Crisp pork knuckle with tender meat inside, served for the center of the table."),
  item("wild_tree_nam_jim_kawali", "Wild Tree Nam Jim Kawali", "Wild Tree Signatures", 46500, ["nam jim kawali", "thai lechon kawali", "wild tree kawali", "crispy pork nam jim"], "Crispy pork kawali paired with a fresh Thai-style lime, garlic and chili nam jim."),
  item("wild_tree_pomelo_mango_salad", "Wild Tree Pomelo & Green Mango Salad", "Wild Tree Signatures", 32500, ["pomelo mango salad", "green mango salad", "wild tree salad"], "Pomelo and green mango with herbs, roasted peanuts and a calamansi-lime dressing."),
  item("wild_tree_coconut_tinola", "Wild Tree Coconut Tinola", "Wild Tree Signatures", 46500, ["coconut tinola", "thai tinola", "wild tree tinola"], "Native chicken tinola gently enriched with coconut, lemongrass and fresh herbs."),
  item("wild_tree_basil_bagoong_rice", "Thai Basil Bagoong Rice", "Wild Tree Signatures", 38500, ["bagoong rice", "thai bagoong rice", "basil rice"], "Savory fried rice with Thai basil, vegetables and a Filipino bagoong accent."),
  item("wild_tree_calamansi_pandan_chicken", "Calamansi Pandan Chicken", "Wild Tree Signatures", 42500, ["calamansi chicken", "pandan calamansi chicken", "wild tree pandan chicken"], "A Wild Tree take on pandan chicken with a bright calamansi glaze."),
  item("morning_glory", "Stir-Fried Morning Glory", "Vegetables", 29500, ["morning glory", "water spinach", "pak boong", "kangkong"], "Water spinach quickly stir-fried with garlic, chili and savory seasoning."),
  item("jasmine_rice", "Jasmine Rice", "Sides", 6500, ["rice", "thai rice", "steamed rice", "jasmine rice"], "Steamed fragrant jasmine rice."),
  item("garlic_rice", "Garlic Rice", "Sides", 8500, ["sinangag", "garlic fried rice", "garlic rice"], "Filipino-style garlic rice, ideal alongside grilled and saucy dishes."),
  item("coconut_ice_cream", "Coconut Ice Cream", "Desserts", 18500, ["coconut ice cream", "thai coconut ice cream"], "Creamy coconut ice cream with toasted coconut and a light salty finish."),
  item("wild_tree_ube_sticky_rice", "Ube Coconut Sticky Rice", "Wild Tree Signatures", 26500, ["ube sticky rice", "ube coconut rice", "ube dessert"], "Thai-inspired coconut sticky rice paired with distinctly Filipino ube."),
  item("pandan_coconut_pudding", "Pandan Coconut Pudding", "Desserts", 22500, ["pandan pudding", "coconut pudding", "pandan dessert"], "Soft pandan and coconut pudding with a delicate tropical sweetness."),
  item("thai_milk_tea", "Thai Milk Tea", "Drinks", 18500, ["thai tea", "thai iced tea", "cha yen", "milk tea"], "Classic Thai tea served cold with milk."),
  item("iced_pandan_tea", "Iced Pandan Tea", "Drinks", 14500, ["pandan tea", "iced pandan"], "A light and aromatic pandan tea served over ice."),
  item("lemongrass_calamansi_tea", "Lemongrass Calamansi Tea", "Wild Tree Signatures", 16500, ["lemongrass tea", "calamansi tea", "lemongrass calamansi"], "Fragrant lemongrass brightened with Filipino calamansi."),
  item("fresh_mango_shake", "Fresh Mango Shake", "Drinks", 18500, ["mango shake", "mango smoothie"], "Fresh mango blended until smooth and refreshing."),
  item("fresh_coconut_juice", "Fresh Coconut Juice", "Drinks", 17000, ["coconut juice", "buko juice", "fresh coconut"], "Fresh coconut juice served chilled."),
  item("wild_tree_calamansi_fizz", "Wild Tree Calamansi Fizz", "Wild Tree Signatures", 18500, ["calamansi fizz", "calamansi soda", "wild tree fizz"], "Calamansi, sparkling water and aromatic herbs for a bright house refresher."),
 ]);

export const wildTreeMenu: readonly WildTreeMenuItem[] = Object.freeze([
  ...wildTreeOriginalMenu, ...wildTreeMockMenuExpansion,
]);
if (new Set(wildTreeMenu.map(entry => entry.key)).size !== wildTreeMenu.length) {
  throw new Error('Duplicate Wild Tree menu keys.');
}
export const wildTreeMockMenuKeys: ReadonlySet<string> = new Set(wildTreeMockMenuExpansion.map(entry => entry.key));
export const wildTreeMenuPolicy = Object.freeze({
  currency: 'PHP', priceUnit: 'minor', allPricesAreMock: true,
  serviceChargePercent: null, taxIncluded: null,
  priceNotice: 'All prices shown are fictional demo prices, not The Wild Tree’s confirmed prices.',
  menuNotice: '17 dish names are supported by supplied photos. 34 additional items, including Wild Tree Signatures, are invented demo concepts.',
  availabilityNotice: 'Available means selectable in this demo only, not confirmed restaurant stock.',
  descriptionNotice: 'Descriptions are demo copy, not verified recipes, portions or dietary guidance.',
  chargesNotice: 'Taxes and service charges are unverified and excluded from this demo estimate.',
  allergyNotice: 'Confirm ingredients and allergy requirements directly with restaurant staff. No allergen-free preparation is guaranteed.',
  demoNotice: 'Planning demo only. No real kitchen order, payment or table reservation is submitted.',
});
