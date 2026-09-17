'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, CalendarDays, MapPin, Menu, MessageCircle, ShoppingBag, X } from 'lucide-react';
import type { BusinessSiteProps } from '@/lib/businesses/types';
import { assets, menuImages } from '@/lib/businesses/restaurant/the-wild-tree/assets';
import { isWildTreeBusiness, wildTreeSiteConfig as config } from '@/lib/businesses/restaurant/the-wild-tree/config';
import { websiteContent as copy } from '@/lib/businesses/restaurant/the-wild-tree/website-content';
import { wildTreeMenuPolicy } from '@/lib/businesses/restaurant/the-wild-tree/menu';
import { peso, type WildTreeDish } from '@/lib/businesses/restaurant/the-wild-tree/content';
import { adjustPlan, sanitizePlan, summarizePlan, mealPlanPrompt, type MealPlan } from '@/lib/businesses/restaurant/the-wild-tree/meal-plan';
import { manilaToday, reservationPrompt } from '@/lib/businesses/restaurant/shared/prompts';
import WildTreeHero from './WildTreeHero';
import WildTreeExperience, { type GalleryImage } from './WildTreeExperience';
import WildTreeMenu from './WildTreeMenu';
import WildTreeMealPlanner from './WildTreeMealPlanner';
import WildTreeConcierge from './WildTreeConcierge';
import WildTreeDialog from './WildTreeDialog';
import Photo from './Photo';
import styles from './WildTreePage.module.css';

type Detail = GalleryImage & { dish?: WildTreeDish };
export default function WildTreePage({ business }: BusinessSiteProps) {
  const [stored, setStored] = useState<{ key: string; plan: MealPlan } | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [draft, setDraft] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [party, setParty] = useState('4');
  const [today, setToday] = useState('');
  const [formError, setFormError] = useState('');
  const navRef = useRef<HTMLButtonElement>(null);
  const enquiryRef = useRef<HTMLTextAreaElement>(null);
  const planKey = `${config.mealPlanStoragePrefix}:${business.publicPath}`;
  const plan = stored?.key === planKey ? stored.plan : {};
  const count = summarizePlan(plan).count;

  useEffect(() => {
    let saved: MealPlan = {};
    try { saved = sanitizePlan(JSON.parse(sessionStorage.getItem(planKey) || '{}')); } catch { /* Optional storage. */ }
    setStored({ key: planKey, plan: saved }); setToday(manilaToday());
  }, [planKey]);
  useEffect(() => {
    if (stored?.key !== planKey) return;
    try { sessionStorage.setItem(planKey, JSON.stringify(stored.plan)); } catch { /* Keep working without storage. */ }
  }, [planKey, stored]);

  function changePlan(update: (current: MealPlan) => MealPlan) {
    setStored(current => ({ key: planKey, plan: sanitizePlan(update(current?.key === planKey ? current.plan : {})) }));
  }
  function ask(prompt?: string) {
    setNavOpen(false);
    if (prompt !== undefined) setDraft(prompt);
    window.requestAnimationFrame(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById('wild-tree-jourvis')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      enquiryRef.current?.focus({ preventScroll: true });
    });
  }
  function addDish(dish: WildTreeDish) {
    changePlan(current => adjustPlan(current, dish.id, 1));
    setAnnouncement(`${dish.name} added to your meal plan. No order has been placed.`);
  }
  function viewDish(dish: WildTreeDish) {
    setDetail({ title: dish.name, src: dish.image ? menuImages[dish.image] || '' : '', alt: `${dish.name} — supplied menu artwork`, dish });
  }
  function closeNav() { setNavOpen(false); }

  if (!isWildTreeBusiness(business)) return <section className={styles.unavailable}><h1>Restaurant configuration unavailable</h1><p>This page requires The Wild Tree’s own restaurant preset.</p></section>;

  return <div className={styles.root} data-wild-tree="true">
    <header className={styles.header} onKeyDown={event => { if (event.key === 'Escape' && navOpen) { closeNav(); navRef.current?.focus(); } }}>
      <div className={styles.headerInner}>
        <a href="#wild-tree-top" className={styles.logo} aria-label="The Wild Tree, back to top" onClick={closeNav}><Photo src={assets.logoLight} alt="The Wild Tree" width={379} height={192} loading="eager" /></a>
        <nav className={`${styles.nav} ${navOpen ? styles.navOpen : ''}`} id="wild-tree-navigation" aria-label="The Wild Tree navigation"><a href="#wild-tree-experience" onClick={closeNav}>The experience</a><a href="#wild-tree-menu" onClick={closeNav}>Menu</a><a href="#wild-tree-table" onClick={closeNav}>Your table</a><a href="#wild-tree-visit" onClick={closeNav}>Visit</a></nav>
        <div className={styles.headerActions}><a className={styles.headerPlan} href="#wild-tree-plan" onClick={closeNav}><ShoppingBag size={16} aria-hidden /><span>Meal Plan · {count}</span></a><button type="button" className={styles.headerAsk} onClick={() => ask()}><MessageCircle size={16} aria-hidden /><span>Ask Jourvis</span></button><button type="button" ref={navRef} className={styles.mobileMenu} aria-label={navOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={navOpen} aria-controls="wild-tree-navigation" onClick={() => setNavOpen(value => !value)}>{navOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}</button></div>
      </div>
    </header>
    <WildTreeHero onAsk={() => ask()} />

    <section className={styles.tableRibbon} id="wild-tree-table" aria-labelledby="wild-tree-table-title">
      <div><p className={styles.eyebrow}>For your next visit</p><h2 id="wild-tree-table-title">Let’s make<br />an evening of it.</h2></div>
      <form className={styles.tableForm} onSubmit={event => { event.preventDefault(); const message = reservationPrompt(date, time, party, manilaToday()); if (!message) { setFormError('Choose today or later, a valid time, and 1–40 guests for your enquiry.'); return; } setFormError(''); ask(message); }}>
        <div className={styles.tableControls}><label>Date<input aria-label="Visit date" type="date" value={date} min={today || undefined} required onChange={event => setDate(event.target.value)} /></label><label>Time<input aria-label="Visit time" type="time" value={time} required onChange={event => setTime(event.target.value)} /></label><label>Guests<input aria-label="Number of guests" type="number" min={1} max={40} step={1} value={party} required onChange={event => setParty(event.target.value)} /></label><button className={styles.primary} type="submit"><CalendarDays size={16} aria-hidden />Prepare table enquiry</button></div>
        <p className={styles.tableNote}>Philippine time · Enquiry draft only. No availability is checked and no table is booked.</p>{formError ? <p role="alert" className={styles.formError}>{formError}</p> : null}
      </form>
    </section>
    <WildTreeExperience onView={image => setDetail(image)} />

    <section className={styles.dining} id="wild-tree-menu" aria-labelledby="wild-tree-menu-title">
      <div className={styles.diningHeading}><div><p className={styles.eyebrow}>Something for your table</p><h2 id="wild-tree-menu-title">What’s coming<br /><em>to your table?</em></h2></div><p>Explore the menu, build a meal plan,<br />and keep the details together.</p></div>
      <div className={styles.menuDisclosure}><strong>Menu-planning demo</strong><span>17 photo-backed names + 34 invented additions. All 51 prices are fictional; descriptions are demo copy.</span></div>
      <div className={styles.workspace}>
        <WildTreeMenu plan={plan} onAdd={addDish} onView={viewDish} />
        <aside className={styles.rail} aria-label="Meal planning and Jourvis">
          <WildTreeMealPlanner plan={plan} onAdjust={(id, delta) => changePlan(current => adjustPlan(current, id, delta))} onClear={() => { changePlan(() => ({})); setAnnouncement('Meal plan cleared.'); }} onSample={() => { changePlan(() => ({ pad_thai: 1, tom_yum_goong: 1, beef_kare_kare: 1, mango_sticky_rice: 1 })); setAnnouncement('Sample meal plan loaded using fictional demo prices. Portions are not guaranteed.'); }} onDiscuss={() => ask(mealPlanPrompt(plan))} onPickup={() => ask(`I’d like to prepare a pickup enquiry. ${mealPlanPrompt(plan)} Please confirm pickup arrangements with staff.`)} />
          <WildTreeConcierge business={business} draft={draft} onDraft={setDraft} inputRef={enquiryRef} />
        </aside>
      </div>
      <p className={styles.menuFootnote}>{wildTreeMenuPolicy.allergyNotice} {wildTreeMenuPolicy.chargesNotice}</p>
    </section>

    <section className={styles.visit} id="wild-tree-visit" aria-labelledby="wild-tree-visit-title">
      <div className={styles.visitCopy}><p className={styles.eyebrow}>Find your way here</p><h2 id="wild-tree-visit-title">Your next evening<br />starts here.</h2><p className={styles.address}><MapPin size={19} aria-hidden /><span>The Wild Tree<br />{copy.location}</span></p><div className={styles.actions}><a className={styles.lightButton} href={copy.directions} target="_blank" rel="noopener noreferrer">Get directions <ArrowUpRight size={16} aria-hidden /></a><a className={styles.lightLink} href={copy.instagram} target="_blank" rel="noopener noreferrer">Visit Instagram <ArrowUpRight size={16} aria-hidden /></a></div><div className={styles.hours}>{copy.hours.map(row => <div key={row.days}><span>{row.days}</span><strong>{row.time}</strong></div>)}</div><p className={styles.hoursNote}>{copy.hoursNotice} <button type="button" onClick={() => setDetail({ title: 'Supplied operating-hours artwork', src: assets.hours, alt: 'The Wild Tree operating-hours reference' })}>View reference</button></p></div>
      <div className={styles.visitVisual}><Photo src={assets.table} alt="A shared table — supplied illustrative artwork" width={1672} height={941} loading="lazy" /><div /><Photo className={styles.tradition} src={assets.tradition} alt="Taste with Tradition" width={1698} height={926} loading="lazy" /></div>
    </section>
    <footer className={styles.footer}><Photo src={assets.logoDark} alt="The Wild Tree" width={4096} height={2075} loading="lazy" /><div><p>Thai & Filipino cuisine</p><p>{copy.imageryNotice}</p><p>{wildTreeMenuPolicy.demoNotice}</p></div><div className={styles.footerLinks}><a href="/">Powered by Jourvis</a><a href="/privacy">Privacy</a><a href={copy.instagram} target="_blank" rel="noopener noreferrer">{copy.instagramLabel}</a></div></footer>
    <div className={styles.mobileDock}><a href="#wild-tree-plan"><ShoppingBag size={17} aria-hidden />Meal Plan · {count}</a><button type="button" onClick={() => ask()}><MessageCircle size={17} aria-hidden />Ask Jourvis</button></div>
    <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    {detail ? <WildTreeDialog title={detail.title} onClose={() => setDetail(null)}>{detail.src ? <Photo className={styles.detailImage} src={detail.src} alt={detail.alt} /> : <p className={styles.detailMissing}>This is a demo concept. No dish photograph has been supplied.</p>}{detail.dish ? <div className={styles.detailCopy}><span className={styles.dishSource}>{detail.dish.sourceLabel}</span><p>{detail.dish.description}</p><strong>{peso(detail.dish.price)} · Demo price</strong><p>{wildTreeMenuPolicy.descriptionNotice}</p><button className={styles.primary} type="button" onClick={() => { addDish(detail.dish!); setDetail(null); }}><ShoppingBag size={16} aria-hidden />Add to meal plan</button></div> : <p className={styles.panelNote}>{detail.src === assets.hours ? copy.hoursNotice : copy.imageryNotice}</p>}</WildTreeDialog> : null}
  </div>;
}
