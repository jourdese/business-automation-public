import { createRestaurantChatPresentation } from '../shared/chat-config.ts';
import { MARINARA_PRESET_KEY } from './menu.ts';
export const MARINARA_PUBLIC_PATH = '/restaurant/marinara-ristorante';
export const marinaraSiteConfig = Object.freeze({
  publicPath: MARINARA_PUBLIC_PATH, presetKey: MARINARA_PRESET_KEY, adapterKey: 'restaurant',
  mealPlanStoragePrefix: 'marinara.meal-plan.v1', runtimeEnabled: false, siteReady: false,
  chat: createRestaurantChatPresentation(MARINARA_PUBLIC_PATH),
  runtimeNotice: 'Marinara is a hidden menu draft. No live conversation, booking or ordering is enabled.',
});
