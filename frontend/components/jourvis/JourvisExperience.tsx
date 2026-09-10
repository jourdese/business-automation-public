'use client';
import { useReducer, useState } from 'react';
import { ArrowDown, ArrowUpRight, Pause, Play } from 'lucide-react';
import {
  botPixels,
  companionCaptions,
  companionTransition,
  siteConfig,
} from '@/lib/jourvis/config';
import InteractiveDemo from './InteractiveDemo';
import OutcomeSections from './OutcomeSections';
import PrinciplesSection from './PrinciplesSection';
import ParticleWorld from './ParticleWorld';
import PageGuide from './PageGuide';

export function StaticCompanion() {
  const paths = [1, 2, 3].map((value) =>
    botPixels
      .flatMap((row, y) =>
        row
          .split('')
          .flatMap((c, x) =>
            +c === value ? ['M' + x * 10 + ' ' + y * 10 + 'h8v8h-8Z'] : [],
          ),
      )
      .join(' '),
  );
  return (
    <svg
      viewBox="-25 -25 190 190"
      className="static-companion"
      aria-hidden="true"
    >
      <path d={paths[0]} fill="var(--emerald)" />
      <path d={paths[1]} fill="var(--mint)" opacity=".7" />
      <path d={paths[2]} fill="var(--ivory)" />
    </svg>
  );
}
function focusDemo() {
  const demo = document.getElementById('demo');
  if (!demo) return;
  demo.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth',
    block: 'start',
  });
  demo.focus({ preventScroll: true });
}
export default function JourvisExperience() {
  const [state, send] = useReducer(companionTransition, 'idle');
  const [paused, setPaused] = useState(false);
  return (
    <div className="jourvis-experience" data-companion-state={state}>
      <ParticleWorld state={state} paused={paused} />
      <PageGuide state={state} />
      <section
        className="hero section-wrap"
        aria-labelledby="hero-title"
        data-world-section="hero"
      >
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="status-square" />
            Jourvis / Business Automation
          </p>
          <h1 id="hero-title" tabIndex={-1}>
            Your business,
            <br />
            with room
            <br />
            to <span>breathe.</span>
          </h1>
          <p className="hero-description">
            Customer questions, appointments, and the details in between. I’m
            Jourvis. Let me help with the everyday.
          </p>
          <div className="hero-actions">
            <button
              className="button primary"
              onClick={() => {
                focusDemo();
                send('LISTEN');
              }}
              onFocus={() => send('NOTICE')}
              onBlur={() => send('REST')}
              onPointerEnter={() => send('NOTICE')}
              onPointerLeave={() => send('REST')}
              data-assist
            >
              Try Jourvis <ArrowUpRight size={20} aria-hidden />
            </button>
            <a className="text-link" href="#outcomes">
              See what I can help with <ArrowDown size={16} aria-hidden />
            </a>
          </div>
        </div>
        <div className="hero-presence" data-particle-anchor="hero">
          <StaticCompanion />
          <span className="orbit-label">YOUR EVERYDAY COMPANION</span>
          <button
            className="companion-invitation"
            onClick={() => {
              focusDemo();
              send('LISTEN');
            }}
            onFocus={() => send('NOTICE')}
            onBlur={() => send('REST')}
            onPointerEnter={() => send('NOTICE')}
            onPointerLeave={() => send('REST')}
            aria-label="Meet Jourvis in the interactive preview"
          >
            <span className="desktop-invite">I’ll show you around.</span>
            <span className="touch-invite">I’ll show you around.</span>
            <ArrowUpRight size={14} aria-hidden />
          </button>
        </div>
        <div className="hero-baseline">
          <span>Less back-and-forth. More room for you.</span>
          <a href="#demo">
            <span className="mono">Explore with Jourvis</span>
            <ArrowDown size={16} aria-hidden />
          </a>
        </div>
      </section>
      <div className="demo-companion-strip section-wrap">
        <output className="companion-caption" aria-live="polite">
          {companionCaptions[state]}
        </output>
        <span className="demo-companion-anchor" data-particle-anchor="demo">
          <StaticCompanion />
        </span>
      </div>
      <InteractiveDemo send={send} />
      <OutcomeSections send={send} />
      <PrinciplesSection />
      <section
        className="final-section section-wrap"
        aria-labelledby="final-title"
        data-world-section="final"
      >
        <div className="final-copy">
          <p className="eyebrow">Your next chapter</p>
          <h2 id="final-title" tabIndex={-1}>
            Let’s make work
            <br />
            feel <span>lighter.</span>
          </h2>
          <p>
            Explore how Jourvis could fit into your business,
            <br className="desktop-break" /> starting with a conversation.
          </p>
          <div className="final-actions">
            <button
              className="button primary"
              onClick={() => {
                focusDemo();
                send('LISTEN');
              }}
              data-assist
            >
              Try Jourvis <ArrowUpRight size={20} aria-hidden />
            </button>
            {siteConfig.messengerUrl && (
              <a
                className="text-link"
                href={siteConfig.messengerUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Meet us on Facebook <ArrowUpRight size={16} aria-hidden />
                <span className="sr-only"> (opens a new tab)</span>
              </a>
            )}
          </div>
        </div>
        <div className="final-presence" data-particle-anchor="final">
          <StaticCompanion />
        </div>
      </section>
      <div className="motion-controls section-wrap">
        <span className="mono">A LITTLE MORE ROOM TO BREATHE.</span>
        <button
          className="quiet-button motion-toggle"
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? (
            <Play size={13} aria-hidden />
          ) : (
            <Pause size={13} aria-hidden />
          )}
          {paused ? 'Resume motion' : 'Pause motion'}
        </button>
        <span className="motion-preference">
          Reduced motion follows your device settings.
        </span>
      </div>
    </div>
  );
}
