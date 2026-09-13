'use client';
/* oxlint-disable nextjs/no-html-link-for-pages */
// Vercel serves static documents; ordinary links preserve policy navigation.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Copy, FileImage, MessageSquare, RotateCcw, Send, Sparkles } from 'lucide-react';
import { type CompanionEvent, siteConfig } from '@/lib/jourvis/config';
import { connectDemo, demoRequest, loadDemo, type DemoReply, type Outgoing } from '@/lib/jourvis/live-demo';
import CompanionMark from './CompanionMark';

type Message = { id: string; role: 'jourvis' | 'customer'; text: string };
export default function InteractiveDemo({ send }: { send: (event: CompanionEvent) => void }) {
 const [messages, setMessages] = useState<Message[]>([]);
 const [reply, setReply] = useState<DemoReply | null>(null);
 const [text, setText] = useState('');
 const [busy, setBusy] = useState(false);
 const [started, setStarted] = useState(false);
 const [error, setError] = useState('');
 const [retry, setRetry] = useState<Outgoing | null>(null);
 const [copied, setCopied] = useState(false);
 const [showNotebook, setShowNotebook] = useState(true);
 const [pictureSupplied, setPictureSupplied] = useState(false);
 const [showRestart, setShowRestart] = useState(false);
 const [choicesExpired, setChoicesExpired] = useState(false);
 const log = useRef<HTMLDivElement>(null);
 const input = useRef<HTMLTextAreaElement>(null);
 const lock = useRef(false);
 const bottom = useRef(true);
 const accept = useCallback(async (result: DemoReply) => {
  if (result.reply) {
   setMessages(current => current.some(m => m.id === result.receiptId) ? current : [...current, { id: result.receiptId!, role: 'jourvis' as const, text: result.reply! }].slice(-60));
   setReply(result); setCopied(false);
   setChoicesExpired((result.choicesExpireAt || 0) <= Date.now());
   window.dispatchEvent(new CustomEvent('jourvis-notebook', { detail: { count: result.notebook?.entries.length || 0, business: result.notebook?.business || null } }));
   send(result.notebook?.phase === 'booked' ? 'COMPLETE' : 'LISTEN');
  }
  if (result.requiresAcknowledgement) await demoRequest('ack', { receiptId: result.receiptId, messageId: result.messageId });
 }, [send]);
 const transmit = useCallback(async (request: Outgoing, repeating = false) => {
  if (lock.current) return;
  lock.current = true; setBusy(true); setError(''); setRetry(null); send('ORGANIZE');
  if (!repeating) {
   setMessages(current => [...current, { id: request.messageId, role: 'customer', text: request.text }]);
   setText(''); setPictureSupplied(false); bottom.current = true;
  }
  try { await accept(await demoRequest('turn', request)); }
  catch (err) { setError(err instanceof Error ? err.message : 'The connection paused. Please try again.'); setRetry(request); send('LISTEN'); }
  finally { setBusy(false); lock.current = false; }
 }, [accept, send]);
 const start = async () => {
  if (lock.current) return;
  lock.current = true; setBusy(true); setError(''); send('LISTEN');
  try {
   await connectDemo(); const state = await loadDemo(); setStarted(true);
   if (state.reply) await accept(state);
   else await accept(await demoRequest('turn', { messageId: crypto.randomUUID(), text: 'Hi' }));
  } catch (err) { setError(err instanceof Error ? err.message : 'Jourvis is temporarily unavailable. Please try again.'); }
  finally { setBusy(false); lock.current = false; }
 };
 useEffect(() => { if (log.current && bottom.current) log.current.scrollTo({ top: log.current.scrollHeight, behavior: 'instant' }); }, [messages, busy]);
 useEffect(() => {
  const remaining = (reply?.choicesExpireAt || 0) - Date.now();
  const timer = setTimeout(() => setChoicesExpired(true), Math.max(0, remaining)); return () => clearTimeout(timer);
 }, [reply]);
 useEffect(() => {
  const suggest = (event: Event) => { const suggestion = (event as CustomEvent<string>).detail; if (typeof suggestion === 'string') { setText(suggestion.slice(0, 500)); input.current?.focus({ preventScroll: true }); } };
  window.addEventListener('jourvis-suggestion', suggest); return () => window.removeEventListener('jourvis-suggestion', suggest);
 }, []);
 const submit = (value = text, choiceId?: string) => {
  if (!value.trim() || busy || retry || error) return;
  void transmit({ messageId: crypto.randomUUID(), text: value.trim(), ...(choiceId ? { choiceId } : {}), ...(pictureSupplied ? { pictureSupplied: true } : {}) });
 };
 const notes = reply?.notebook; const entries = notes?.entries || [];
 const copyNotes = async () => {
  try { await navigator.clipboard.writeText(['Jourvis demo · Details gathered', notes?.business || 'Exploring businesses', ...entries.map(e => `${e.label}: ${e.value}`), 'A conversation summary. Check the latest reply for appointment confirmation.'].join('\n')); setCopied(true); }
  catch { setCopied(false); }
 };
 return (
  <section className="demo-section section-wrap live-demo" id="demo" aria-labelledby="demo-title" tabIndex={-1} data-world-section="demo">
   <div className="section-topline"><p className="eyebrow">01 / Let me take that</p><span className="section-side-note">Your words. A little less work.</span></div>
   <h2 id="demo-title">One conversation.<br /><span className="muted-heading">Everything falls into place.</span></h2>
   <p className="section-intro">Step into your customer’s shoes. Pick a business, ask a real question, and watch me keep the useful details together.</p>
   <div className="demo-shell live-shell" data-live-status={busy ? 'working' : started ? 'connected' : 'ready'}>
    <div className="demo-toolbar"><span className="preview-label"><span className="status-square" />{started ? 'Jourvis · Live demo' : 'The real Jourvis · 20 businesses to explore'}</span>
     {started && <button className="quiet-button" disabled={busy || !!retry} onClick={() => setShowRestart(true)}><RotateCcw size={14} aria-hidden /> Change business</button>}
    </div>
   {showRestart && <section className="restart-note" aria-label="Change business confirmation"><p>Go back to the business selection? Any confirmed appointment stays in place.</p><button className="quiet-button" onClick={() => setShowRestart(false)}>Stay here</button><button className="button primary" onClick={() => { setShowRestart(false); submit('restart'); }}>Choose another business</button></section>}
    <div className="live-stage">
     <div className="conversation live-conversation">
      <div className="conversation-heading"><span className="little-presence" aria-hidden><CompanionMark /></span><span>Jourvis<span className="assistant-label">{notes?.business || 'Let’s make this easy.'}</span></span><span className="local-badge">Sample businesses</span></div>
      {!started ? <div className="live-welcome">
       <div className="welcome-constellation" aria-hidden><span>“How much?”</span><CompanionMark /><span>“Can I book?”</span><span>“I have an idea…”</span></div>
       <h3>Bring me a little<br />of your everyday.</h3>
       <p>A price question. A dragon tattoo idea. A few kilos of liempo. You can talk normally—I’ll help with the next step.</p>
       <button className="button primary" disabled={busy} onClick={() => void start()} data-assist>{busy ? 'Connecting…' : 'Start a conversation'}<ArrowRight size={18} aria-hidden /></button>
       <p className="live-consent">This is a simulation of a business Page. Play the customer. A confirmed test booking can send a real Calendar invitation to the email you provide.</p>
      </div> : <>
       <div ref={log} className="conversation-messages live-messages" role="log" aria-label="Your conversation with Jourvis" aria-live="polite" aria-relevant="additions" onScroll={() => { const el = log.current; if (el) bottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
        {messages.map(message => <div key={message.id} className={'live-message ' + message.role}><span className="sr-only">{message.role === 'jourvis' ? 'Jourvis' : 'You'}: </span><p>{message.text}</p></div>)}
        {busy && <output className="organizing-label"><span className="working-bits" aria-hidden>▪ ▪ ▪</span> Jourvis is helping…</output>}
       </div>
       {!!reply?.choices?.length && !retry && <div className="live-choices" aria-label="Suggested replies">{choicesExpired ? <button disabled={busy} onClick={() => submit('help')}>Pick up where we left off</button> : reply.choices.map(choice => <button key={choice.id} disabled={busy} onClick={() => submit(choice.title, choice.id)}>{choice.title}</button>)}</div>}
       <form className="live-composer" onSubmit={event => { event.preventDefault(); submit(); }}>
        <label className="sr-only" htmlFor="jourvis-message">Your message to Jourvis</label>
        <textarea ref={input} id="jourvis-message" value={text} maxLength={4000} rows={2} placeholder="Ask me something… English or Taglish is fine." onChange={event => setText(event.target.value)} onFocus={() => send('LISTEN')} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} />
        <div className="composer-actions"><label className="picture-toggle" title="Only the fact that a picture was supplied is sent. No image is uploaded."><input type="checkbox" checked={pictureSupplied} onChange={event => { setPictureSupplied(event.target.checked); if (event.target.checked && !text) setText('I supplied a reference picture.'); }} disabled={busy} /><FileImage size={15} aria-hidden /><span>Simulate a picture</span></label><button className="send-message" disabled={busy || !text.trim() || !!retry || !!error} aria-label="Send message"><Send size={17} aria-hidden /></button></div>
       </form>
      </>}
      {error && <div className="live-error" role="alert"><p>{error}</p><div>{retry ? <button className="quiet-button" disabled={busy} onClick={() => void transmit(retry, true)}>Retry this message <RotateCcw size={13} aria-hidden /></button> : <button className="quiet-button" disabled={busy} onClick={() => void start()}>Try connecting again</button>}<a href={siteConfig.messengerUrl} target="_blank" rel="noopener noreferrer">Try Messenger <ArrowUpRight size={13} aria-hidden /></a></div></div>}
     </div>
     <aside className="live-notebook" aria-label="Details Jourvis has gathered" data-particle-result>
      <div className="notebook-heading"><span className="notebook-presence" aria-hidden><CompanionMark /></span><div><span className="mono">A LITTLE LESS TO HOLD</span><h3>I’ll keep the thread.</h3></div><button className="quiet-button notebook-toggle" aria-expanded={showNotebook} aria-label="Toggle gathered details" onClick={() => setShowNotebook(!showNotebook)}><ChevronDown size={17} aria-hidden /></button></div>
      {showNotebook && <div className="notebook-body">
       <p className="notebook-caption">{busy ? 'Listening for what matters…' : notes?.business ? `You’re exploring ${notes.business}.` : 'As we talk, the useful details find a home here.'}</p>
       <ol className="thread-progress" aria-label="Conversation progress"><li data-done={!!notes?.business}><span>{notes?.business ? <Check size={12} aria-hidden /> : '1'}</span>Understand</li><li data-done={entries.length > 0}><span>{entries.length ? <Check size={12} aria-hidden /> : '2'}</span>Gather</li><li data-done={notes?.phase === 'booked'}><span>3</span>Next step</li></ol>
       <div className="notebook-paper" aria-live="polite" aria-atomic="true">
        <span className="notebook-label">{notes?.phase === 'review' ? 'Ready for your review' : 'Details gathered'}</span>
        {entries.length ? <dl>{entries.map((entry, i) => <div key={entry.label + i}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl> : <div className="notebook-empty"><span className="sorted-lines" aria-hidden><span /><span /><span /></span><p>No need to have it<br />all figured out.</p><small>We’ll take it one detail at a time.</small></div>}
        {entries.length > 0 && <p className="notebook-footnote">{notes?.phase === 'booked' ? 'Your test appointment is confirmed.' : 'These are conversation notes. An appointment needs an explicit confirmation.'}</p>}
       </div>
       {entries.length > 0 ? <button className="quiet-button copy-notes" onClick={() => void copyNotes()}><Copy size={14} aria-hidden />{copied ? 'Copied to your clipboard' : 'Copy my summary'}</button> : <div className="notebook-possibility"><Sparkles size={16} aria-hidden /><p>Imagine closing your laptop knowing the next conversation already has somewhere to land.</p></div>}
       <div className="demo-prompts"><span>Need a place to start?</span>{['What are your prices?', 'I’d like to make a booking.', 'Can you help me choose?'].map(prompt => <button key={prompt} disabled={!started || busy || !!retry} onClick={() => { setText(prompt); input.current?.focus({ preventScroll: true }); }}><MessageSquare size={13} aria-hidden />{prompt}</button>)}</div>
      </div>}
     </aside>
    </div>
    <div className="demo-disclosure live-disclosure"><span>Same Jourvis engine as Messenger. Sample business details.</span><a href="/privacy">How your information is handled <ArrowUpRight size={12} aria-hidden /></a></div>
   </div>
  </section>
 );
}
