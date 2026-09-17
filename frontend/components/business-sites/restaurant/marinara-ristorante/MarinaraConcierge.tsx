'use client';
import { useRef, useState, type RefObject } from 'react';
import { Copy, MessageCircle } from 'lucide-react';
import type { InitialBusiness } from '@/lib/businesses/types';
import RestaurantJourvisChat from '@/components/business-sites/restaurant/shared/RestaurantJourvisChat';
import JourvisCompanion from '@/components/jourvis/JourvisCompanion';
import { marinaraSiteConfig as config } from '@/lib/businesses/restaurant/marinara-ristorante/config';
import styles from './MarinaraPage.module.css';

export default function MarinaraConcierge({ business, draft, onDraft, inputRef }: {
  business: InitialBusiness;
  draft: string;
  onDraft: (value: string) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const [status, setStatus] = useState('');
  const copyId = useRef(0);
  async function copyDraft() {
    const id = ++copyId.current;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(draft);
      if (id === copyId.current) setStatus('Enquiry copied. Nothing has been sent.');
    } catch {
      inputRef.current?.focus(); inputRef.current?.select();
      if (id === copyId.current) setStatus('Copy is unavailable here. Select the text above and copy it manually.');
    }
  }
  return <section className={styles.concierge} id="marinara-jourvis" aria-labelledby="marinara-jourvis-title">
    <div className={styles.conciergeHead}><span><JourvisCompanion size={36} molecules={false} /></span><div><h3 id="marinara-jourvis-title">Jourvis</h3><p>Dining companion</p></div><b>{config.runtimeEnabled ? 'Demo' : 'Preview'}</b></div>
    <p className={styles.conciergeLead}>Need a second opinion on the table?</p>
    <p className={styles.panelNote}>{config.runtimeEnabled ? 'Ask about menu choices and prepare an enquiry.' : config.runtimeNotice}</p>
    <div className={styles.quickPrompts}>{config.chat.quickPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => { onDraft(prompt); setStatus(''); inputRef.current?.focus(); }}>{prompt}</button>)}</div>
    <label htmlFor="marinara-enquiry">Your enquiry</label>
    <textarea id="marinara-enquiry" ref={inputRef} rows={6} maxLength={4000} value={draft} onChange={(e) => { onDraft(e.target.value); setStatus(''); }} placeholder={config.chat.placeholder} />
    <div className={styles.conciergeActions}><button className={styles.primary} type="button" disabled={!draft.trim()} onClick={() => void copyDraft()}><Copy size={15} aria-hidden /> Copy enquiry</button>{config.runtimeEnabled ? <button className={styles.secondary} type="button" onClick={() => window.dispatchEvent(new CustomEvent(config.chat.openEvent, { detail: { prompt: draft } }))}><MessageCircle size={15} aria-hidden /> Open chat</button> : null}</div>
    <p className={styles.copyStatus} role="status">{status || 'No order, booking or message is submitted.'}</p>
    {config.runtimeEnabled ? <RestaurantJourvisChat business={business} presentation={config.chat} /> : null}
  </section>;
}
