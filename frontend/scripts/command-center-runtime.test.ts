import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePurchaseAuthority,
  projectedInventoryAtDelivery,
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
    pausedItemIds: [],
    activity: [],
  };
}

await test('inventory projection keeps incoming separate and subtracts lead-time usage', () => {
  const shrimp = item({ current: 2.2, incoming: 5, dailyUse: 1.95, leadDays: 1 });
  assert.equal(projectedInventoryAtDelivery(shrimp), 5.25);
  assert.equal(projectedInventoryPercentAtDelivery(shrimp), 53);
});

await test('suggested purchasing rounds shortage up to whole configured packs', () => {
  assert.equal(suggestedPurchaseQuantity(item()), 10);
  assert.equal(
    suggestedPurchaseQuantity(item({ current: 8, incoming: 0, packSize: 5 })),
    5,
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
