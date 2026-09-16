import { dishById, peso } from './content.ts';
export type MealPlan = Record<string, number>;

/** Only dish IDs and quantities are kept locally; never payment or customer details. */
export function sanitizePlan(input: unknown): MealPlan {
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

export function adjustPlan(plan: MealPlan, id: string, delta: number): MealPlan {
  const next = sanitizePlan(plan);
  if (!Object.prototype.hasOwnProperty.call(dishById, id) || !dishById[id] || !Number.isFinite(delta)) return next;
  const quantity = Math.min(20, Math.max(0, (next[id] || 0) + Math.trunc(delta)));
  if (quantity) next[id] = quantity;
  else delete next[id];
  return next;
}

export function summarizePlan(input: MealPlan) {
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

export function mealPlanPrompt(input: MealPlan): string {
  const plan = sanitizePlan(input);
  const lines = Object.entries(plan).map(([id, quantity]) => `${quantity} × ${dishById[id]!.name}`);
  if (!lines.length) return 'Can you help me put a meal together?';
  return `I’m considering this meal: ${lines.join(', ')}. Please help me check current prices, inclusions and suitable portions. This is a meal plan, not a confirmed order.`;
}

export function priceSummary(input: MealPlan): string {
  const result = summarizePlan(input);
  return `${peso(result.subtotal)}${result.unpriced ? ' + items to confirm' : ''}`;
}

export function manilaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map((key) => parts.find((part) => part.type === key)!.value).join('-');
}

export function reservationPrompt(date: string, time: string, people: string, today = manilaToday()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) return null;
  const calendarDate = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== date) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const group = Number(people);
  if (!Number.isInteger(group) || group < 1 || group > 40) return null;
  const [hour, minute] = time.split(':').map(Number);
  const label = `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
  return `I’d like to ask about a table for ${group} ${group === 1 ? 'person' : 'people'} on ${date} at ${label} (Philippine time). Please help me check availability. I understand this is a demo, not a confirmed reservation.`;
}
