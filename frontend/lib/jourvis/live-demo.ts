export type Outgoing = { messageId: string; text: string; choiceId?: string; pictureSupplied?: boolean };
export type DemoReply = { ok: boolean; receiptId: string | null; messageId: string | null; reply: string | null; requiresAcknowledgement?: boolean; choices: { id: string; title: string }[]; choicesExpireAt?: number; notebook?: { business: string | null; timezone: string; entries: { label: string; value: string }[]; phase: string } };
export type DemoSession = { token: string; expiresAt: number };
const KEY = 'jourvis.web.session.v1';
let active: DemoSession | null = null;
let activeScope = 'home';
let endpoint = '';

function scopeKey(scope = 'home') {
 const normalized = scope.trim() || 'home';
 return normalized === 'home' ? KEY : `${KEY}:${normalized}`;
}
function selectScope(scope = 'home') {
 const normalized = scope.trim() || 'home';
 if (normalized !== activeScope) { activeScope = normalized; active = null; }
 return normalized;
}
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
function restore(scope = 'home') {
 const normalized = selectScope(scope);
 if (active && active.expiresAt > Date.now()) return active;
 active = null;
 try {
  const saved = JSON.parse(sessionStorage.getItem(scopeKey(normalized)) || 'null');
  if (saved?.token && saved.expiresAt > Date.now()) active = saved;
  else sessionStorage.removeItem(scopeKey(normalized));
 } catch { /* Storage is optional; memory still works. */ }
 return active;
}
export function forgetDemo(scope = 'home') {
 const normalized = selectScope(scope);
 active = null;
 try { sessionStorage.removeItem(scopeKey(normalized)); } catch {}
}
async function call(path: string, method: 'GET' | 'POST', body?: unknown, scope = 'home') {
 const normalized = selectScope(scope);
 const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 40000);
 try {
  const response = await fetch(await origin(controller.signal) + '/web/demo/' + path, { method, signal: controller.signal, headers: { ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}), ...(restore(normalized) ? { Authorization: 'Bearer ' + active!.token } : {}) }, ...(method === 'POST' ? { body: JSON.stringify(body || {}) } : {}) });
  if (response.status === 401) { forgetDemo(normalized); throw new Error('This demo session has ended. Reload the page to start a new conversation.'); }
  if (response.status === 429) throw new Error('Please try again in a few minutes.');
  if (response.status === 409) throw new Error('That message is still being handled. Retry it in a moment; it won’t create a second request.');
  if (!response.ok) throw new Error('The connection paused. Retry your message to check its result before making another request.');
  const result = await response.json() as DemoReply & DemoSession;
  if (result.ok !== true) throw new Error('The reply has not been fully verified. Please retry this message.');
  return result;
 } catch (error) {
  if (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')) { endpoint = ''; throw new Error('Jourvis is temporarily unreachable. Please retry, or continue on Messenger.'); }
  throw error;
 } finally { clearTimeout(timer); }
}
export async function connectDemo(scope = 'home'): Promise<DemoSession> {
 const normalized = selectScope(scope);
 if (!restore(normalized)) {
  active = await call('session', 'POST', undefined, normalized);
  try { sessionStorage.setItem(scopeKey(normalized), JSON.stringify(active)); } catch {}
 }
 return active!;
}
export async function loadDemo(scope = 'home'): Promise<DemoReply> { return call('state', 'GET', undefined, scope); }
export async function demoRequest(operation: 'turn' | 'ack', body: unknown, scope = 'home'): Promise<DemoReply> { return call(operation, 'POST', body, scope); }
