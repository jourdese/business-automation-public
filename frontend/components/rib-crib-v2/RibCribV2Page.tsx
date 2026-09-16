'use client';
import { useEffect, useId, useRef, useState, type CSSProperties, type ImgHTMLAttributes } from 'react';
import type { InitialBusiness } from '../jourvis/JourvisExperience';
import JourvisCompanion from '../jourvis/JourvisCompanion';
import RibCribJourvisChat from '../jourvis/RibCribJourvisChat';
import { assets } from '@/lib/rib-crib-v2/assets';
import { dishes, platters, moreMenu, dishById, peso, quickPrompts, restaurantContent as copy, type Dish } from '@/lib/rib-crib-v2/content';
import { adjustPlan, sanitizePlan, summarizePlan, mealPlanPrompt, priceSummary, manilaToday, reservationPrompt, type MealPlan } from '@/lib/rib-crib-v2/meal-plan';
import Icon from './Icon';
import Modal from './Modal';
import styles from './RibCribV2.module.css';

function openJourvis(prompt?: string) {
  // Keep the existing event contract, scoped session and real restaurant-preset engine.
  window.dispatchEvent(new CustomEvent('ribcrib:jourvis', { detail: { prompt } }));
}

function Photo({ src, alt, className = '', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return failed || !src ? <span className={`${styles.photoFallback} ${className}`} role="img" aria-label={alt}>{alt || 'Image unavailable'}</span> :
    <img src={src} alt={alt} className={className} decoding="async" onError={() => setFailed(true)} {...props} />;
}

function DishCard({ dish, quantity, add, details }: { dish: Dish; quantity: number; add: () => void; details: () => void }) {
  return <article className={styles.dishCard}>
    <button type="button" className={styles.dishPhotoButton} onClick={details} aria-label={`View ${dish.name} details`}>
      <Photo src={assets[dish.image]} alt={`${dish.name} — illustrative food artwork`} width={1254} height={1254} loading="lazy" />
      <span className={styles.photoAction}><Icon name="diagonal" size={18} /></span>
      {dish.id === 'ribs' ? <span className={styles.dishLabel}>The namesake</span> : null}
    </button>
    <div className={styles.dishInfo}>
      <div><span className={styles.dishCategory}>{dish.portion || dish.category}</span><h3><button type="button" onClick={details}>{dish.name}</button></h3>
        <p className={styles.price}>{dish.price === null ? dish.priceNote : peso(dish.price)}</p></div>
      <button type="button" className={`${styles.addButton} ${quantity ? styles.added : ''}`} onClick={add} aria-label={`Add ${dish.name} to meal plan${quantity ? `, ${quantity} already selected` : ''}`}>
        <Icon name="plus" size={16} /><span>{quantity ? `Add · ${quantity} saved` : 'Add'}</span>
      </button>
    </div>
  </article>;
}

export default function RibCribV2Page({ business }: { business: InitialBusiness }) {
  const [category, setCategory] = useState('All favourites');
  const [search, setSearch] = useState('');
  const [selectedPlatter, setSelectedPlatter] = useState(0);
  const [detail, setDetail] = useState<Dish | null>(null);
  const [plan, setPlan] = useState<MealPlan>({});
  const [planLoaded, setPlanLoaded] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [party, setParty] = useState('4');
  const [today, setToday] = useState('');
  const [formError, setFormError] = useState('');
  const [question, setQuestion] = useState('');
  const [demoOpen, setDemoOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLButtonElement>(null);
  const instance = useId();
  const planKey = `ribcrib.meal-plan.v2:${business.publicPath}`;
  const summary = summarizePlan(plan);
  const platter = platters[selectedPlatter];
  const visibleDishes = dishes.filter((dish) => (category === 'All favourites' || dish.category === category) && `${dish.name} ${dish.portion || ''}`.toLowerCase().includes(search.trim().toLowerCase()));

  useEffect(() => {
    try { setPlan(sanitizePlan(JSON.parse(sessionStorage.getItem(planKey) || '{}'))); } catch { setPlan({}); }
    setPlanLoaded(true);
    setToday(manilaToday());
  }, [planKey]);
  useEffect(() => {
    if (!planLoaded) return;
    try { sessionStorage.setItem(planKey, JSON.stringify(plan)); } catch { /* Session storage is optional. */ }
  }, [plan, planLoaded, planKey]);
  useEffect(() => {
    const nodes = rootRef.current?.querySelectorAll<HTMLElement>('[data-v2-reveal]');
    if (!nodes || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { (entry.target as HTMLElement).dataset.entered = 'true'; observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const onChat = (event: Event) => setDemoOpen((event as CustomEvent<{ open: boolean }>).detail.open);
    window.addEventListener('ribcrib:chat-state', onChat);
    return () => window.removeEventListener('ribcrib:chat-state', onChat);
  }, []);

  function addDish(dish: Dish) {
    setPlan((value) => adjustPlan(value, dish.id, 1));
    setAnnouncement(`${dish.name} added to your meal plan. This is not an order.`);
  }
  function askAboutPlan() {
    setPlanOpen(false);
    // Wait for dialog cleanup before moving focus into the existing chat.
    window.requestAnimationFrame(() => openJourvis(mealPlanPrompt(plan)));
  }
  function closeMenu() { setNavOpen(false); }

  return <div ref={rootRef} className={styles.root} data-rib-crib-v2="true" style={{ '--v2-wood': `url("${assets.wood}")` } as CSSProperties}>
    <header className={styles.header} onKeyDown={(event) => { if (event.key === 'Escape' && navOpen) { event.preventDefault(); setNavOpen(false); navRef.current?.focus(); } }}>
      <div className={styles.headerInner}>
        <a className={styles.wordmark} href="#rib-top" aria-label="The Rib Crib, back to top" onClick={closeMenu}>
          <Photo src={assets.wordmark} alt="The Rib Crib" width={2172} height={724} loading="eager" />
        </a>
        <nav id={`${instance}-nav`} className={`${styles.nav} ${navOpen ? styles.navOpen : ''}`} aria-label="Restaurant navigation"
          onKeyDown={(event) => { if (event.key === 'Escape') { closeMenu(); navRef.current?.focus(); } }}>
          <a href="#rib-menu-v2" onClick={closeMenu}>The menu</a><a href="#rib-platters-v2" onClick={closeMenu}>For sharing</a>
          <a href="#rib-story-v2" onClick={closeMenu}>The good company</a><a href="#rib-visit-v2" onClick={closeMenu}>Plan a visit</a>
        </nav>
        <button type="button" className={styles.headerChat} onClick={() => { closeMenu(); openJourvis(); }}><Icon name="chat" size={18} /><span>Ask Jourvis</span></button>
        <button ref={navRef} type="button" className={styles.mobileMenu} aria-label={navOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={navOpen} aria-controls={`${instance}-nav`} onClick={() => setNavOpen(!navOpen)}><Icon name={navOpen ? 'close' : 'menu'} /></button>
      </div>
    </header>

    <section id="rib-top" className={styles.hero} aria-labelledby="rib-title-v2">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}><span className={styles.smallStar}>✳</span> {copy.hero.eyebrow}</p>
        <h1 id="rib-title-v2">Bring your<br /><em>appetite.</em></h1>
        <p className={styles.heroAside}>{copy.hero.aside}</p>
        <p className={styles.heroDescription}>{copy.hero.description}</p>
        <div className={styles.heroActions}><a className={styles.primary} href="#rib-menu-v2">{copy.hero.action}<Icon name="arrow" /></a><a className={styles.textLink} href="#rib-visit-v2">Plan a visit<Icon name="diagonal" size={18} /></a></div>
        <div className={styles.heroSignature}><Photo src={assets.emblem} alt="The Rib Crib — Let’s Meat Here, Est. 2018" width={1254} height={1254} /><span>Not just a meal.<br /><strong>A reason to get together.</strong></span></div>
      </div>
      <div className={styles.heroVisual}>
        <div className={styles.heroArch}><Photo src={assets.hero} alt="A tray of glazed wings — illustrative Rib Crib food artwork" width={1672} height={941} fetchPriority="high" loading="eager" /><div className={styles.heroPhotoCaption}><span>A FEAST FOR THE EYES</span><strong>Ribs. Wings. Repeat.</strong></div></div>
        <div className={styles.heroSticker} aria-hidden="true"><Photo src={assets.flame} alt="" width={1254} height={1254} /><span>LET’S<br />MEAT HERE</span></div>
        <a href="#rib-menu-v2" className={styles.heroRibs}><Photo src={assets.ribs} alt="Explore the barbecue ribs" width={1254} height={1254} loading="eager" /><span>The good stuff <Icon name="diagonal" size={16} /></span></a>
        <span className={styles.heroVertical} aria-hidden="true">GOOD FOOD · GOOD COMPANY</span>
      </div>
    </section>

    <div className={styles.brandRibbon} aria-label="Eat Meat Repeat"><span>Pull up a chair.</span><Photo src={assets.eatMeat} alt="Eat Meat Repeat" width={2172} height={724} /><span>Make it a Rib Crib kind of day.</span></div>

    <section id="rib-menu-v2" className={styles.menuSection} aria-labelledby="rib-menu-title-v2">
      <div className={styles.sectionHeading} data-v2-reveal><div><p className={styles.eyebrow}>01 / Something you’ll love</p><h2 id="rib-menu-title-v2">Meet your next<br /><em>craving.</em></h2></div><p>Go straight for the ribs.<br />Or take the scenic route through the menu.<br /><span>Tap + to save dishes to your meal plan.</span></p></div>
      <div className={styles.menuTools}>
        <div className={styles.filters} role="group" aria-label="Filter featured dishes">{['All favourites', 'Ribs & wings', 'Small plates', 'Drinks'].map((name) => <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}</div>
        <label className={styles.search}><Icon name="search" size={18} /><span className={styles.srOnly}>Search featured dishes</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a favourite…" /></label>
      </div>
      <div className={styles.menuGrid} aria-live="polite" aria-atomic="false">{visibleDishes.map((dish) => <DishCard key={dish.id} dish={dish} quantity={plan[dish.id] || 0} add={() => addDish(dish)} details={() => setDetail(dish)} />)}</div>
      {!visibleDishes.length ? <div className={styles.emptySearch}><h3>No dish found just yet.</h3><p>Try another name or explore all our featured dishes.</p><button type="button" className={styles.textLink} onClick={() => { setSearch(''); setCategory('All favourites'); }}>Reset the menu <Icon name="arrow" size={18} /></button></div> : null}
      <p className={styles.menuNote}>{copy.priceDisclaimer}</p>
      <details className={styles.moreMenu}><summary><span>There’s more on the menu</span><span>Starters, sharing dishes, wings & extras <Icon name="down" size={18} /></span></summary>
        <p className={styles.moreIntro}>Explore additional items from the menu. For set-meal combinations, dietary questions or today’s availability, <button type="button" onClick={() => openJourvis('Can you help me with the full menu and set-meal options?')}>ask Jourvis</button> or contact the restaurant.</p>
        <div className={styles.menuLists}>{moreMenu.map((group) => <div key={group.title}><h3>{group.title}</h3><dl>{group.items.map((item) => <div key={item.name}><dt>{item.name}{item.note ? <small>{item.note}</small> : null}</dt><dd>{peso(item.price)}</dd></div>)}</dl></div>)}</div>
      </details>
    </section>

    <section id="rib-platters-v2" className={styles.platterSection} aria-labelledby="rib-platters-title-v2">
      <div className={styles.platterIntro} data-v2-reveal><p className={styles.eyebrow}>02 / For the middle of the table</p><h2 id="rib-platters-title-v2">Good things come<br /><em>in platters.</em></h2><p>Different cravings. One table.<br />Find the spread you’d like to share.</p></div>
      <div className={styles.platterLayout}>
        <div className={styles.platterChoices} role="group" aria-label="Choose a sharing platter">{platters.map((item, index) => <button key={item.id} type="button" aria-pressed={index === selectedPlatter} aria-controls="platter-detail-v2" onClick={() => setSelectedPlatter(index)}><span className={styles.platterNumber}>0{index + 1}</span><span>{item.name}</span><strong>{peso(item.price!)}</strong><Icon name="diagonal" size={18} /></button>)}</div>
        <div className={styles.platterStage} id="platter-detail-v2"><div className={styles.platterPhoto}><Photo key={platter.id} src={assets[platter.image]} alt={`${platter.name} — illustrative platter artwork`} width={1448} height={1086} loading="lazy" /></div><div className={styles.platterCaption} aria-live="polite"><div><span>{platter.portion}</span><h3>{platter.name}</h3></div><strong>{peso(platter.price!)}</strong></div><p className={styles.platterDescription}>{platter.description}</p><div className={styles.platterActions}><button className={styles.creamButton} type="button" onClick={() => addDish(platter)}>Add to my meal plan<Icon name="plus" size={18} /></button><button type="button" className={styles.lightLink} onClick={() => openJourvis(`Can you tell me about the ${platter.name}, its current inclusions and portions?`)}>Ask about this platter<Icon name="diagonal" size={18} /></button></div></div>
      </div>
      <div className={styles.platterFootnote}><span>The platter menu lists a 1.25L soft drink with each platter.</span><span>Planning for a group? Let the restaurant confirm portions.</span></div>
      <Photo className={styles.platterQuote} src={assets.togetherQuote} alt="" aria-hidden="true" width={1086} height={1448} loading="lazy" />
    </section>

    <section id="rib-story-v2" className={styles.storySection} aria-labelledby="rib-story-title-v2">
      <div className={styles.storyImage}><Photo src={assets.interior} alt="Warm restaurant interior — illustrative atmosphere artwork" width={1672} height={941} loading="lazy" /><div className={styles.storyShade} /><Photo className={styles.storyQuote} src={assets.interiorQuote} alt="Good Food Good People" width={1086} height={1448} loading="lazy" /><span className={styles.artCaption}>A little Rib Crib atmosphere · illustrative artwork</span></div>
      <div className={styles.storyCopy} data-v2-reveal><p className={styles.eyebrow}>03 / The good company</p><h2 id="rib-story-title-v2">Some plans<br />are better<br /><em>around a table.</em></h2><p>No special occasion required. Just a few favourite people and a good reason to put the phones down.</p><p>Start with the food. Make a meal plan. Then ask the restaurant about the details for your get-together.</p><a className={styles.textLink} href="#rib-visit-v2">Let’s make a plan<Icon name="diagonal" size={18} /></a></div>
    </section>

    <section id="rib-visit-v2" className={styles.visitSection} aria-labelledby="rib-visit-title-v2">
      <div className={styles.visitCopy}><p className={styles.eyebrow}>04 / From “we should” to a plan</p><h2 id="rib-visit-title-v2">Make time<br /><em>to meat.</em></h2><p>Choose the details you have in mind. Jourvis will help you work through a reservation enquiry.</p><form className={styles.reservationForm} onSubmit={(event) => { event.preventDefault(); const prompt = reservationPrompt(date, time, party); if (!prompt) { setFormError('Choose a valid date from today onwards, a time, and 1–40 guests.'); return; } setFormError(''); openJourvis(prompt); }}>
        <div className={styles.reservationFields}><label>Date<input type="date" required min={today || undefined} value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Time<input type="time" required value={time} onChange={(event) => setTime(event.target.value)} /></label><label>Guests<input type="number" required min={1} max={40} step={1} value={party} onChange={(event) => setParty(event.target.value)} /></label></div>
        <p className={styles.timeNote}>Philippine time · availability still needs confirmation.</p>
        {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
        <button type="submit" className={styles.primary}>Ask about a table<Icon name="arrow" /></button><p className={styles.demoNote}>Demo enquiry only. No table is booked from this form.</p>
      </form></div>
      <div className={styles.bbqPanel}><Photo src={assets.orders} alt="Barbecue wings — illustrative brand artwork" width={1122} height={1402} loading="lazy" /><div className={styles.bbqShade} /><Photo className={styles.bbqQuote} src={assets.bbqQuote} alt="Life is better with BBQ" width={1086} height={1448} loading="lazy" /><button type="button" onClick={() => openJourvis('I’m interested in a pickup request. How can I plan it?')} className={styles.pickupLink}><span>Taking the good food with you?<strong>Ask about pickup</strong></span><Icon name="diagonal" size={24} /></button></div>
    </section>

    <section id="rib-jourvis-v2" className={styles.assistantSection} aria-labelledby="rib-jourvis-title-v2">
      <div className={styles.assistantCopy}><p className={styles.eyebrow}>A little help from Jourvis</p><h2 id="rib-jourvis-title-v2">Less deciding.<br /><em>More looking forward.</em></h2><p>Ask about the menu, compare your shortlist, or work through a request. The real Jourvis demo is one conversation away.</p><form className={styles.askForm} onSubmit={(event) => { event.preventDefault(); if (question.trim()) openJourvis(question.trim()); }}><label className={styles.srOnly} htmlFor={`${instance}-question`}>What would you like to ask Jourvis?</label><input id={`${instance}-question`} maxLength={1000} value={question} placeholder="What should we get for the table?" onChange={(event) => setQuestion(event.target.value)} /><button type="submit" aria-label="Continue your question in Jourvis"><Icon name="arrow" /></button></form><div className={styles.promptButtons}>{quickPrompts.map((prompt) => <button type="button" key={prompt} onClick={() => openJourvis(prompt)}>{prompt}<Icon name="diagonal" size={14} /></button>)}</div><p className={styles.assistantDisclosure}>{copy.demoDisclaimer}</p></div>
      <div className={styles.assistantPreview}><span className={styles.previewLabel}>A conversation could start here</span><div className={styles.exampleCustomer}>We’re getting together. Where should I start?</div><div className={styles.exampleJourvis}><JourvisCompanion size={44} molecules={false} /><p>Tell me what you’re in the mood for. We can explore ribs, wings, platters, or your own shortlist.</p></div><span className={styles.exampleNote}>Illustrative example, not a live reply.</span><button type="button" className={styles.creamButton} onClick={() => openJourvis()}>Try the real conversation<Icon name="chat" size={18} /></button><div className={styles.powered}><span /> Powered by Jourvis</div></div>
    </section>

    <footer className={styles.footer}><div className={styles.footerTop}><a href="#rib-top" aria-label="The Rib Crib, back to top"><Photo className={styles.footerBrand} src={assets.footer} alt="The Rib Crib — Eat Meat Repeat" width={2172} height={724} loading="lazy" /></a><div><p className={styles.footerLabel}>Let’s meat here</p><h2>Good food.<br />Even better company.</h2></div><a className={styles.creamButton} href={copy.facebook} target="_blank" rel="noopener noreferrer">Message the restaurant<Icon name="diagonal" size={18} /></a></div><div className={styles.footerDetails}><div><strong>Planning your visit?</strong><p>Check the restaurant’s Facebook page for current hours, directions and contact details.</p></div><div><strong>A note before you order</strong><p>{copy.priceDisclaimer}</p></div><div><strong>Made with a little help</strong><p>A restaurant experience powered by Jourvis.</p><a href="/">Discover Jourvis<Icon name="diagonal" size={15} /></a></div></div><div className={styles.footerBottom}><span>© {new Date().getFullYear()} The Rib Crib</span><span>{copy.imageDisclaimer}</span><a href="/privacy">Privacy</a></div></footer>

    <RibCribJourvisChat business={business} className={styles.chatPanel} />
    {summary.count > 0 && !planOpen && !detail && !demoOpen ? <button type="button" className={styles.planLauncher} onClick={() => setPlanOpen(true)} aria-label={`Open meal plan, ${summary.count} selections`}><span className={styles.planCount}>{summary.count}</span><span>My meal plan<small>{summary.unpriced ? 'Some prices to confirm' : peso(summary.subtotal)}</small></span><Icon name="arrow" size={18} /></button> : null}
    <span className={styles.srOnly} role="status" aria-live="polite">{announcement}</span>

    {detail ? <Modal titleId={`${instance}-dish-title`} onClose={() => setDetail(null)}><div className={styles.dishModalImage}><Photo src={assets[detail.image]} alt={`${detail.name} — illustrative artwork`} width={1254} height={1254} /></div><div className={styles.dishModalBody}><p className={styles.eyebrow}>{detail.portion || detail.category}</p><h2 id={`${instance}-dish-title`}>{detail.name}</h2><strong className={styles.modalPrice}>{detail.price === null ? detail.priceNote : peso(detail.price)}</strong><p>{detail.description}</p><button type="button" className={styles.primary} onClick={() => { addDish(detail); setDetail(null); }}>Add to my meal plan<Icon name="plus" /></button><p className={styles.demoNote}>A shortlist, not an order. Confirm prices and dietary requirements with the restaurant.</p></div></Modal> : null}
    {planOpen ? <Modal titleId={`${instance}-plan-title`} onClose={() => setPlanOpen(false)} drawer><div className={styles.planBody}><p className={styles.eyebrow}>A little of this. A plate of that.</p><h2 id={`${instance}-plan-title`}>Your kind<br /><em>of feast.</em></h2><p className={styles.planIntro}>Save what catches your eye. Jourvis can help with the details when you’re ready.</p><div className={styles.planItems}>{Object.entries(plan).map(([id, quantity]) => { const item = dishById[id]!; return <div key={id} className={styles.planItem}><Photo src={assets[item.image]} alt="" width={1254} height={1254} /><div><h3>{item.name}</h3><p>{item.price === null ? 'Price to confirm' : peso(item.price * quantity)}</p><div className={styles.quantityControl}><button type="button" aria-label={`Remove one ${item.name}`} onClick={() => setPlan((value) => adjustPlan(value, id, -1))}><Icon name="minus" size={16} /></button><span aria-label={`${quantity} selected`}>{quantity}</span><button type="button" aria-label={`Add one ${item.name}`} disabled={quantity >= 20} onClick={() => setPlan((value) => adjustPlan(value, id, 1))}><Icon name="plus" size={16} /></button></div></div></div>; })}</div>{!summary.count ? <p className={styles.planEmpty}>Your table is still open. Browse the menu and tap + on a dish to begin.</p> : null}<div className={styles.planTotal}><span>Indicative subtotal</span><strong>{priceSummary(plan)}</strong></div><p className={styles.demoNote}>Not a checkout or confirmed order. Prices, availability and portions need confirmation.</p><button type="button" className={styles.primary} onClick={askAboutPlan}>Talk through my plan<Icon name="chat" size={19} /></button><button type="button" className={styles.textLink} onClick={() => setPlanOpen(false)}>Keep exploring<Icon name="arrow" size={17} /></button></div></Modal> : null}
  </div>;
}
