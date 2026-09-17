/** Original filenames are stable provenance identifiers; only their physical folders changed. */
export const WILD_TREE_ASSET_ROOT = 'src/assets/businesses/restaurant/the-wild-tree';
export const wildTreeAssetFolders = Object.freeze({
  'the-wild-tree_Logo.jpg': 'branding',
  'wild-tree-logo-espresso.png': 'branding',
  'wild-tree-logo-reference-matched.png': 'branding',
  'wild-tree-logo-reference-matched.svg': 'branding',
  'wild-tree-taste-tradition.png': 'branding',
  'wild-tree-tree-emblem-black.png': 'branding',
  'wild-tree-tree-emblem-black.svg': 'branding',
  'wild-tree-tree-emblem-espresso.png': 'branding',
  'wild-tree-tree-emblem-espresso.svg': 'branding',
  'wild-tree-tree-emblem-white.png': 'branding',
  'wild-tree-tree-emblem-white.svg': 'branding',
  'wild-tree-hero-interior.png': 'atmosphere',
  'wild-tree-interior-detail.png': 'atmosphere',
  'wild-tree-shared-table.png': 'atmosphere',
  'the-wild-tree_Menu-Appetizer.jpg': 'source',
  'the-wild-tree_Menu-BeginwithFood-End-With-Cocktails.jpg': 'source',
  'the-wild-tree_Menu-Filipino-Group-1.jpg': 'source',
  'the-wild-tree_Menu-Thai-Group-1.jpg': 'source',
  'the-wild-tree_Menu-ThaiSpices-Meets-Filipino-Soul.jpg': 'source',
  'the-wild-tree_OnTheTable.jpg': 'source',
  'the-wild-tree_Operating-Hours.jpg': 'source',
  'the-wild-tree_Menu-Chicken-Tinola.jpg': 'food',
  'the-wild-tree_Menu-Crab-Curry.jpg': 'food',
  'the-wild-tree_Menu-Crab-Fried-Rice.jpg': 'food',
  'the-wild-tree_Menu-Deep-See-Bass.jpg': 'food',
  'the-wild-tree_Menu-Kare-Kare.jpg': 'food',
  'the-wild-tree_Menu-Lumpiang-Shanghai.jpg': 'food',
  'the-wild-tree_Menu-Mango-Sticky-Rice.jpg': 'food',
  'the-wild-tree_Menu-Pad-Thai.jpg': 'food',
  'the-wild-tree_Menu-Pomelo-Salad.jpg': 'food',
  'the-wild-tree_Menu-Pork-Kawali.jpg': 'food',
  'the-wild-tree_Menu-Prawn-Soup.jpg': 'food',
  'the-wild-tree_Menu-Satay.jpg': 'food',
  'the-wild-tree_Menu-Spicey-Pork-Spine-Soup.jpg': 'food',
  'the-wild-tree_Menu-Thai-Steak.jpg': 'food',
  'the-wild-tree_Menu-Thai-Tea-Panna-Cotta.jpg': 'food',
  'the-wild-tree_Menu-Tom-Yum-Goong.jpg': 'food',
  'wild-tree-cocktail-lineup.png': 'food',
} as const);

/** Repository-relative path, not a browser URL. Unknown filenames are rejected. */
export function sourceAssetPath(filename: string): string | null {
  if (!Object.prototype.hasOwnProperty.call(wildTreeAssetFolders, filename)) return null;
  const folder = wildTreeAssetFolders[filename as keyof typeof wildTreeAssetFolders];
  return `${WILD_TREE_ASSET_ROOT}/${folder}/${filename}`;
}
