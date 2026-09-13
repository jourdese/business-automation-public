export type Outgoing = { messageId: string; text: string; choiceId?: string; pictureSupplied?: boolean };
export type DemoReply = { ok: boolean; receiptId: string | null; messageId: string | null; reply: string | null; requiresAcknowledgement?: boolean; choices: { id: string; title: string }[]; choicesExpireAt?: number; notebook?: { business: string | null; timezone: string; entries: { label: string; value: string }[]; phase: string } };
type Session = { token: string; expiresAt: number };
const KEY = 'jourvis.web.session.v1';
let active: Session | null = null;
let endpoint = '';
async function origin(signal: AbortSignal) {
 if (!endpoint) {
  const response = await fetch('/jourvis-demo.json', { cache: 'no-store', signal });
  if (!response.ok) throw new Error('The demo connection is being updated. Please try again shortly.');
  const config = await response.json() as { origin?: string };
  if (typeof config.origin !== 'string') throw new Error('The demo connection is not ready yet.');
  const url = new URL(config.origin);
  if (url.protocol !== 'https:' || (!url.hostname.endsWith('.trycloudflare.com') && url.hostname !== 'api.jourvis.ai')) throw new Error('The demo connection is not ready yet.');
  endpoint = url.origin;
 }
 return endpoint;
}
function restore() {
 if (active) return active;
 try { const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (saved?.token && saved.expiresAt > Date.now()) active = saved; } catch { /* Storage is optional; memory still works. */ }
 return active;
}
export function forgetDemo() { active = null; try { sessionStorage.removeItem(KEY); } catch {} }
async function call(path: string, method: 'GET' | 'POST', body?: unknown) {
 const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 40000);
 try {
  const response = await fetch(await origin(controller.signal) + '/web/demo/' + path, { method, signal: controller.signal, headers: { ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}), ...(restore() ? { Authorization: 'Bearer ' + active!.token } : {}) }, ...(method === 'POST' ? { body: JSON.stringify(body || {}) } : {}) });
  if (response.status === 401) { forgetDemo(); throw new Error('This demo session has ended. Reload the page to start a new conversation.'); }
  if (response.status === 429) throw new Error('Let’s pause for a moment. Please try again in a few minutes.');
  if (response.status === 409) throw new Error('That message is still being handled. Retry it in a moment; it won’t create a second request.');
  if (!response.ok) throw new Error('The connection paused. Retry your message to check its result before making another request.');
  const result = await response.json() as DemoReply & Session;
  if (result.ok !== true) throw new Error('The reply has not been fully verified. Please retry this message.');
  return result;
 } catch (error) {
  if (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')) { endpoint = ''; throw new Error('Jourvis is temporarily unreachable. Please retry, or continue on Messenger.'); }
  throw error;
 } finally { clearTimeout(timer); }
}
export async function connectDemo() { if (!restore()) { active = await call('session', 'POST'); try { sessionStorage.setItem(KEY, JSON.stringify(active)); } catch {} } }
export async function loadDemo(): Promise<DemoReply> { return call('state', 'GET'); }
export async function demoRequest(operation: 'turn' | 'ack', body: unknown): Promise<DemoReply> { return call(operation, 'POST', body); }
