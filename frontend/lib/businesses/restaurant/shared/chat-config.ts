export type RestaurantChatPresentation = {
  openEvent: string;
  stateEvent: string;
  panelId: string;
  messageId: string;
  disclaimerId: string;
  quickPrompts: readonly string[];
  placeholder: string;
  hint: string;
};

/** Use a different event/DOM namespace per routed business. Legacy clients may override it. */
export function createRestaurantChatPresentation(publicPath: string): RestaurantChatPresentation {
  if (!/^\/[a-z0-9-]+\/[a-z0-9-]+$/.test(publicPath)) {
    throw new Error('A canonical business path is required for restaurant chat.');
  }
  const scope = encodeURIComponent(publicPath);
  const prefix = `restaurant-${scope}`;
  return {
    openEvent: `jourvis:restaurant:${scope}:open`,
    stateEvent: `jourvis:restaurant:${scope}:state`,
    panelId: `${prefix}-panel`,
    messageId: `${prefix}-message`,
    disclaimerId: `${prefix}-disclaimer`,
    quickPrompts: ['Help me choose a meal.', 'Review my meal plan.', 'I’d like to ask about a table.', 'How do pickup enquiries work?'],
    placeholder: 'Ask about the menu or your visit…',
    hint: 'Menu, meal plans & reservations',
  };
}
