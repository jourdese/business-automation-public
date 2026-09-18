import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAdvancePurchase,
  evaluatePurchaseAuthority,
  normalizeInventoryAuthorityConfiguration,
  projectedInventoryAtDelivery,
  purchaseProgressStage,
  projectedInventoryPercentAtDelivery,
  suggestedPurchaseQuantity,
  type CommandCenterInventoryItem,
  type CommandCenterPurchase,
  type CommandCenterRuntimeState,
} from '../command-center/core/runtime.ts';
import { deriveJourvisTasks } from '../command-center/core/task-engine.ts';

function item(
  patch: Partial<CommandCenterInventoryItem> = {},
): CommandCenterInventoryItem {
  return {
    id: 'shrimp',
    name: 'Shrimp',
    unit: 'kg',
    current: 2.2,
    fullLevel: 10,
    reorderAt: 3,
    incoming: 0,
    supplierId: 'supplier',
    contactId: 'contact',
    packSize: 5,
    packPrice: 2800,
    purchaseUnit: '5 kg pack',
    leadDays: 1,
    dailyUse: 1.95,
    zone: 'Seafood freezer',
    purchasingMode: 'quote',
    automationEnabled: true,
    automationMode: 'autobuy',
    automationTriggerPercent: 30,
    targetPackPrice: 2800,
    autoAcceptPackPrice: 2950,
    hardMaxPackPrice: 3100,
    maxAutoOrderQty: 15,
    maxAutoOrderSpend: 10000,
    autoNegotiate: true,
    maxCounteroffers: 2,
    maxDeliveryFee: 300,
    maxLeadDays: 2,
    ...patch,
  };
}

function purchase(
  patch: Partial<CommandCenterPurchase> = {},
): CommandCenterPurchase {
  return {
    id: 'JV-0001',
    itemId: 'shrimp',
    supplierId: 'supplier',
    quantity: 10,
    status: 'quote_received',
    estimatedTotal: 5600,
    quotedPackPrice: 2900,
    quotedTotal: 5950,
    deliveryFee: 150,
    etaDays: 1,
    counteroffersUsed: 0,
    createdAt: '2026-09-19T00:00:00.000Z',
    origin: 'jourvis',
    automationMode: 'autobuy',
    explanation: 'test',
    ...patch,
  };
}

function state(
  inventoryItem: CommandCenterInventoryItem,
  purchases: CommandCenterPurchase[] = [],
  automationMasterOn = true,
): CommandCenterRuntimeState {
  return {
    version: 1,
    business: {
      id: 'test-business',
      name: 'Test Business',
      shortName: 'Test',
      industry: 'restaurant',
      currency: 'PHP',
      timezone: 'Asia/Manila',
      operations: ['inventory', 'purchasing'],
      capabilities: [],
      demoMetrics: [],
    },
    automationMasterOn,
    inventory: [inventoryItem],
    purchases,
    suppliers: [],
    recipes: [],
    menuItems: [],
    pausedItemIds: [],
    activity: [],
  };
}

await test('inventory projection keeps incoming separate and subtracts lead-time usage', () => {
  const shrimp = item({ current: 2.2, incoming: 5, dailyUse: 1.95, leadDays: 1 });
  assert.equal(projectedInventoryAtDelivery(shrimp), 5.25);
  assert.equal(projectedInventoryPercentAtDelivery(shrimp), 53);
});

await test('suggested purchasing rounds projected delivery shortage up to whole configured packs', () => {
  assert.equal(suggestedPurchaseQuantity(item()), 10);
  assert.equal(
    suggestedPurchaseQuantity(
      item({
        current: 8,
        incoming: 0,
        dailyUse: 0,
        leadDays: 1,
        packSize: 5,
      }),
    ),
    5,
  );
});

await test('suggested purchasing includes expected consumption during supplier lead time', () => {
  assert.equal(
    suggestedPurchaseQuantity(
      item({
        current: 8,
        incoming: 0,
        dailyUse: 4,
        leadDays: 2,
        fullLevel: 10,
        packSize: 5,
      }),
    ),
    10,
  );
});

await test('Jourvis may auto-accept only when all authority limits are respected', () => {
  const shrimp = item();
  const authority = evaluatePurchaseAuthority(shrimp, purchase());
  assert.equal(authority.withinAutoAccept, true);
  assert.equal(authority.canNegotiate, false);
});

await test('Jourvis can negotiate an out-of-auto-accept quote only inside hard authority', () => {
  const shrimp = item();
  const authority = evaluatePurchaseAuthority(
    shrimp,
    purchase({
      quotedPackPrice: 3050,
      quotedTotal: 6250,
    }),
  );
  assert.equal(authority.withinAutoAccept, false);
  assert.equal(authority.withinHardLimits, true);
  assert.equal(authority.canNegotiate, true);
  assert.equal(authority.negotiatedTotal, 5750);
});

await test('hard ceiling or delivery limits prevent automatic negotiation', () => {
  const shrimp = item();
  assert.equal(
    evaluatePurchaseAuthority(
      shrimp,
      purchase({ quotedPackPrice: 3200, quotedTotal: 6550 }),
    ).canNegotiate,
    false,
  );
  assert.equal(
    evaluatePurchaseAuthority(
      shrimp,
      purchase({ deliveryFee: 500, quotedTotal: 6300 }),
    ).canNegotiate,
    false,
  );
});

await test('global automation off leaves an eligible Jourvis item queued instead of turning it into an owner exception', () => {
  const tasks = deriveJourvisTasks(state(item(), [], false));
  assert.equal(tasks.length, 0);
});

await test('a task explicitly set to Manual becomes an owner responsibility', () => {
  const tasks = deriveJourvisTasks(
    state(item({ automationEnabled: false }), [], false),
  );
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]?.module, 'inventory');
  assert.match(tasks[0]?.why ?? '', /Manual/);
});

await test('a quote outside hard authority becomes an explained owner decision', () => {
  const shrimp = item();
  const tasks = deriveJourvisTasks(
    state(
      shrimp,
      [
        purchase({
          quotedPackPrice: 3200,
          quotedTotal: 6550,
        }),
      ],
      true,
    ),
  );
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]?.module, 'purchasing');
  assert.match(tasks[0]?.why ?? '', /absolute ceiling/i);
});


await test('absolute pack-price ceiling cannot be bypassed by an invalid auto-accept setting', () => {
  const shrimp = item({
    autoAcceptPackPrice: 3300,
    hardMaxPackPrice: 3100,
  });
  const authority = evaluatePurchaseAuthority(
    shrimp,
    purchase({
      quotedPackPrice: 3200,
      quotedTotal: 6550,
    }),
  );

  assert.equal(authority.withinAutoAccept, false);
  assert.equal(authority.withinHardLimits, false);
  assert.equal(authority.canNegotiate, false);
});

await test('authority configuration normalizes target and auto-accept beneath the hard ceiling', () => {
  const normalized = normalizeInventoryAuthorityConfiguration(
    item({
      targetPackPrice: 3400,
      autoAcceptPackPrice: 3300,
      hardMaxPackPrice: 3100,
    }),
  );

  assert.equal(normalized.hardMaxPackPrice, 3100);
  assert.equal(normalized.autoAcceptPackPrice, 3100);
  assert.equal(normalized.targetPackPrice, 3100);
});

await test('automatic scheduler recognizes negotiable quotes and sent counteroffers', () => {
  const shrimp = item();
  const negotiable = purchase({
    quotedPackPrice: 3050,
    quotedTotal: 6250,
  });
  const negotiatingState = state(shrimp, [negotiable], true);

  assert.equal(canAdvancePurchase(negotiatingState, negotiable), true);

  const counterSent = purchase({
    status: 'counter_sent',
    quotedPackPrice: 2800,
    quotedTotal: 5750,
    counteroffersUsed: 1,
  });
  assert.equal(
    canAdvancePurchase(state(shrimp, [counterSent], true), counterSent),
    true,
  );
});

await test('paused global autonomy stops Jourvis approval and exposes the in-flight quote to the owner', () => {
  const shrimp = item();
  const quoted = purchase();
  const paused = state(shrimp, [quoted], false);

  assert.equal(canAdvancePurchase(paused, quoted), false);
  const tasks = deriveJourvisTasks(paused);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]?.module, 'purchasing');
  assert.match(tasks[0]?.why ?? '', /paused/i);
});

await test('paused global autonomy exposes a fixed-price Jourvis request instead of leaving it stuck', () => {
  const shrimp = item({ purchasingMode: 'fixed' });
  const requested = purchase({
    status: 'requested',
    quotedPackPrice: undefined,
    quotedTotal: undefined,
    deliveryFee: undefined,
    origin: 'jourvis',
    automationMode: 'autobuy',
  });
  const paused = state(shrimp, [requested], false);

  assert.equal(canAdvancePurchase(paused, requested), false);
  const tasks = deriveJourvisTasks(paused);
  assert.equal(tasks.length, 1);
  assert.match(tasks[0]?.why ?? '', /paused/i);
});


await test('contact-supplier mode may send a request but cannot accept fixed terms automatically', () => {
  const shrimp = item({
    purchasingMode: 'fixed',
    automationMode: 'auto_contact',
  });
  const requested = purchase({
    status: 'requested',
    quotedPackPrice: undefined,
    quotedTotal: undefined,
    deliveryFee: undefined,
    origin: 'jourvis',
    automationMode: 'auto_contact',
  });
  const requestedState = state(shrimp, [requested], true);

  assert.equal(canAdvancePurchase(requestedState, requested), true);

  const viewed = purchase({
    status: 'supplier_viewed',
    quotedPackPrice: undefined,
    quotedTotal: undefined,
    deliveryFee: undefined,
    origin: 'jourvis',
    automationMode: 'auto_contact',
    buyerConfirmed: false,
  });
  const viewedState = state(shrimp, [viewed], true);

  assert.equal(canAdvancePurchase(viewedState, viewed), false);
  const tasks = deriveJourvisTasks(viewedState);
  assert.equal(tasks.length, 1);
  assert.match(tasks[0]?.why ?? '', /contact the supplier/i);
});

await test('supplier may return a quote after viewing even when global autonomy is paused', () => {
  const shrimp = item({ purchasingMode: 'quote' });
  const viewed = purchase({
    status: 'supplier_viewed',
    origin: 'jourvis',
    automationMode: 'autobuy',
  });

  assert.equal(canAdvancePurchase(state(shrimp, [viewed], false), viewed), true);
});

await test('paused quote request becomes a specific owner decision before supplier contact', () => {
  const shrimp = item({ purchasingMode: 'quote' });
  const requested = purchase({
    status: 'quote_requested',
    origin: 'jourvis',
    automationMode: 'autobuy',
  });
  const paused = state(shrimp, [requested], false);
  const tasks = deriveJourvisTasks(paused);

  assert.equal(canAdvancePurchase(paused, requested), false);
  assert.equal(tasks.length, 1);
  assert.match(tasks[0]?.title ?? '', /paused/i);
});

await test('purchase progress separates request, supplier view, agreement, confirmation, and receipt', () => {
  assert.equal(purchaseProgressStage('requested'), 1);
  assert.equal(purchaseProgressStage('quote_requested'), 1);
  assert.equal(purchaseProgressStage('supplier_viewed'), 2);
  assert.equal(purchaseProgressStage('quote_received'), 3);
  assert.equal(purchaseProgressStage('awaiting_confirmation'), 3);
  assert.equal(purchaseProgressStage('confirmed'), 4);
  assert.equal(purchaseProgressStage('in_transit'), 4);
  assert.equal(purchaseProgressStage('received'), 5);
});
