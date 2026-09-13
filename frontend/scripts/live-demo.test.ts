import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDemo, demoRequest, forgetDemo, loadDemo } from '../lib/jourvis/live-demo.ts';

await test('website transport preserves retry identity, acknowledges the exact reply and clears expired sessions', async () => {
 const saved = new Map<string, string>();
 Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: (k: string) => saved.get(k), setItem: (k: string, v: string) => saved.set(k, v), removeItem: (k: string) => saved.delete(k) } });
 const original = globalThis.fetch; const calls: { url: string; options?: RequestInit }[] = [];
 let mode = 'normal';
 globalThis.fetch = (async (input: string | URL | Request, options?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url; calls.push({ url, options });
  if (url === '/jourvis-demo.json') return new Response(JSON.stringify({ origin: 'https://api.jourvis.ai' }));
  if (url.endsWith('/session')) return new Response(JSON.stringify({ ok: true, token: 'private-test-token', expiresAt: Date.now() + 60000 }));
  if (mode === 'network') { mode = 'normal'; throw new TypeError('network'); }
  if (mode === 'pending') return new Response('{}', { status: 409 });
  if (mode === 'expired') return new Response('{}', { status: 401 });
  return new Response(JSON.stringify({ ok: true, receiptId: 'receipt-1', messageId: 'same-message', reply: 'Here are the prices.', choices: [] }));
 }) as typeof fetch;
 try {
  await connectDemo(); await connectDemo();
  assert.equal(calls.filter(c => c.url.endsWith('/session')).length, 1);
  const body = { messageId: 'same-message', text: 'Prices' };
  mode = 'network'; await assert.rejects(demoRequest('turn', body), /temporarily unreachable/);
  await demoRequest('turn', body);
  const turns = calls.filter(c => c.url.endsWith('/turn'));
  assert.equal(turns[0].options?.body, turns[1].options?.body);
  assert.equal((turns[1].options!.headers as Record<string,string>).Authorization, 'Bearer private-test-token');
  assert.equal(calls.filter(c => c.url === '/jourvis-demo.json').length, 2, 'refresh endpoint after network failure');
  await demoRequest('ack', { receiptId: 'receipt-1', messageId: 'same-message' });
  assert.deepEqual(JSON.parse(calls.at(-1)!.options!.body as string), { receiptId: 'receipt-1', messageId: 'same-message' });
  assert.equal([...saved.values()].some(s => s.includes('Prices')), false, 'no transcript in browser storage');
  mode = 'pending'; await assert.rejects(loadDemo(), /still being handled/);
  mode = 'expired'; await assert.rejects(loadDemo(), /session has ended/);
  assert.equal(saved.size, 0);
 } finally { globalThis.fetch = original; forgetDemo(); }
});
