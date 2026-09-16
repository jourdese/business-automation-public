'use client';

import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  MessageCircle,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import InteractiveDemo from './InteractiveDemo';
import type { InitialBusiness } from '@/lib/businesses/types';
import type { CompanionEvent } from '@/lib/jourvis/config';

function titleCase(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function scrollToConversation() {
  document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const noCompanionTransition = (_event: CompanionEvent) => {};

export default function BusinessDemoPage({ business }: { business: InitialBusiness }) {
  const category = titleCase(business.adapterKey);
  const restaurant = business.adapterKey === 'restaurant';

  const cards = restaurant
    ? [
        {
          icon: <UtensilsCrossed size={20} aria-hidden />,
          title: 'Menu & prices',
          text: 'Ask naturally about sample dishes, prices, availability, and recommendations.',
        },
        {
          icon: <CalendarDays size={20} aria-hidden />,
          title: 'Table reservations',
          text: 'Work through a sample reservation without leaving the conversation.',
        },
        {
          icon: <MessageCircle size={20} aria-hidden />,
          title: 'Orders & questions',
          text: 'Try a pickup request, ask what to order, or continue with your own question.',
        },
      ]
    : [
        {
          icon: <MessageCircle size={20} aria-hidden />,
          title: 'Ask naturally',
          text: 'Ask about services, prices, policies, availability, or anything a customer might need.',
        },
        {
          icon: <CalendarDays size={20} aria-hidden />,
          title: 'Work through a request',
          text: 'See how Jourvis gathers the useful details and guides the next step.',
        },
        {
          icon: <Check size={20} aria-hidden />,
          title: 'Keep context together',
          text: 'Important details stay in the thread so the experience feels continuous.',
        },
      ];

  return (
    <div className="business-route-page">
      <section className="business-hero" aria-labelledby="business-title">
        <div className="business-hero-noise" aria-hidden />
        <div className="business-hero-grid">
          <div className="business-hero-copy">
            <div className="business-kicker">
              <span className="business-live-dot" />
              <span>{category}</span>
              <span className="business-kicker-divider">/</span>
              <span>Jourvis demo</span>
            </div>
            <h1 id="business-title">{business.displayName}</h1>
            <p className="business-hero-lead">
              {restaurant
                ? 'Explore a restaurant experience where Jourvis can answer menu questions, help customers choose, and guide reservations or requests.'
                : `Explore how Jourvis could serve customers for a ${category.toLowerCase()} business—answering questions, gathering details, and moving requests forward.`}
            </p>
            <div className="business-hero-actions">
              <button className="business-primary-action" onClick={scrollToConversation}>
                Talk to Jourvis <ArrowRight size={18} aria-hidden />
              </button>
              <span className="business-powered">
                <Sparkles size={15} aria-hidden /> Powered by Jourvis
              </span>
            </div>
          </div>

          <aside className="business-preview-card" aria-label={`${business.displayName} demo summary`}>
            <div className="business-preview-topline">
              <span>Customer experience preview</span>
              <span className="business-preview-status">LIVE DEMO</span>
            </div>
            <div className="business-preview-brand">
              <div className="business-brand-mark" aria-hidden>
                {business.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <strong>{business.displayName}</strong>
                <span>{category}</span>
              </div>
            </div>
            <div className="business-preview-messages" aria-hidden>
              <div className="business-preview-message customer">{restaurant ? 'What do you recommend for 4 people?' : 'What are your prices?'}</div>
              <div className="business-preview-message jourvis">
                {restaurant
                  ? 'I can help with that. Tell me your budget or what everyone likes, and I’ll narrow it down.'
                  : 'I can help. Tell me what you need and I’ll keep the useful details together.'}
              </div>
            </div>
            <button className="business-card-action" onClick={scrollToConversation}>
              Start a real demo conversation <ArrowRight size={16} aria-hidden />
            </button>
          </aside>
        </div>
      </section>

      <section className="business-trust-strip" aria-label="Demo capabilities">
        <span><Clock3 size={16} aria-hidden /> Available anytime</span>
        <span><MessageCircle size={16} aria-hidden /> English or Taglish</span>
        <span><Check size={16} aria-hidden /> Same Jourvis conversation engine</span>
      </section>

      <section className="business-capabilities" aria-labelledby="business-capabilities-title">
        <div className="business-section-heading">
          <span className="business-section-index">01</span>
          <div>
            <p className="business-section-eyebrow">Try the customer experience</p>
            <h2 id="business-capabilities-title">
              {restaurant ? 'From “what should we order?” to the next step.' : 'A smoother path from question to next step.'}
            </h2>
          </div>
        </div>
        <div className="business-capability-grid">
          {cards.map((card) => (
            <article key={card.title} className="business-capability-card">
              <span className="business-capability-icon">{card.icon}</span>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="business-conversation-intro" aria-hidden>
        <span className="business-section-index">02</span>
        <div>
          <p className="business-section-eyebrow">Talk with Jourvis</p>
          <h2>Try it like a customer would.</h2>
        </div>
      </section>

      <div className="business-demo-wrap">
        <InteractiveDemo send={noCompanionTransition} initialBusiness={business} />
      </div>

      <section className="business-footer-cta">
        <div>
          <span className="business-section-eyebrow">Powered by Jourvis</span>
          <h2>Your business page. Your information. Your conversation flow.</h2>
          <p>This preview uses the routed business configuration selected from the Jourvis database.</p>
        </div>
        <a href="/" className="business-secondary-action">
          Explore Jourvis <ArrowRight size={17} aria-hidden />
        </a>
      </section>
    </div>
  );
}
