'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import {
  connectDemo,
  demoRequest,
  loadDemo,
  type DemoReply,
} from '@/lib/jourvis/live-demo';
import type { InitialBusiness } from './JourvisExperience';

type ChatMessage = {
  id: string;
  role: 'jourvis' | 'customer';
  text: string;
};

type LauncherEvent = CustomEvent<{ prompt?: string }>;
type RoamPoint = { x: number; y: number; label: string };

const QUICK_PROMPTS = [
  'What are your bestsellers?',
  'What do you recommend for 4 people?',
  'Do you have unlimited wings?',
  'I want to order for pickup.',
  'Reserve a table.',
];

const ROAM_LABELS = [
  'Need help choosing?',
  'Ask me about the menu',
  'Planning a barkada meal?',
  'I can help reserve a table',
  'Tap me anytime',
];

export default function RibCribJourvisChat({ business }: { business: InitialBusiness }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [reply, setReply] = useState<DemoReply | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roamPoint, setRoamPoint] = useState<RoamPoint>({ x: -180, y: -180, label: ROAM_LABELS[0] });
  const initialized = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  const roamStep = useRef(0);
  const scope = business.publicPath;

  const accept = useCallback(async (result: DemoReply, visible = true) => {
    if (visible && result.reply) {
      setMessages((current) => {
        const id = result.receiptId || crypto.randomUUID();
        if (current.some((message) => message.id === id)) return current;
        return [...current, { id, role: 'jourvis', text: result.reply! }].slice(-40);
      });
      setReply(result);
    }
    if (result.requiresAcknowledgement) {
      await demoRequest('ack', {
        receiptId: result.receiptId,
        messageId: result.messageId,
      }, scope);
    }
  }, [scope]);

  const ensureRestaurant = useCallback(async () => {
    if (initialized.current) return;
    initialized.current = true;
    setBusy(true);
    setError('');
    try {
      await connectDemo(scope);
      let state = await loadDemo(scope);
      if (!state.reply) {
        state = await demoRequest('turn', {
          messageId: crypto.randomUUID(),
          text: 'Hi',
        }, scope);
      }

      const selected = state.notebook?.business?.toLowerCase().includes('rib crib') === true;
      if (!selected) {
        await accept(state, false);
        if (state.notebook?.business) {
          const restarted = await demoRequest('turn', {
            messageId: crypto.randomUUID(),
            text: 'restart',
          }, scope);
          await accept(restarted, false);
        }
        state = await demoRequest('turn', {
          messageId: crypto.randomUUID(),
          text: business.presetKey || business.adapterKey,
        }, scope);
      }

      setReady(true);
      await accept(state, true);
    } catch (err) {
      initialized.current = false;
      setError(err instanceof Error ? err.message : 'Jourvis is temporarily unavailable.');
    } finally {
      setBusy(false);
    }
  }, [accept, business.adapterKey, business.presetKey, scope]);

  const sendMessage = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    if (!ready) await ensureRestaurant();

    const id = crypto.randomUUID();
    setMessages((current) => [...current, { id, role: 'customer', text: clean }]);
    setDraft('');
    setBusy(true);
    setError('');
    try {
      const result = await demoRequest('turn', { messageId: id, text: clean }, scope);
      await accept(result, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The connection paused. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [accept, busy, ensureRestaurant, ready, scope]);

  const positionJourvis = useCallback(() => {
    if (typeof window === 'undefined' || open) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.innerWidth < 780;
    const size = mobile ? 72 : 94;
    const margin = mobile ? 12 : 24;
    const safeTop = mobile ? 84 : 105;
    const safeBottom = mobile ? 104 : 30;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const points: Array<[number, number]> = [
      [width - size - margin, height - size - safeBottom],
      [margin, Math.max(safeTop, height * 0.34)],
      [width - size - margin, Math.max(safeTop, height * 0.22)],
      [margin, Math.max(safeTop, height - size - 135)],
      [Math.max(margin, width * 0.58 - size / 2), Math.max(safeTop, height * 0.52)],
    ];
    const index = reducedMotion ? 0 : roamStep.current % points.length;
    const [x, y] = points[index];
    setRoamPoint({ x, y, label: ROAM_LABELS[index % ROAM_LABELS.length] });
  }, [open]);

  useEffect(() => {
    const openChat = (event: Event) => {
      const custom = event as LauncherEvent;
      setOpen(true);
      if (custom.detail?.prompt) setDraft(custom.detail.prompt);
    };
    window.addEventListener('ribcrib:jourvis', openChat);
    return () => window.removeEventListener('ribcrib:jourvis', openChat);
  }, []);

  useEffect(() => {
    if (open && !initialized.current) void ensureRestaurant();
  }, [ensureRestaurant, open]);

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    if (open) return;
    positionJourvis();
    const timer = window.setInterval(() => {
      roamStep.current += 1;
      positionJourvis();
    }, 7600);
    const onResize = () => positionJourvis();
    window.addEventListener('resize', onResize);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', onResize);
    };
  }, [open, positionJourvis]);

  return (
    <>
      <button
        className={`rib-jourvis-launcher${open ? ' is-chat-open' : ''}`}
        style={{ left: roamPoint.x, top: roamPoint.y }}
        type="button"
        aria-label="Chat with Jourvis for The Rib Crib"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="rib-jourvis-pulse" aria-hidden />
        <span className="rib-jourvis-shadow" aria-hidden />
        <img src="/rib-crib/jourvis.png" alt="" aria-hidden />
        {!open && <span className="rib-jourvis-thought">{roamPoint.label}</span>}
      </button>

      {open && (
        <aside className="rib-jourvis-chat" aria-label="Chat with Jourvis">
          <header className="rib-jourvis-chat-head">
            <div className="rib-jourvis-chat-identity">
              <span className="rib-jourvis-mini">
                <img src="/rib-crib/jourvis.png" alt="" aria-hidden />
              </span>
              <div>
                <strong>Jourvis × The Rib Crib</strong>
                <span><i /> The Rib Crib restaurant preset loaded</span>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={18} aria-hidden />
            </button>
          </header>

          <div className="rib-jourvis-chat-intro">
            <Sparkles size={15} aria-hidden />
            <span>Ask naturally. I’m using The Rib Crib menu, prices, platters, and restaurant flow.</span>
          </div>

          <div className="rib-jourvis-log" ref={logRef} role="log" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`rib-chat-message ${message.role}`}>
                {message.role === 'jourvis' && (
                  <span className="rib-chat-avatar" aria-hidden>
                    <img src="/rib-crib/jourvis.png" alt="" />
                  </span>
                )}
                <p>{message.text}</p>
              </div>
            ))}
            {busy && (
              <div className="rib-chat-typing" aria-label="Jourvis is replying">
                <span /><span /><span />
              </div>
            )}
          </div>

          {reply?.choices?.length ? (
            <div className="rib-chat-choices">
              {reply.choices.slice(0, 4).map((choice) => (
                <button key={choice.id} type="button" disabled={busy} onClick={() => void sendMessage(choice.title)}>
                  {choice.title}
                </button>
              ))}
            </div>
          ) : (
            <div className="rib-chat-choices">
              {QUICK_PROMPTS.slice(0, 4).map((prompt) => (
                <button key={prompt} type="button" disabled={busy} onClick={() => void sendMessage(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {error && <p className="rib-chat-error" role="alert">{error}</p>}

          <form
            className="rib-chat-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(draft);
            }}
          >
            <label className="sr-only" htmlFor="rib-jourvis-message">Message Jourvis</label>
            <textarea
              id="rib-jourvis-message"
              rows={1}
              maxLength={4000}
              value={draft}
              placeholder="Ask about ribs, platters, reservations…"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void sendMessage(draft);
                }
              }}
            />
            <button type="submit" disabled={busy || !draft.trim()} aria-label="Send message">
              <Send size={18} aria-hidden />
            </button>
          </form>
          <p className="rib-chat-disclaimer">Jourvis demo · no real kitchen order or table reservation is sent.</p>
        </aside>
      )}
    </>
  );
}
