'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Send, Sparkles, X } from 'lucide-react';
import { connectDemo, demoRequest, loadDemo, type DemoReply } from '@/lib/jourvis/live-demo';
import { createBusinessDemoBootstrap, isExpectedBusiness } from '@/lib/jourvis/business-demo-bootstrap';
import type { InitialBusiness } from '@/lib/businesses/types';
import JourvisCompanion from '@/components/jourvis/JourvisCompanion';
import JourvisLauncher from '@/components/jourvis/JourvisLauncher';
import styles from './RestaurantJourvisChat.module.css';
import type { RestaurantChatPresentation } from '@/lib/businesses/restaurant/shared/chat-config';

type ChatMessage = { id: string; role: 'jourvis' | 'customer'; text: string };
type LauncherEvent = CustomEvent<{ prompt?: string }>;
type PendingMessage = { id: string; text: string; choiceId?: string };

/** One chat/session for all page entry points. The transport and preset key stay unchanged. */
export default function RestaurantJourvisChat({ business, presentation, className = '' }: { business: InitialBusiness; presentation: RestaurantChatPresentation; className?: string }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [reply, setReply] = useState<DemoReply | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingMessage | null>(null);
  const readyRef = useRef(false);
  const busyRef = useRef(false);
  const initRef = useRef<Promise<boolean> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const scope = business.publicPath;
  const bootstrap = useMemo(() => createBusinessDemoBootstrap({
    displayName: business.displayName, adapterKey: business.adapterKey, presetKey: business.presetKey,
  }, {
    connect: () => connectDemo(scope),
    load: () => loadDemo(scope),
    turn: (message) => demoRequest('turn', message, scope),
    ack: (receipt) => demoRequest('ack', receipt, scope),
  }), [business.displayName, business.adapterKey, business.presetKey, scope]);

  const closeChat = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => {
      const target = openerRef.current?.isConnected ? openerRef.current : launcherRef.current;
      target?.focus({ preventScroll: true });
    });
  }, []);

  const accept = useCallback(async (result: DemoReply, visible = true) => {
    if (visible) {
      if (result.reply) {
        setMessages((current) => {
          const id = result.receiptId || result.messageId || crypto.randomUUID();
          if (current.some((message) => message.id === id && message.role === 'jourvis')) return current;
          return [...current, { id, role: 'jourvis' as const, text: result.reply! }].slice(-40);
        });
      }
      setReply(result);
    }
    if (result.requiresAcknowledgement) {
      await demoRequest('ack', { receiptId: result.receiptId, messageId: result.messageId }, scope);
    }
  }, [scope]);

  const ensureRestaurant = useCallback((): Promise<boolean> => {
    if (readyRef.current) return Promise.resolve(true);
    if (initRef.current) return initRef.current;
    const task = (async () => {
      busyRef.current = true;
      setBusy(true);
      setError('');
      try {
        const state = await bootstrap.connect();
        await accept(state, true);
        readyRef.current = true;
        setReady(true);
        return true;
      } catch (err) {
        readyRef.current = false;
        setReady(false);
        setError(err instanceof Error ? err.message : 'Jourvis is temporarily unavailable.');
        return false;
      } finally {
        busyRef.current = false;
        setBusy(false);
        initRef.current = null;
      }
    })();
    initRef.current = task;
    return task;
  }, [accept, bootstrap]);

  const sendMessage = useCallback(async (text: string, choiceId?: string, retry?: PendingMessage) => {
    const clean = text.trim();
    if (!clean || busyRef.current) return;
    if (!readyRef.current && !(await ensureRestaurant())) return;
    if (busyRef.current) return;
    const request: PendingMessage = retry || { id: crypto.randomUUID(), text: clean, ...(choiceId ? { choiceId } : {}) };
    if (!retry) setMessages((current) => [...current, { id: request.id, role: 'customer' as const, text: clean }].slice(-40));
    setDraft('');
    busyRef.current = true;
    setBusy(true);
    setError('');
    setPending(request);
    try {
      const result = await demoRequest('turn', { messageId: request.id, text: request.text, ...(request.choiceId ? { choiceId: request.choiceId } : {}) }, scope);
      await accept(result, true);
      setPending(null);
      if (!isExpectedBusiness(result, business)) {
        readyRef.current = false;
        setReady(false);
        setError(`This session left ${business.displayName} demo. Reconnect to continue with this restaurant.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The connection paused. Retry the message to check its result.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [accept, business, ensureRestaurant, scope]);

  useEffect(() => {
    const openChat = (event: Event) => {
      const custom = event as LauncherEvent;
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setOpen(true);
      if (custom.detail?.prompt) setDraft(custom.detail.prompt);
    };
    window.addEventListener(presentation.openEvent, openChat);
    return () => window.removeEventListener(presentation.openEvent, openChat);
  }, [presentation.openEvent]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(presentation.stateEvent, { detail: { open } }));
    if (!open) return;
    void ensureRestaurant();
    const frame = window.requestAnimationFrame(() => {
      if (window.matchMedia('(pointer: fine)').matches) composerRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, ensureRestaurant, presentation.stateEvent]);
  useEffect(() => {
    if (!logRef.current) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    logRef.current.scrollTo({ top: logRef.current.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [messages, busy]);

  const panel = open ? <aside id={presentation.panelId} className={`rib-jourvis-chat ${styles.theme} ${styles.panel}${className ? ` ${className}` : ''}`} role="dialog" aria-label="Chat with Jourvis" aria-describedby={presentation.disclaimerId}
    onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeChat(); } }}>
    <header className="rib-jourvis-chat-head"><div className="rib-jourvis-chat-identity"><span className="rib-jourvis-mini"><JourvisCompanion size={34} molecules={false} /></span><div><strong>Jourvis × {business.displayName}</strong><span>{ready ? `${business.displayName} restaurant preset loaded` : busy ? 'Connecting to the restaurant demo…' : 'Restaurant demo not connected'}</span></div></div><button type="button" onClick={closeChat} aria-label="Close chat"><X size={18} aria-hidden /></button></header>
    <div className="rib-jourvis-chat-intro"><Sparkles size={15} aria-hidden /><span>Explore menu questions, meal plans and reservation enquiries. Confirm current prices with the restaurant.</span></div>
    <div className="rib-jourvis-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions text">
      {!messages.length && !busy ? <p className="rib-chat-empty">Your conversation will appear here once Jourvis connects.</p> : null}
      {messages.map((message) => <div key={`${message.role}:${message.id}`} className={`rib-chat-message ${message.role}`}>{message.role === 'jourvis' ? <span className="rib-chat-avatar" aria-hidden><JourvisCompanion size={28} molecules={false} /></span> : null}<p>{message.text}</p></div>)}
      {busy ? <div className="rib-chat-typing" aria-label={ready ? 'Jourvis is replying' : 'Connecting to Jourvis'}><span /><span /><span /></div> : null}
    </div>
    {ready ? <div className="rib-chat-choices">{reply?.choices?.length ? reply.choices.slice(0,4).map((choice) => <button key={choice.id} type="button" disabled={busy || !!pending} onClick={() => void sendMessage(choice.title, choice.id)}>{choice.title}</button>) : presentation.quickPrompts.map((prompt) => <button key={prompt} type="button" disabled={busy || !!pending} onClick={() => void sendMessage(prompt)}>{prompt}</button>)}</div> : null}
    {error ? <p className="rib-chat-error" role="alert">{error}</p> : null}
    {error && !busy ? <button className="rib-chat-retry" type="button" onClick={() => { if (pending) void sendMessage(pending.text, pending.choiceId, pending); else void ensureRestaurant(); }}>{pending ? 'Retry the same message' : 'Retry connection'}</button> : null}
    <form className="rib-chat-composer" onSubmit={(event) => { event.preventDefault(); if (!pending) void sendMessage(draft); }}>
      <label className="sr-only" htmlFor={presentation.messageId}>Message Jourvis</label><textarea id={presentation.messageId} ref={composerRef} rows={1} maxLength={4000} value={draft} placeholder={presentation.placeholder} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!pending) void sendMessage(draft); } }} />
      <button type="submit" disabled={busy || !ready || !draft.trim() || !!pending} aria-label="Send message"><Send size={18} aria-hidden /></button>
    </form><p id={presentation.disclaimerId} className="rib-chat-disclaimer">Jourvis demo · no real kitchen order or table reservation is sent.</p>
  </aside> : null;

  return <>
    <JourvisLauncher open={open} onOpen={() => { openerRef.current = launcherRef.current; setOpen(true); }} buttonRef={launcherRef} controls={presentation.panelId} label={`Chat with Jourvis for ${business.displayName}`} hint={presentation.hint} />
    {panel ? createPortal(panel, document.body) : null}
  </>;
}
