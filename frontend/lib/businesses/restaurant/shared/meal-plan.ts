export type MealPlan = Record<string, number>;
export type PlannableDish = { name: string; price: number | null };
export type MealPlanCatalog = Readonly<Record<string, PlannableDish | undefined>>;

/** Bind one catalog per restaurant. Prices remain in major currency units, as before. */
export function createMealPlanner(dishById: MealPlanCatalog, peso: (value: number) => string) {
  /** Only dish IDs and quantities are kept locally; never payment or customer details. */
  function sanitizePlan(input: unknown): MealPlan {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
    const plan: MealPlan = {};
    for (const [id, value] of Object.entries(input)) {
      if (!Object.prototype.hasOwnProperty.call(dishById, id) || !dishById[id]) continue;
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      const quantity = Math.min(20, Math.max(0, Math.floor(value)));
      if (quantity > 0) plan[id] = quantity;
    }
    return plan;
  }

  function adjustPlan(plan: MealPlan, id: string, delta: number): MealPlan {
    const next = sanitizePlan(plan);
    if (!Object.prototype.hasOwnProperty.call(dishById, id) || !dishById[id] || !Number.isFinite(delta)) return next;
    const quantity = Math.min(20, Math.max(0, (next[id] || 0) + Math.trunc(delta)));
    if (quantity) next[id] = quantity;
    else delete next[id];
    return next;
  }

  function summarizePlan(input: MealPlan) {
    const plan = sanitizePlan(input);
    let subtotal = 0, count = 0, unpriced = 0;
    for (const [id, quantity] of Object.entries(plan)) {
      const item = dishById[id]!;
      count += quantity;
      if (item.price === null) unpriced += quantity;
      else subtotal += item.price * quantity;
    }
    return { subtotal, count, unpriced };
  }

  function mealPlanPrompt(input: MealPlan): string {
    const plan = sanitizePlan(input);
    const lines = Object.entries(plan).map(([id, quantity]) => `${quantity} × ${dishById[id]!.name}`);
    if (!lines.length) return 'Can you help me put a meal together?';
    return `I’m considering this meal: ${lines.join(', ')}. Please help me check current prices, inclusions and suitable portions. This is a meal plan, not a confirmed order.`;
  }

  function priceSummary(input: MealPlan): string {
    const result = summarizePlan(input);
    return `${peso(result.subtotal)}${result.unpriced ? ' + items to confirm' : ''}`;
  }

  return { sanitizePlan, adjustPlan, summarizePlan, mealPlanPrompt, priceSummary };
}
