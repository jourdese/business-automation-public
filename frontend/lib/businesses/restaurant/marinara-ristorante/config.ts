import { createRestaurantChatPresentation } from '../shared/chat-config.ts';
import { MARINARA_PRESET_KEY } from './menu.ts';
import type { InitialBusiness } from '../../types';

export const MARINARA_PUBLIC_PATH = '/restaurant/marinara-ristorante';
const sharedChat = createRestaurantChatPresentation(MARINARA_PUBLIC_PATH);

export const marinaraSiteConfig = Object.freeze({
  publicPath: MARINARA_PUBLIC_PATH,
  presetKey: MARINARA_PRESET_KEY,
  adapterKey: 'restaurant',
  mealPlanStoragePrefix: 'marinara.meal-plan.v1',
  siteReady: true,
  runtimeEnabled: false as boolean,
  runtimeNotice: 'Live Jourvis chat stays off while Marinara is a hidden draft. You can prepare and copy an enquiry; nothing is sent.',
  chat: Object.freeze({
    ...sharedChat,
    quickPrompts: ['Help me choose between pasta and pizza.', 'Build a table for four.', 'Tell me about the cheese-wheel options.', 'Prepare a table enquiry.'],
    placeholder: 'Ask about pasta, pizza, cheese-wheel options or your visit…',
    hint: 'Pasta, pizza & table planning',
  }),
});

export const marinaraPreviewBusiness: InitialBusiness = Object.freeze({
  displayName: 'Marinara Ristorante',
  publicPath: MARINARA_PUBLIC_PATH,
  adapterKey: 'restaurant',
  presetKey: MARINARA_PRESET_KEY,
});

export function isMarinaraBusiness(business: InitialBusiness): boolean {
  return business.publicPath === MARINARA_PUBLIC_PATH
    && business.adapterKey === 'restaurant'
    && business.presetKey === MARINARA_PRESET_KEY;
}
