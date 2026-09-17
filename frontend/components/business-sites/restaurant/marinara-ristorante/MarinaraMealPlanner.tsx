'use client';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { dishById, peso } from '@/lib/businesses/restaurant/marinara-ristorante/content';
import { summarizePlan, type MealPlan } from '@/lib/businesses/restaurant/marinara-ristorante/meal-plan';
import styles from './MarinaraPage.module.css';

export default function MarinaraMealPlanner({ plan, onAdjust, onClear, onSample, onDiscuss, onPickup }: {
  plan: MealPlan;
  onAdjust: (id: string, delta: number) => void;
  onClear: () => void;
  onSample: () => void;
  onDiscuss: () => void;
  onPickup: () => void;
}) {
  const summary = summarizePlan(plan);
  return <section className={styles.planner} id="marinara-plan" aria-labelledby="marinara-plan-title">
    <div className={styles.panelHeading}><div><span className={styles.eyebrow}>For your table</span><h3 id="marinara-plan-title">Meal plan</h3></div><span className={styles.planCount}>{summary.count}</span></div>
    {summary.count ? <>
      <div className={styles.planItems}>{Object.entries(plan).map(([id, qty]) => {
        const dish = dishById[id]; if (!dish) return null;
        return <div className={styles.planItem} key={id}><div className={styles.planItemTop}><span><strong>{dish.name}</strong>{dish.variant ? <small>{dish.variant}</small> : null}</span><b>{peso(dish.price * qty)}</b></div><div className={styles.quantity}><button type="button" aria-label={`Decrease ${dish.name} quantity`} onClick={() => onAdjust(id, -1)}><Minus size={13} aria-hidden /></button><span>{qty}</span><button type="button" disabled={qty >= 20} aria-label={`Increase ${dish.name} quantity`} onClick={() => onAdjust(id, 1)}><Plus size={13} aria-hidden /></button><button type="button" className={styles.remove} aria-label={`Remove ${dish.name}`} onClick={() => onAdjust(id, -qty)}><Trash2 size={13} aria-hidden /></button></div></div>;
      })}</div>
      <button className={styles.clearPlan} type="button" onClick={onClear}>Clear meal plan</button>
    </> : <div className={styles.emptyPlan}><ShoppingBag size={28} strokeWidth={1.2} aria-hidden /><p>Build the kind of table that makes everyone stay a little longer.</p><button type="button" onClick={onSample}>Try a sample dinner</button></div>}
    <dl className={styles.planTotals}><div><dt>Demo food subtotal</dt><dd data-testid="marinara-subtotal">{peso(summary.subtotal)}</dd></div><div><dt>Fees & service charges</dt><dd>Unverified</dd></div></dl>
    <p className={styles.panelNote}>Historical reference amounts are reused only for this planning demo. Confirm current prices and portions with Marinara.</p>
    <button className={styles.primary} type="button" onClick={onDiscuss}>Discuss with Jourvis</button>
    <button className={styles.secondary} type="button" onClick={onPickup}>Prepare pickup enquiry</button>
    <p className={styles.panelNote}>Nothing is ordered, paid for or reserved from this panel.</p>
  </section>;
}
