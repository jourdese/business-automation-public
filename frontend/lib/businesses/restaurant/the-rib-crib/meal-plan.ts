import { dishById, peso } from './content.ts';
import { createMealPlanner } from '../shared/meal-plan.ts';

export type { MealPlan } from '../shared/meal-plan.ts';
export { manilaToday, reservationPrompt } from '../shared/prompts.ts';

// Keep this binding restaurant-owned: no other site can accidentally use this menu.
export const { sanitizePlan, adjustPlan, summarizePlan, mealPlanPrompt, priceSummary } =
  createMealPlanner(dishById, peso);
