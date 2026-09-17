'use client';
import { useState } from 'react';
import { Plus, Search, ArrowDown } from 'lucide-react';
import { menuCategories, peso, type WildTreeDish } from '@/lib/businesses/restaurant/the-wild-tree/content';
import { filterWildTreeMenu, type MenuFilter, type MenuOrigin } from '@/lib/businesses/restaurant/the-wild-tree/menu-view';
import { menuImages } from '@/lib/businesses/restaurant/the-wild-tree/assets';
import type { MealPlan } from '@/lib/businesses/restaurant/the-wild-tree/meal-plan';
import Photo from './Photo';
import styles from './WildTreePage.module.css';
const PAGE_SIZE = 8;
export default function WildTreeMenu({ plan, onAdd, onView }: { plan: MealPlan; onAdd: (dish: WildTreeDish) => void; onView: (dish: WildTreeDish) => void }) {
  const [category, setCategory] = useState<MenuFilter>('All');
  const [origin, setOrigin] = useState<MenuOrigin>('all');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const dishes = filterWildTreeMenu(query, category, origin);
  return <div className={styles.menuBrowser}>
    <label className={styles.search}><Search size={19} aria-hidden /><span className={styles.srOnly}>Search dishes by name or alias</span><input type="search" value={query} placeholder="Find a dish or drink…" onChange={event => { setQuery(event.target.value); setLimit(PAGE_SIZE); }} /></label>
    <div className={styles.categories} role="group" aria-label="Menu categories">{(['All', ...menuCategories] as const).map(name => <button type="button" key={name} aria-pressed={category === name} onClick={() => { setCategory(name); setLimit(PAGE_SIZE); }}>{name === 'Wild Tree Signatures' ? 'Signatures' : name}</button>)}</div>
    <div className={styles.menuSubhead}>
      <label>Menu source <select aria-label="Menu source" value={origin} onChange={event => { setOrigin(event.target.value as MenuOrigin); setLimit(PAGE_SIZE); }}><option value="all">All dishes</option><option value="supplied-photo">From supplied photos</option><option value="mock-concept">Demo concepts</option></select></label>
      <p role="status">{dishes.length} {dishes.length === 1 ? 'dish' : 'dishes'} · all prices are mock</p>
    </div>
    <div className={styles.menuGrid}>{dishes.slice(0, limit).map(dish => <article className={styles.dish} key={dish.id} data-dish-id={dish.id}>
      <button type="button" className={styles.dishImage} onClick={() => onView(dish)} aria-label={`View ${dish.name} details`}>
        {dish.image && menuImages[dish.image] ? <Photo src={menuImages[dish.image]} alt={`${dish.name} — supplied menu artwork`} loading="lazy" width={180} height={200} /> : <span className={styles.conceptImage}><span aria-hidden>✳</span><span>Demo concept</span><small>No dish photo</small></span>}
      </button>
      <div className={styles.dishBody}><span className={styles.dishSource}>{dish.isMock ? 'Demo concept' : 'From supplied photos'}</span><h3><button type="button" onClick={() => onView(dish)}>{dish.name}</button></h3><p className={styles.dishDescription}>{dish.description}</p><div className={styles.dishBottom}><span><strong>{peso(dish.price)}</strong><small>Demo price</small></span><button className={styles.addButton} type="button" disabled={(plan[dish.id] || 0) >= 20} onClick={() => onAdd(dish)} aria-label={`Add ${dish.name} to meal plan`}><Plus size={18} aria-hidden />{plan[dish.id] ? <span>{plan[dish.id]}</span> : null}</button></div></div>
    </article>)}</div>
    {!dishes.length ? <div className={styles.emptySearch}><h3>No dish found.</h3><p>Try another name or reset the menu filters.</p><button type="button" className={styles.secondary} onClick={() => { setCategory('All'); setQuery(''); setOrigin('all'); setLimit(PAGE_SIZE); }}>Reset filters</button></div> : null}
    {dishes.length > limit ? <button type="button" className={styles.showMore} onClick={() => setLimit(value => value + PAGE_SIZE)}>Show more dishes <span>{dishes.length - limit} remaining</span><ArrowDown size={16} aria-hidden /></button> : null}
  </div>;
}
