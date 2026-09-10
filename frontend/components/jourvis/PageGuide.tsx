'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { CompanionState } from '@/lib/jourvis/config';
import CompanionMark from './CompanionMark';

const sections = [
  {
    key: 'hero',
    label: 'Meet Jourvis',
    title: 'A good place to start.',
    text: 'I’m Jourvis. Try a sample customer conversation and see how the details come together.',
    action: 'Show me the demo',
    target: 'demo',
  },
  {
    key: 'demo',
    label: 'Try the demo',
    title: 'Let’s try one small thing.',
    text: 'Pick a business, then a customer question, appointment, or handoff. You can change your choice at any time.',
    action: 'Go to the demo controls',
    target: 'demo',
  },
  {
    key: 'outcomes',
    label: 'What I can help with',
    title: 'Try the details for yourself.',
    text: 'Tap a question, choose a time, or bring the scattered notes together. Each example shows a different part of the day I can help with.',
    action: 'Explore the examples',
    target: 'outcomes',
  },
  {
    key: 'principles',
    label: 'My approach & FAQ',
    title: 'A little clarity helps.',
    text: 'Wondering how this works? Open a question below for the details about this preview and the ideas behind Jourvis.',
    action: 'Take me to the FAQ',
    target: 'jourvis-faq',
  },
  {
    key: 'final',
    label: 'Next steps',
    title: 'Where would you like to go next?',
    text: 'Try another example, or use the Facebook link here to meet Jourvis on Messenger.',
    action: 'Try another example',
    target: 'demo',
  },
] as const;

export default function PageGuide({ state }: { state: CompanionState }) {
  const [active, setActive] = useState<string>('hero');
  const [open, setOpen] = useState(false);
  const [inGap, setInGap] = useState(false);
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const section = sections.find((item) => item.key === active) ?? sections[0];

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const point = innerHeight * 0.42;
      const regions = [
        ...document.querySelectorAll<HTMLElement>('[data-world-section]'),
      ];
      const current = regions.find((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top <= point && rect.bottom > point;
      });
      if (current) setActive(current.dataset.worldSection!);
      // Keep the original anchors. A compact companion covers only the gaps.
      const visible = [
        ...document.querySelectorAll('[data-particle-anchor]'),
      ].some((el) => {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        return center > 60 && center < innerHeight - 60;
      });
      setInGap(!visible);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    const resize = new ResizeObserver(schedule);
    document
      .querySelectorAll('[data-world-section]')
      .forEach((el) => resize.observe(el));
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    heading.current?.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus({ preventScroll: true });
      }
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', key);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);

  const go = (target: string) => {
    const element = document.getElementById(target);
    if (!element) return;
    setOpen(false);
    element.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    });
    element.focus({ preventScroll: true });
  };
  const hint =
    active !== 'demo'
      ? section.text
      : state === 'organizing'
        ? 'I’m putting this example together. The result will appear beside the conversation, or below it on your phone.'
        : state === 'completed'
          ? 'Your sample result is ready. For an appointment, choose a time to see the summary. Try another example whenever you like.'
          : state === 'handoff'
            ? 'Here’s the context a team member could receive. This is a preview; no one has been notified.'
            : section.text;

  return (
    <aside
      ref={root}
      className="page-guide"
      data-section={active}
      data-in-gap={inGap}
      aria-label="Jourvis page guide"
    >
      <button
        ref={trigger}
        className="guide-trigger"
        aria-expanded={open}
        aria-controls="jourvis-guide-panel"
        onClick={() => setOpen(!open)}
        aria-label={
          open ? 'Close Jourvis page guide' : 'Open Jourvis page guide'
        }
      >
        <CompanionMark />
        <span>Page guide</span>
      </button>
      {open && (
        <section
          id="jourvis-guide-panel"
          className="guide-panel"
          aria-labelledby="guide-title"
        >
          <div className="guide-heading">
            <span>Jourvis / Your page guide</span>
            <button
              className="quiet-button"
              aria-label="Close guide"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <X size={18} aria-hidden />
            </button>
          </div>
          <h2 ref={heading} id="guide-title" tabIndex={-1}>
            {section.title}
          </h2>
          <p>{hint}</p>
          <button className="guide-action" onClick={() => go(section.target)}>
            {section.action}
            <ArrowRight size={16} aria-hidden />
          </button>
          <nav aria-label="Explore with Jourvis">
            {sections.map((item) => (
              <button
                key={item.key}
                aria-current={active === item.key ? 'location' : undefined}
                onClick={() =>
                  go(
                    item.key === 'hero'
                      ? 'hero-title'
                      : item.key === 'final'
                        ? 'final-title'
                        : item.key,
                  )
                }
              >
                {item.label}
              </button>
            ))}
          </nav>
          <small>
            This guide helps you explore the page. The demo uses fictional
            details.
          </small>
        </section>
      )}
    </aside>
  );
}
