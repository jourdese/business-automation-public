import { createMealPlanner } from '../shared/meal-plan.ts';
import { dishById, peso } from './content.ts';
import { marinaraMenuPolicy } from './menu.ts';
import type { MealPlan } from '../shared/meal-plan.ts';
export type { MealPlan } from '../shared/meal-plan.ts';
const planner = createMealPlanner(dishById, peso);
export const { sanitizePlan, adjustPlan, summarizePlan } = planner;
export function priceSummary(plan: MealPlan): string { return `${planner.priceSummary(plan)} demo subtotal · fees unverified`; }
export function mealPlanPrompt(plan: MealPlan): string {
  const lines = Object.entries(sanitizePlan(plan)).map(([id, quantity]) => `${quantity} × ${dishById[id]!.name}${dishById[id]!.isMock ? ' [demo concept]' : ' [archived menu]'}`);
  return `For Marinara Ristorante, ${lines.length ? `my demo meal plan is ${lines.join(', ')}.` : 'help me prepare a demo meal plan.'} ${marinaraMenuPolicy.priceNotice} Do not claim current availability, confirmed ingredients or adequate portions. Do not submit an order or reservation.`;
}
