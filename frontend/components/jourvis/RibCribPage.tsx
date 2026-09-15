/// <reference types="vite/client" />
'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Flame,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import type { InitialBusiness } from './JourvisExperience';
import RibCribJourvisChat from './RibCribJourvisChat';

import ribHero from '@/src/assets/rib-crib/rib-crib-hero-bbq-wings.png';
import ribInterior from '@/src/assets/rib-crib/rib-crib-restaurant-interior.png';
import ribWood from '@/src/assets/rib-crib/rib-crib-dark-wood-background.png';
import ribOrders from '@/src/assets/rib-crib/rib-crib-orders-bbq-background.png';
import ribEmblem from '@/src/assets/rib-crib/rib-crib-emblem.png';
import ribFooterBrand from '@/src/assets/rib-crib/rib-crib-footer-brand-lockup.png';
import ribFries from '@/src/assets/rib-crib/rib-crib-plain-fries.png';
import ribSalad from '@/src/assets/rib-crib/rib-crib-salad.png';
import ribSisigTacos from '@/src/assets/rib-crib/rib-crib-sisig-tacos.png';
import ribWings6 from '@/src/assets/rib-crib/rib-crib-chicken-wings-6pcs.png';
import ribBarbecueRibs from '@/src/assets/rib-crib/rib-crib-barbecue-ribs-2pcs.png';
import ribUnlimitedWings from '@/src/assets/rib-crib/rib-crib-unlimited-wings.png';
import ribJuice from '@/src/assets/rib-crib/rib-crib-juice.png';
import ribIcedTea from '@/src/assets/rib-crib/rib-crib-iced-tea.png';
import ribPlatter from '@/src/assets/rib-crib/rib-crib-platter.png';
import ribPlatterWithRibs from '@/src/assets/rib-crib/rib-crib-platter-with-ribs.png';
import ribBarkadaPlatter from '@/src/assets/rib-crib/rib-crib-barkada-platter.png';
import ribBbqRibsPlatter from '@/src/assets/rib-crib/rib-crib-bbq-ribs-platter.png';
import ribMegaPlatter from '@/src/assets/rib-crib/rib-crib-mega-platter.png';

const MENU_ITEMS = [
  { name: 'Plain Fries', price: 115, image: ribFries, note: 'Crispy golden fries.' },
  { name: 'Rib Crib Salad', price: 325, image: ribSalad, note: 'Fresh, bright, and made for sharing.' },
  { name: 'Sisig Tacos', price: 225, image: ribSisigTacos, note: 'Savory sisig tucked into crisp tacos.' },
  { name: '6 pcs. Chicken Wings', price: 245, image: ribWings6, note: 'Choose from bold Rib Crib flavors.' },
  { name: '2 pcs. Barbecue Ribs', price: 395, image: ribBarbecueRibs, note: 'Smoky barbecue ribs, glazed and tender.' },
  { name: 'Unlimited Wings', price: 325, image: ribUnlimitedWings, note: 'Includes rice and iced tea.' },
  { name: 'Juice', price: 55, image: ribJuice, note: 'A cold drink for the feast.' },
  { name: 'Iced Tea', price: 25, image: ribIcedTea, note: 'Glass.' },
];

const PLATTERS = [
  { name: 'Rib Crib Platter', price: 875, image: ribPlatter, note: 'Wings, calamares, dynamites, fries + rice.' },
  { name: 'Rib Crib Platter with Ribs', price: 1045, image: ribPlatterWithRibs, note: 'A sharing platter with ribs and rice.' },
  { name: 'Barkada Platter', price: 1520, image: ribBarkadaPlatter, note: 'Wings, BBQ ribs, calamares, fries + rice.' },
  { name: 'BBQ Ribs Platter', price: 2225, image: ribBbqRibsPlatter, note: 'Built around the Rib Crib ribs.' },
  { name: 'Mega Platter', price: 2950, image: ribMegaPlatter, note: 'The biggest spread for a hungry group.' },
];

const RIB_ASSET_STYLE = {
  '--rib-hero-original': `url("${ribHero}")`,
  '--rib-interior-original': `url("${ribInterior}")`,
  '--rib-wood-original': `url("${ribWood}")`,
  '--rib-orders-original': `url("${ribOrders}")`,
  '--rib-emblem-original': `url("${ribEmblem}")`,
  '--rib-footer-brand-original': `url("${ribFooterBrand}")`,
  '--rib-menu-fries': `url("${ribFries}")`,
  '--rib-menu-salad': `url("${ribSalad}")`,
  '--rib-menu-sisig': `url("${ribSisigTacos}")`,
  '--rib-menu-wings6': `url("${ribWings6}")`,
  '--rib-menu-ribs': `url("${ribBarbecueRibs}")`,
  '--rib-menu-unli-wings': `url("${ribUnlimitedWings}")`,
  '--rib-menu-juice': `url("${ribJuice}")`,
  '--rib-menu-iced-tea': `url("${ribIcedTea}")`,
  '--rib-platter': `url("${ribPlatter}")`,
  '--rib-platter-ribs': `url("${ribPlatterWithRibs}")`,
  '--rib-barkada': `url("${ribBarkadaPlatter}")`,
  '--rib-bbq-ribs-platter': `url("${ribBbqRibsPlatter}")`,
  '--rib-mega-platter': `url("${ribMegaPlatter}")`,
} as React.CSSProperties;

function peso(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);
}

function openJourvis(prompt?: string) {
  window.dispatchEvent(new CustomEvent('ribcrib:jourvis', { detail: { prompt } }));
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function RibCribPage({ business }: { business: InitialBusiness }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [party, setParty] = useState('4');

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-rib-reveal]'));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.ribVisible = 'true';
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const reservationPrompt = `I want to reserve a table for ${party} people${date ? ` on ${date}` : ''}${time ? ` at ${time}` : ''}.`;

  return (
    <div className="rib-crib-page" style={RIB_ASSET_STYLE}>
      <nav className="rib-nav" aria-label="The Rib Crib navigation">
        <button className="rib-wordmark" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          The Rib Crib
        </button>
        <div className="rib-nav-links">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Home</button>
          <button type="button" onClick={() => scrollTo('rib-menu')}>Menu</button>
          <button type="button" onClick={() => scrollTo('rib-reservations')}>Reservations</button>
          <button type="button" onClick={() => scrollTo('rib-orders')}>Orders</button>
          <button type="button" onClick={() => scrollTo('rib-about')}>About</button>
        </div>
        <button className="rib-nav-chat" type="button" onClick={() => openJourvis()}>
          <MessageCircle size={16} aria-hidden /> Ask Jourvis
        </button>
      </nav>

      <section className="rib-hero" aria-labelledby="rib-hero-title">
        <div className="rib-hero-shade" />
        <div className="rib-hero-food" aria-hidden />
        <div className="rib-hero-copy">
          <img className="rib-hero-emblem" src={ribEmblem} alt="The Rib Crib — Let’s Meat Here, established 2018" />
          <p className="rib-hero-kicker">Ribs. Wings. Platters. Good food. Great company.</p>
          <h1 id="rib-hero-title">EAT<br />MEAT<br />REPEAT</h1>
          <p className="rib-hero-description">
            The Rib Crib is your go-to spot for smoky flavors, hearty meals, and food made to be shared.
          </p>
          <div className="rib-hero-actions">
            <button className="rib-btn rib-btn-red" type="button" onClick={() => scrollTo('rib-menu')}>
              <UtensilsCrossed size={18} aria-hidden /> View Menu
            </button>
            <button className="rib-btn rib-btn-dark" type="button" onClick={() => scrollTo('rib-reservations')}>
              <CalendarDays size={18} aria-hidden /> Reserve a Table
            </button>
            <button className="rib-btn rib-btn-light" type="button" onClick={() => openJourvis()}>
              <MessageCircle size={18} aria-hidden /> Ask Jourvis
            </button>
          </div>
        </div>
        <div className="rib-hero-script" aria-hidden>Good Food<br />Brings People<br />Together</div>
      </section>

      <section className="rib-feature-strip" data-rib-reveal>
        <article>
          <span><Flame size={28} aria-hidden /></span>
          <div><h2>Signature Flavors</h2><p>Juicy ribs, flavorful wings, hearty platters, and more.</p></div>
        </article>
        <article>
          <span><Users size={28} aria-hidden /></span>
          <div><h2>Perfect for Groups</h2><p>From barkada meals to family feasts, there’s plenty to share.</p></div>
        </article>
        <article>
          <span><ShoppingBag size={28} aria-hidden /></span>
          <div><h2>Easy Ordering</h2><p>Dine-in, pickup requests, or ask Jourvis what fits your craving.</p></div>
        </article>
        <div className="rib-feature-interior" aria-label="The Rib Crib restaurant interior" role="img" />
      </section>

      <section className="rib-menu-section" id="rib-menu" data-rib-reveal>
        <div className="rib-section-head">
          <div>
            <p>Our menu</p>
            <h2>Featured Menu</h2>
            <span>Favorites from the supplied The Rib Crib menu.</span>
          </div>
          <button type="button" onClick={() => openJourvis('Show me the menu and help me choose.')}>Ask Jourvis about the menu <ArrowRight size={17} aria-hidden /></button>
        </div>

        <div className="rib-menu-grid">
          {MENU_ITEMS.map((item, position) => (
            <article className="rib-menu-card" key={item.name} style={{ '--rib-delay': `${position * 45}ms` } as React.CSSProperties}>
              <div
                className="rib-menu-photo"
                style={{ backgroundImage: `url("${item.image}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                aria-hidden
              />
              <div className="rib-menu-card-copy">
                <h3>{item.name}</h3>
                <strong>{peso(item.price)}</strong>
                <p>{item.note}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="rib-platter-head">
          <div><h2>Featured Platters</h2><p>Big servings. Bigger memories.</p></div>
          <span>Includes sharing options from ₱875 to ₱2,950</span>
        </div>
        <div className="rib-platter-grid">
          {PLATTERS.map((item, position) => (
            <article className="rib-platter-card" key={item.name} style={{ '--rib-delay': `${position * 60}ms` } as React.CSSProperties}>
              <div
                className="rib-platter-photo"
                style={{ backgroundImage: `url("${item.image}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                aria-hidden
              />
              <div><h3>{item.name}</h3><strong>{peso(item.price)}</strong><p>{item.note}</p></div>
            </article>
          ))}
        </div>
        <p className="rib-menu-note">Menu and prices are based on the supplied The Rib Crib assets. Confirm current availability and pricing with restaurant staff.</p>
      </section>

      <section className="rib-service-grid" data-rib-reveal>
        <article className="rib-reservation-panel" id="rib-reservations">
          <div className="rib-panel-title"><CalendarDays size={28} aria-hidden /><div><h2>Table Reservations</h2><p>Plan a table with Jourvis in a few taps.</p></div></div>
          <div className="rib-reservation-form">
            <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label>Time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
            <label>Party Size<select value={party} onChange={(event) => setParty(event.target.value)}>{[1,2,3,4,5,6].map((count) => <option key={count} value={count}>{count} {count === 1 ? 'person' : 'people'}</option>)}</select></label>
          </div>
          <button className="rib-reserve-button" type="button" onClick={() => openJourvis(reservationPrompt)}>
            Reserve with Jourvis <ArrowRight size={18} aria-hidden />
          </button>
          <small>Demo only: no real table is reserved until restaurant staff confirms outside this simulation.</small>
        </article>

        <article className="rib-orders-panel" id="rib-orders">
          <div className="rib-panel-title"><MessageCircle size={28} aria-hidden /><div><h2>Orders &amp; Questions</h2><p>Use Jourvis as the front door to the menu.</p></div></div>
          <div className="rib-order-actions">
            <button type="button" onClick={() => openJourvis('What are your bestsellers?')}><UtensilsCrossed size={22} aria-hidden /><span><strong>Menu questions</strong><small>Ask about items and prices.</small></span></button>
            <button type="button" onClick={() => openJourvis('I want to order for pickup.')}><ShoppingBag size={22} aria-hidden /><span><strong>Pickup requests</strong><small>Build a draft pickup request.</small></span></button>
            <button type="button" onClick={() => openJourvis('Recommend a platter for my group.')}><Users size={22} aria-hidden /><span><strong>Group platters</strong><small>Find the best sharing option.</small></span></button>
            <button type="button" onClick={() => openJourvis('Can you recommend something based on my budget?')}><Star size={22} aria-hidden /><span><strong>Recommendations</strong><small>Get suggestions from Jourvis.</small></span></button>
          </div>
        </article>
      </section>

      <section className="rib-jourvis-showcase" id="rib-jourvis" data-rib-reveal>
        <article className="rib-chat-preview">
          <p className="rib-overline">Chat with Jourvis</p>
          <h2>Ask like a customer would.</h2>
          <div className="rib-preview-thread">
            <p className="customer">What do you recommend for 4 people?</p>
            <div className="jourvis"><img src="/rib-crib/jourvis.png" alt="" aria-hidden /><p>For four people, the Rib Crib Platter at ₱875 is a great place to start. If you want more ribs and a bigger spread, I can compare the Barkada Platter too.</p></div>
            <p className="customer">Do you have unlimited wings?</p>
            <div className="jourvis"><img src="/rib-crib/jourvis.png" alt="" aria-hidden /><p>Yes — the supplied menu lists Unlimited Wings at ₱325 with rice and iced tea.</p></div>
          </div>
        </article>
        <article className="rib-full-jourvis">
          <div className="rib-jourvis-character-stage">
            <span className="rib-ai-orbit" aria-hidden />
            <img src="/rib-crib/jourvis.png" alt="Jourvis AI assistant" />
          </div>
          <p className="rib-overline">Powered by Jourvis</p>
          <h2>Menu. Recommendations. Reservations. Orders.</h2>
          <p>The live demo is preloaded with The Rib Crib’s restaurant preset and the supplied menu information.</p>
          <div className="rib-quick-pills">
            <button type="button" onClick={() => openJourvis('What are your bestsellers?')}>What are your bestsellers?</button>
            <button type="button" onClick={() => openJourvis('Recommend a platter for 6 people.')}>Platter for 6</button>
            <button type="button" onClick={() => openJourvis('Reserve a table.')}>Reserve a table</button>
          </div>
          <button className="rib-btn rib-btn-red rib-full-chat-button" type="button" onClick={() => openJourvis()}>
            <Sparkles size={18} aria-hidden /> Open the live Jourvis chat
          </button>
        </article>
      </section>

      <section className="rib-about" id="rib-about" data-rib-reveal>
        <div className="rib-about-photo" role="img" aria-label="Inside The Rib Crib restaurant" />
        <div className="rib-about-copy">
          <p className="rib-overline">Our place</p>
          <h2>Good food.<br />Great company.</h2>
          <p>The Rib Crib is built around meals worth sharing — smoky ribs, flavorful wings, Filipino comfort food, and generous platters for barkadas, families, and celebrations.</p>
          <blockquote>“Good food brings people together.”</blockquote>
          <button className="rib-btn rib-btn-dark" type="button" onClick={() => openJourvis('Tell me about The Rib Crib.')}>Ask about The Rib Crib <ArrowRight size={17} aria-hidden /></button>
        </div>
      </section>

      <footer className="rib-footer">
        <div className="rib-footer-brand"><img src={ribFooterBrand} alt="" aria-hidden /><div><strong>The Rib Crib</strong><span>Eat Meat Repeat</span></div></div>
        <div className="rib-footer-item"><MapPin size={20} aria-hidden /><div><strong>Visit</strong><span>Tagum City, Davao del Norte</span></div></div>
        <div className="rib-footer-item"><Clock3 size={20} aria-hidden /><div><strong>Demo hours</strong><span>Daily · 11 AM–9 PM</span></div></div>
        <div className="rib-footer-item"><Phone size={20} aria-hidden /><div><strong>Contact</strong><a href="tel:+639270874592">0927 087 4592</a></div></div>
        <button className="rib-footer-powered" type="button" onClick={() => openJourvis()}><Sparkles size={19} aria-hidden /><span><strong>Powered by Jourvis</strong><small>AI for menu questions, requests &amp; reservations</small></span></button>
        <div className="rib-footer-bottom"><span>© 2026 The Rib Crib demo page.</span><span>Restaurant information shown for Jourvis demonstration; confirm current details with staff.</span></div>
      </footer>

      <RibCribJourvisChat business={business} />
    </div>
  );
}
