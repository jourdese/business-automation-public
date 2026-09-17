import { createMealPlanner } from '../shared/meal-plan.ts';
import { dishById, peso } from './content.ts';
import type { MealPlan } from '../shared/meal-plan.ts';
export type { MealPlan } from '../shared/meal-plan.ts';

const planner = createMealPlanner(dishById, peso);
export const { sanitizePlan, adjustPlan, summarizePlan } = planner;
export function priceSummary(plan: MealPlan): string {
  return `${planner.priceSummary(plan)} demo subtotal · taxes and service charges unverified`;
}
export function mealPlanPrompt(plan: MealPlan): string {
  const safe = sanitizePlan(plan);
  const lines = Object.entries(safe).map(([id, count]) => {
    const dish = dishById[id]!;
    return `${count} × ${dish.name}${dish.isMock ? ' [demo concept]' : ''}`;
  });
  const request = lines.length ? `My demo meal plan is ${lines.join(', ')}.` : 'Help me build a demo meal plan.';
  return `${request} All prices are fictional demo values. Mark invented dishes as demo concepts, do not claim real availability or verified ingredients, and do not submit an order or reservation.`;
}
