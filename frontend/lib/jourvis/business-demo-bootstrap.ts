import type { DemoReply, Outgoing } from './live-demo';

export type DemoBusiness = { displayName: string; adapterKey: string; presetKey: string | null };
export type BootstrapTransport = {
  connect: () => Promise<unknown>;
  load: () => Promise<DemoReply>;
  turn: (message: Outgoing) => Promise<DemoReply>;
  ack: (receipt: { receiptId: string; messageId: string }) => Promise<unknown>;
  newId?: () => string;
};

const normalized = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

/** Confirm the server's notebook, never a greeting or the requested adapter alone. */
export function isExpectedBusiness(reply: DemoReply, business: DemoBusiness) {
  const actual = reply.notebook?.business;
  return typeof actual === 'string' && !!business.displayName.trim()
    && normalized(actual) === normalized(business.displayName);
}

/**
 * The shared runtime starts at Welcome, not at the business catalog.
 * Hidden navigation must follow Welcome -> Check Demo -> configured preset.
 * Retain an uncertain navigation turn until its exact receipt is acknowledged.
 */
export function createBusinessDemoBootstrap(business: DemoBusiness, transport: BootstrapTransport) {
  let pending: Outgoing | null = null;
  let inFlight: Promise<DemoReply> | null = null;

  async function acknowledge(reply: DemoReply): Promise<DemoReply> {
    if (reply.ok !== true) throw new Error('The demo response could not be verified. Please retry.');
    if (reply.requiresAcknowledgement) {
      if (!reply.receiptId || !reply.messageId) throw new Error('The demo receipt could not be verified. Please retry.');
      await transport.ack({ receiptId: reply.receiptId, messageId: reply.messageId });
    }
    return { ...reply, requiresAcknowledgement: false };
  }

  async function submitPending(): Promise<DemoReply> {
    if (!pending) throw new Error('No demo navigation is pending.');
    const result = await transport.turn(pending);
    if (result.messageId !== pending.messageId) throw new Error('The demo returned a different receipt. Please retry.');
    const settled = await acknowledge(result);
    pending = null;
    return settled;
  }

  function send(text: string) {
    pending = { messageId: (transport.newId || (() => crypto.randomUUID()))(), text };
    return submitPending();
  }

  async function run(): Promise<DemoReply> {
    const preset = business.presetKey?.trim() || business.adapterKey.trim();
    if (!preset || !business.displayName.trim()) throw new Error('This business demo is not configured yet.');
    await transport.connect();
    let state = pending ? await submitPending() : await acknowledge(await transport.load());
    if (!state.reply) state = await send('Hi');
    if (isExpectedBusiness(state, business)) return state;

    // Route-scoped storage isolates this navigation from the homepage demo.
    if (state.notebook?.business) await send('restart');
    // This explicit command opens the entire catalog, including later pages.
    // Typed navigation avoids stale/expired opaque choice IDs after a refresh.
    await send('Check Demo');
    state = await send(preset);
    if (!isExpectedBusiness(state, business)) {
      // Allow the read projection to catch up after the selection receipt settles.
      state = await acknowledge(await transport.load());
    }
    if (!isExpectedBusiness(state, business)) {
      throw new Error(`${business.displayName} preset could not be confirmed. Please retry the connection.`);
    }
    return state;
  }

  return {
    connect(): Promise<DemoReply> {
      if (!inFlight) inFlight = run().finally(() => { inFlight = null; });
      return inFlight;
    },
  };
}
