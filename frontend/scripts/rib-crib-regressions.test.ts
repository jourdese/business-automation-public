import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createBusinessDemoBootstrap, isExpectedBusiness } from '../lib/jourvis/business-demo-bootstrap.ts';
import { chatViewportFrame, bindChatViewport } from '../lib/jourvis/chat-viewport.ts';
import type { DemoReply, Outgoing } from '../lib/jourvis/live-demo.ts';

const business = { displayName: 'The Rib Crib', adapterKey: 'restaurant', presetKey: 'demo_restaurant.v1' };
const empty = (): DemoReply => ({ ok: true, messageId: null, receiptId: null, reply: null, choices: [], notebook: { business: null, timezone: 'Asia/Manila', phase: 'exploring', entries: [] } });

// Model the documented runtime gate: preset text is ignored until Check Demo.
function runtime(options: { selected?: string; rejectPreset?: boolean; lag?: boolean; failTurn?: string; failAck?: string } = {}) {
  let stage = options.selected ? 'demo' : 'home';
  let selected = options.selected || null;
  let state = empty();
  if (selected) state = { ...state, reply: 'Existing reply', notebook: { ...state.notebook!, business: selected } };
  let n = 0;
  let awaiting: string | null = null;
  let failed = false;
  const turns: Outgoing[] = [];
  const events: string[] = [];
  const receipts = new Map<string, DemoReply>();
  const transport = {
    connect: async () => {},
    newId: () => `test-${++n}`,
    load: async () => structuredClone(state),
    turn: async (message: Outgoing) => {
      turns.push({ ...message });
      events.push(`turn:${message.text}:${message.messageId}`);
      if (receipts.has(message.messageId)) return structuredClone(receipts.get(message.messageId)!);
      assert.equal(awaiting, null, 'Previous reply must be acknowledged before a new turn');
      if (message.text === 'restart') { stage = 'home'; selected = null; }
      else if (message.text === 'Check Demo' && stage !== 'demo') stage = 'catalog';
      else if (message.text === business.presetKey && stage === 'catalog') {
        stage = 'demo'; selected = options.rejectPreset ? 'Another Restaurant' : business.displayName;
      }
      state = { ...empty(), messageId: message.messageId, receiptId: `receipt-${message.messageId}`, reply: stage === 'demo' ? `Welcome to ${selected}` : stage === 'catalog' ? 'Choose a business' : 'Inquire Subscription / Check Demo', requiresAcknowledgement: true, notebook: { ...empty().notebook!, business: selected } };
      const response = structuredClone(state);
      if (options.lag && message.text === business.presetKey) response.notebook!.business = null;
      receipts.set(message.messageId, response);
      awaiting = message.messageId;
      if (options.failTurn === message.text && !failed) { failed = true; throw new Error('Network paused after preparing reply'); }
      return response;
    },
    ack: async ({ messageId, receiptId }: { messageId: string; receiptId: string }) => {
      assert.equal(receiptId, `receipt-${messageId}`);
      events.push(`ack:${messageId}`);
      const text = turns.find((turn) => turn.messageId === messageId)?.text;
      if (options.failAck === text && !failed) { failed = true; throw new Error('Acknowledgement interrupted'); }
      awaiting = null;
      if (state.messageId === messageId) state.requiresAcknowledgement = false;
      const saved = receipts.get(messageId);
      if (saved) saved.requiresAcknowledgement = false;
    },
  };
  return { transport, turns, receipts, events };
}

test('fresh connection enters Check Demo before selecting the database preset', async () => {
  const api = runtime();
  const result = await createBusinessDemoBootstrap(business, api.transport).connect();
  assert.deepEqual(api.turns.map((turn) => turn.text), ['Hi', 'Check Demo', business.presetKey]);
  assert.equal(result.notebook?.business, business.displayName);
  assert.equal(result.requiresAcknowledgement, false);
  assert.equal(api.events.filter((event) => event.startsWith('ack:')).length, 3);
});

test('restored correct restaurant is retained without restarting', async () => {
  const api = runtime({ selected: business.displayName });
  await createBusinessDemoBootstrap(business, api.transport).connect();
  assert.equal(api.turns.length, 0);
});

test('another selected business returns through welcome and catalog', async () => {
  const api = runtime({ selected: 'Dentist Apple' });
  await createBusinessDemoBootstrap(business, api.transport).connect();
  assert.deepEqual(api.turns.map((turn) => turn.text), ['restart', 'Check Demo', business.presetKey]);
});

test('does not mark the chat ready for an unrelated restaurant', async () => {
  const api = runtime({ rejectPreset: true });
  await assert.rejects(createBusinessDemoBootstrap(business, api.transport).connect(), /preset could not be confirmed/);
});

test('rechecks notebook after selection acknowledgement when projection lags', async () => {
  const api = runtime({ lag: true });
  const result = await createBusinessDemoBootstrap(business, api.transport).connect();
  assert.equal(result.notebook?.business, business.displayName);
  assert.equal(api.turns.length, 3);
});

for (const failure of ['failTurn', 'failAck'] as const) {
  test(`${failure}: connection retry reuses the exact uncertain selection message`, async () => {
    const api = runtime({ [failure]: business.presetKey });
    const bootstrap = createBusinessDemoBootstrap(business, api.transport);
    await assert.rejects(bootstrap.connect());
    const result = await bootstrap.connect();
    const selections = api.turns.filter((turn) => turn.text === business.presetKey);
    assert.equal(selections.length, 2);
    assert.equal(selections[0].messageId, selections[1].messageId);
    assert.equal(api.receipts.size, 3, 'Retry must not prepare another navigation receipt');
    assert.equal(result.notebook?.business, business.displayName);
  });
}

test('concurrent open events share a single initialization', async () => {
  const api = runtime();
  const bootstrap = createBusinessDemoBootstrap(business, api.transport);
  const one = bootstrap.connect();
  const two = bootstrap.connect();
  assert.equal(one, two);
  await Promise.all([one, two]);
  assert.equal(api.turns.length, 3);
});

test('a greeting mentioning Rib Crib is not proof of the selected business', () => {
  assert.equal(isExpectedBusiness({ ...empty(), reply: 'The Rib Crib' }, business), false);
  assert.equal(isExpectedBusiness({ ...empty(), notebook: { ...empty().notebook!, business: '  THE  RIB CRIB  ' } }, business), true);
  assert.equal(isExpectedBusiness({ ...empty(), notebook: { ...empty().notebook!, business: 'Not The Rib Crib' } }, business), false);
});

test('invalid config fails before connecting', async () => {
  let connected = false;
  const api = runtime();
  await assert.rejects(createBusinessDemoBootstrap({ ...business, adapterKey: '', presetKey: null }, { ...api.transport, connect: async () => { connected = true; } }).connect(), /not configured/);
  assert.equal(connected, false);
});

test('mismatched receipt cannot enable the chat', async () => {
  const api = runtime();
  await assert.rejects(createBusinessDemoBootstrap(business, { ...api.transport, turn: async () => ({ ...empty(), messageId: 'unrelated' }) }).connect(), /different receipt/);
});

test('visual viewport centers are correct for phone, keyboard, landscape and desktop', () => {
  for (const sample of [{ width: 393, height: 792 }, { width: 390, height: 360, offsetTop: 120 }, { width: 844, height: 390 }, { width: 1440, height: 900 }, { width: 320, height: 568, offsetLeft: 8 }]) {
    const value = chatViewportFrame(sample)!;
    assert.equal(value.centerX, (sample.offsetLeft || 0) + sample.width / 2);
    assert.equal(value.centerY, (sample.offsetTop || 0) + sample.height / 2);
    assert.equal(value.compact, sample.height < 540);
  }
  assert.equal(chatViewportFrame({ width: 0, height: 800 }), null);
  assert.equal(chatViewportFrame({ width: 400, height: Number.NaN }), null);
});

test('viewport binding cleans up listeners and pending animation frames on close', () => {
  const properties = new Map<string, string>();
  const events = new Map<string, () => void>();
  const viewportEvents = new Map<string, () => void>();
  let canceled = false;
  const element = { style: { setProperty: (key: string, value: string) => properties.set(key, value) }, dataset: {} };
  const host = {
    innerWidth: 393, innerHeight: 792,
    visualViewport: { width: 393, height: 360, offsetLeft: 0, offsetTop: 120, addEventListener: (key: string, fn: () => void) => viewportEvents.set(key, fn), removeEventListener: (key: string) => viewportEvents.delete(key) },
    requestAnimationFrame: () => 42, cancelAnimationFrame: (id: number) => { canceled = id === 42; },
    addEventListener: (key: string, fn: () => void) => events.set(key, fn), removeEventListener: (key: string) => events.delete(key),
  };
  const cleanup = bindChatViewport(element as unknown as HTMLElement, host as unknown as Window);
  assert.equal(properties.get('--rib-chat-center-y'), '300px');
  viewportEvents.get('resize')!();
  cleanup();
  assert.equal(canceled, true);
  assert.equal(viewportEvents.size, 0);
  assert.equal(events.size, 0);
});

test('restaurant metadata retains the published PNG thumbnail without replacing homepage metadata', () => {
  const source = readFileSync(new URL('../app/[vertical]/[business]/page.tsx', import.meta.url), 'utf8');
  const image = readFileSync(new URL('../public/rib-crib/rib-crib-thumbnail.png', import.meta.url));
  assert.match(source, /route\.public_path === '\/restaurant\/the-rib-crib'/);
  assert.match(source, /images: \[\{ url: thumbnail, width: 1200, height: 630/);
  assert.match(source, /card: 'summary_large_image'/);
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});
