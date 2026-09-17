'use client';
import { useRef, useState, type RefObject } from 'react';
import { Copy, MessageCircle, ArrowUpRight } from 'lucide-react';
import type { InitialBusiness } from '@/lib/businesses/types';
import { wildTreeSiteConfig as config } from '@/lib/businesses/restaurant/the-wild-tree/config';
import RestaurantJourvisChat from '../shared/RestaurantJourvisChat';
import JourvisCompanion from '@/components/jourvis/JourvisCompanion';
import styles from './WildTreePage.module.css';
export default function WildTreeConcierge({ business, draft, onDraft, inputRef }: {
  business: InitialBusiness; draft: string; onDraft: (draft: string) => void; inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const [status, setStatus] = useState('');
  const copyId = useRef(0);
  async function copyEnquiry() {
    const id = ++copyId.current;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(draft);
      if (copyId.current === id) setStatus('Enquiry copied. Nothing has been sent.');
    } catch {
      inputRef.current?.focus(); inputRef.current?.select();
      setStatus('Copy is unavailable here. Select and copy the enquiry text above. Nothing has been sent.');
    }
  }
  return <section className={styles.concierge} id="wild-tree-jourvis" aria-labelledby="wild-tree-jourvis-title">
    <div className={styles.conciergeHeading}><span className={styles.companion}><JourvisCompanion size={34} molecules={false} /></span><div><h3 id="wild-tree-jourvis-title">Jourvis</h3><span>Your dining assistant</span></div><span className={styles.previewTag}>{config.runtimeEnabled ? 'Demo' : 'Preview'}</span></div>
    <p className={styles.conciergeIntro}>A little help with the details.</p>
    <p className={styles.panelNote}>{config.runtimeEnabled ? 'Ask about your demo meal or prepare a table enquiry.' : config.runtimeNotice}</p>
    <div className={styles.quickPrompts}>{config.chat.quickPrompts.map(prompt => <button type="button" key={prompt} onClick={() => { onDraft(prompt); setStatus(''); inputRef.current?.focus(); }}>{prompt}</button>)}</div>
    <label className={styles.enquiryLabel} htmlFor="wild-tree-enquiry">Your enquiry</label>
    <textarea id="wild-tree-enquiry" ref={inputRef} rows={5} maxLength={4000} value={draft} onChange={event => { onDraft(event.target.value); setStatus(''); }} placeholder="Ask about the menu or your visit…" />
    <div className={styles.conciergeActions}><button type="button" className={styles.primary} disabled={!draft.trim()} onClick={() => void copyEnquiry()}><Copy size={15} aria-hidden />Copy enquiry</button>{config.runtimeEnabled ? <button type="button" className={styles.secondary} onClick={() => window.dispatchEvent(new CustomEvent(config.chat.openEvent, { detail: { prompt: draft } }))}><MessageCircle size={15} aria-hidden />Open chat <ArrowUpRight size={15} aria-hidden /></button> : null}</div>
    <p className={styles.copyStatus} role="status">{status || 'No order, reservation or message is submitted.'}</p>
    {config.runtimeEnabled ? <RestaurantJourvisChat key={business.publicPath} business={business} presentation={config.chat} /> : null}
  </section>;
}
