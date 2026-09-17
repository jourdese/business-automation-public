'use client';
import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { menuCategories, peso, type MarinaraDish } from '@/lib/businesses/restaurant/marinara-ristorante/content';
import { namedDishImages } from '@/lib/businesses/restaurant/marinara-ristorante/assets';
import { filterMarinaraMenu, imageLookupKey } from '@/lib/businesses/restaurant/marinara-ristorante/menu-view';
import type { MealPlan } from '@/lib/businesses/restaurant/marinara-ristorante/meal-plan';
import Photo from './Photo';
import styles from './MarinaraPage.module.css';

const PAGE = 10;
function dishImage(dish: MarinaraDish): string | undefined {
  return namedDishImages[imageLookupKey(dish.printedName)] ?? namedDishImages[imageLookupKey(dish.name)];
}

export default function MarinaraMenu({ plan, onAdd, onView }: { plan: MealPlan; onAdd: (dish: MarinaraDish) => void; onView: (dish: MarinaraDish) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [source, setSource] = useState<'all' | 'archived-menu-photo' | 'mock-concept'>('all');
  const [limit, setLimit] = useState(PAGE);
  const matches = useMemo(() => filterMarinaraMenu(query, category, source), [query, category, source]);
  const resetLimit = () => setLimit(PAGE);
  return <div className={styles.menuBrowser}>
    <div className={styles.menuTools}>
      <label className={styles.search}><Search size={18} aria-hidden /><span className={styles.srOnly}>Search Marinara menu</span><input type="search" value={query} placeholder="Pasta, pizza, dessert…" onChange={(e) => { setQuery(e.target.value); resetLimit(); }} /></label>
      <label className={styles.sourceSelect}>Source<select value={source} onChange={(e) => { setSource(e.target.value as typeof source); resetLimit(); }}><option value="all">All selections</option><option value="archived-menu-photo">Archived 2025 menu</option><option value="mock-concept">Demo concepts</option></select></label>
    </div>
    <div className={styles.categories} role="group" aria-label="Marinara menu categories">{['All', ...menuCategories].map((item) => <button key={item} type="button" aria-pressed={item === category} onClick={() => { setCategory(item); resetLimit(); }}>{item}</button>)}</div>
    <div className={styles.menuStatus}><span>{matches.length} selections</span><span>Archived references + clearly marked concepts</span></div>
    <div className={styles.menuGrid}>{matches.slice(0, limit).map((dish) => {
      const image = dishImage(dish);
      return <article key={dish.id} className={styles.dishCard} data-dish-id={dish.id}>
        <button type="button" className={styles.dishVisual} onClick={() => onView(dish)} aria-label={`View ${dish.name} details`}>
          {image ? <Photo src={image} alt={`${dish.printedName} — supplied Marinara photo`} loading="lazy" /> : <span className={styles.typeTile}><small>{dish.category}</small><strong>{dish.printedName}</strong><em>{dish.variant || 'Bistro selection'}</em></span>}
        </button>
        <div className={styles.dishBody}>
          <div className={styles.dishMeta}><span>{dish.isMock ? 'Demo concept' : 'Archived 2025 menu'}</span>{dish.variant ? <span>{dish.variant}</span> : null}</div>
          <h3><button type="button" onClick={() => onView(dish)}>{dish.name}</button></h3>
          <p>{dish.description}</p>
          <div className={styles.dishBottom}><span><strong>{peso(dish.price)}</strong><small>{dish.priceNote}</small></span><button type="button" className={styles.addButton} disabled={(plan[dish.id] || 0) >= 20} onClick={() => onAdd(dish)} aria-label={`Add ${dish.name} to meal plan`}><Plus size={18} aria-hidden />{plan[dish.id] ? <b>{plan[dish.id]}</b> : null}</button></div>
        </div>
      </article>;
    })}</div>
    {!matches.length ? <div className={styles.emptyMenu}><h3>No match yet.</h3><p>Try another dish name, category or source.</p><button type="button" onClick={() => { setQuery(''); setCategory('All'); setSource('all'); resetLimit(); }}>Reset menu</button></div> : null}
    {matches.length > limit ? <button className={styles.showMore} type="button" onClick={() => setLimit((value) => value + PAGE)}>Show more <span>{matches.length - limit} remaining</span></button> : null}
  </div>;
}
