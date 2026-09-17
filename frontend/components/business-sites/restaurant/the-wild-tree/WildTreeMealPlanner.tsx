import { Minus, Plus, Trash2, MessageCircle, ShoppingBag } from 'lucide-react';
import { dishById, peso } from '@/lib/businesses/restaurant/the-wild-tree/content';
import { summarizePlan, type MealPlan } from '@/lib/businesses/restaurant/the-wild-tree/meal-plan';
import styles from './WildTreePage.module.css';
export default function WildTreeMealPlanner({ plan, onAdjust, onClear, onSample, onDiscuss, onPickup }: {
  plan: MealPlan; onAdjust: (id: string, delta: number) => void; onClear: () => void;
  onSample: () => void; onDiscuss: () => void; onPickup: () => void;
}) {
  const summary = summarizePlan(plan);
  return <section className={styles.planner} id="wild-tree-plan" aria-labelledby="wild-tree-plan-title">
    <div className={styles.panelHeading}><div><span className={styles.eyebrow}>A little planning</span><h3 id="wild-tree-plan-title">Your Meal Plan</h3></div><span className={styles.planCount}>{summary.count}</span></div>
    {summary.count ? <><div className={styles.planItems}>{Object.entries(plan).map(([id, quantity]) => {
      const dish = dishById[id];
      if (!dish) return null;
      return <div className={styles.planItem} key={id}><div className={styles.planItemTitle}><span>{dish.name}{dish.isMock ? <small>Demo concept</small> : null}</span><strong>{peso(dish.price * quantity)}</strong></div><div className={styles.quantity}><button type="button" onClick={() => onAdjust(id, -1)} aria-label={`Decrease ${dish.name} quantity`}><Minus size={13} aria-hidden /></button><span aria-label={`${dish.name} quantity`}>{quantity}</span><button type="button" disabled={quantity >= 20} onClick={() => onAdjust(id, 1)} aria-label={`Increase ${dish.name} quantity`}><Plus size={13} aria-hidden /></button><button type="button" className={styles.remove} onClick={() => onAdjust(id, -quantity)} aria-label={`Remove ${dish.name}`}><Trash2 size={13} aria-hidden /></button></div></div>;
    })}</div><button type="button" className={styles.clearPlan} onClick={onClear}>Clear meal plan</button></> : <div className={styles.emptyPlan}><ShoppingBag size={28} strokeWidth={1.1} aria-hidden /><p>Something for everyone.<br />Start with a dish you love.</p><button type="button" onClick={onSample}>Try a sample meal plan</button></div>}
    <dl className={styles.planTotals}><div><dt>Demo food subtotal</dt><dd data-testid="wild-tree-subtotal">{peso(summary.subtotal)}</dd></div><div><dt>Taxes & service charges</dt><dd>Unverified</dd></div></dl>
    <p className={styles.panelNote}>Fictional prices. Fees are excluded; portions and availability require confirmation.</p>
    <button type="button" className={styles.primary} onClick={onDiscuss}><MessageCircle size={16} aria-hidden />Discuss this plan with Jourvis</button>
    <button type="button" className={styles.secondary} onClick={onPickup}><ShoppingBag size={16} aria-hidden />Prepare a pickup enquiry</button>
    <p className={styles.panelNote}>Planning only. No kitchen order has been placed.</p>
  </section>;
}
