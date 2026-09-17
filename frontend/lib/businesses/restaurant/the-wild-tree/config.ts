import { createRestaurantChatPresentation } from '../shared/chat-config.ts';
import { WILD_TREE_PRESET_KEY } from './menu.ts';
import type { InitialBusiness } from '../../types';

export const WILD_TREE_PUBLIC_PATH = '/restaurant/the-wild-tree';
export const wildTreeSiteConfig = Object.freeze({
  publicPath: WILD_TREE_PUBLIC_PATH,
  mealPlanStoragePrefix: 'wildtree.meal-plan.v1',
  // This is not a permission switch. Activate and verify the server preset separately.
  runtimeEnabled: false as boolean,
  runtimeNotice: 'Live Jourvis chat is not connected yet. You can prepare and copy an enquiry in this preview; nothing is sent.',
  chat: createRestaurantChatPresentation(WILD_TREE_PUBLIC_PATH),
});
export const wildTreePreviewBusiness: InitialBusiness = Object.freeze({
  displayName: 'The Wild Tree', adapterKey: 'restaurant',
  publicPath: WILD_TREE_PUBLIC_PATH, presetKey: WILD_TREE_PRESET_KEY,
});
export function isWildTreeBusiness(business: InitialBusiness): boolean {
  return business.publicPath === WILD_TREE_PUBLIC_PATH && business.adapterKey === 'restaurant'
    && business.presetKey === WILD_TREE_PRESET_KEY;
}
