import type { RestaurantChatPresentation } from '../shared/chat-config';

/** Presentation only. Runtime preset selection still comes from the resolved database route. */
export const ribCribSiteConfig = {
  // Retain existing session-storage and event contracts for returning guests.
  mealPlanStoragePrefix: 'ribcrib.meal-plan.v2',
  chat: {
    openEvent: 'ribcrib:jourvis',
    stateEvent: 'ribcrib:chat-state',
    panelId: 'rib-jourvis-panel',
    messageId: 'rib-jourvis-message',
    disclaimerId: 'rib-chat-disclaimer',
    quickPrompts: ['What are your bestsellers?', 'What do you recommend for 4 people?', 'Do you have unlimited wings?', 'I want to order for pickup.'],
    placeholder: 'Ask about ribs, platters, reservations…',
    hint: 'Menu, platters & reservations',
  } satisfies RestaurantChatPresentation,
} as const;
