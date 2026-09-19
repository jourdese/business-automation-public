import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAdvancePurchase,
  evaluateAutomaticPurchaseStart,
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
import { buildCommandCenterForecast } from '../command-center/core/forecast-engine.ts';
import { buildCommandCenterPerformance } from '../command-center/core/performance-engine.ts';
import { buildCommandCenterFinance } from '../command-center/core/finance-engine.ts';
import {
  appendCommandCenterHistorySnapshot,
  buildCommandCenterForecastAccuracy,
  buildCommandCenterHistoryTrend,
} from '../command-center/core/history-engine.ts';

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
    history: [],
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


await test('pre-contact guard blocks automatic requests that already exceed known authority', () => {
  const shrimp = item({
    purchasingMode: 'fixed',
    current: 2,
    dailyUse: 2,
    leadDays: 2,
    maxAutoOrderQty: 5,
  });
  const result = evaluateAutomaticPurchaseStart(shrimp);

  assert.equal(result.allowed, false);
  assert.match(result.reasons.join(' '), /quantity limit/i);
});

await test('pre-contact guard blocks fixed-price supplier contact above hard price limits', () => {
  const result = evaluateAutomaticPurchaseStart(
    item({
      purchasingMode: 'fixed',
      packPrice: 4000,
      hardMaxPackPrice: 3100,
      maxAutoOrderSpend: 5000,
    }),
  );

  assert.equal(result.allowed, false);
  assert.match(result.reasons.join(' '), /hard maximum/i);
});

await test('automatic pre-contact violation becomes an owner task when autonomy is running', () => {
  const shrimp = item({
    purchasingMode: 'fixed',
    maxAutoOrderQty: 5,
  });
  const tasks = deriveJourvisTasks(state(shrimp, [], true));

  assert.equal(tasks.length, 1);
  assert.match(tasks[0]?.title ?? '', /blocked/i);
  assert.match(tasks[0]?.whatJourvisDid ?? '', /before contacting/i);
});


await test('Forecast projects lead-time and horizon inventory from configured daily use', () => {
  const shrimp = item({
    current: 2,
    incoming: 1,
    dailyUse: 1,
    leadDays: 2,
    fullLevel: 10,
    reorderAt: 3,
    packSize: 5,
  });
  const snapshot = buildCommandCenterForecast(state(shrimp), 7);
  const row = snapshot.inventoryRows[0];

  assert.equal(row?.projectedAtDelivery, 1);
  assert.equal(row?.projectedAtHorizon, 0);
  assert.equal(row?.daysCover, 3);
  assert.equal(row?.recommendedQuantity, 10);
  assert.equal(row?.risk, 'high');
  assert.equal(snapshot.leadTimeRiskCount, 1);
  assert.equal(snapshot.horizonRiskCount, 1);
});

await test('Forecast marks stockout before supplier arrival as critical', () => {
  const shrimp = item({
    current: 1,
    incoming: 0,
    dailyUse: 2,
    leadDays: 1,
  });
  const row = buildCommandCenterForecast(state(shrimp), 7).inventoryRows[0];

  assert.equal(row?.risk, 'critical');
  assert.equal(row?.projectedAtDelivery, 0);
  assert.equal(row?.daysCover, 0.5);
});

await test('Forecast explains when an active purchase already protects an ingredient', () => {
  const shrimp = item();
  const active = purchase({
    status: 'in_transit',
    itemId: shrimp.id,
  });
  const row = buildCommandCenterForecast(
    state(shrimp, [active], true),
    7,
  ).inventoryRows[0];

  assert.equal(row?.activePurchaseId, active.id);
  assert.match(row?.nextAction ?? '', /Track JV-0001/i);
});

await test('Forecast links ingredient risk to active recipes', () => {
  const shrimp = item();
  const runtime = state(shrimp);
  runtime.recipes = [
    {
      id: 'recipe-shrimp',
      name: 'Shrimp Pasta',
      description: 'Test recipe',
      active: true,
      ingredients: { shrimp: 0.1 },
    },
    {
      id: 'recipe-archived',
      name: 'Old Shrimp Dish',
      description: 'Archived',
      active: false,
      ingredients: { shrimp: 0.2 },
    },
  ];

  const row = buildCommandCenterForecast(runtime, 7).inventoryRows[0];
  assert.deepEqual(row?.affectedRecipes, ['Shrimp Pasta']);
});


await test('Performance derives menu recipe coverage and food cost from live runtime data', () => {
  const shrimp = item({
    packSize: 5,
    packPrice: 2800,
  });
  const runtime = state(shrimp);
  runtime.recipes = [
    {
      id: 'recipe-shrimp',
      name: 'Shrimp Pasta',
      description: 'Test recipe',
      active: true,
      ingredients: { shrimp: 0.1 },
    },
  ];
  runtime.menuItems = [
    {
      id: 'menu-shrimp',
      name: 'Shrimp Pasta',
      printedName: 'Shrimp Pasta',
      dishKey: 'shrimp-pasta',
      category: 'Pasta',
      currentPrice: 200,
      referenceSource: 'demo',
      currentPriceVerified: true,
      active: true,
      available: true,
      recipeId: 'recipe-shrimp',
    },
    {
      id: 'menu-unmapped',
      name: 'Unmapped',
      printedName: 'Unmapped',
      dishKey: 'unmapped',
      category: 'Pasta',
      currentPrice: 100,
      referenceSource: 'demo',
      currentPriceVerified: true,
      active: true,
      available: true,
    },
  ];

  const performance = buildCommandCenterPerformance(runtime, 0);

  assert.equal(performance.recipeCoveragePercent, 50);
  assert.equal(performance.recipeMappedMenuCount, 1);
  assert.equal(performance.pricedMappedMenuCount, 1);
  assert.equal(performance.averageFoodCostPercent, 28);
});

await test('Performance reports automatic/manual activity mix without fake financial KPIs', () => {
  const runtime = state(item());
  runtime.activity = [
    {
      id: 'a1',
      at: '2026-09-19T00:00:00.000Z',
      module: 'purchasing',
      action: 'automatic_one',
      message: 'Automatic',
      actor: 'jourvis',
      executionMode: 'automatic',
      reason: 'test',
    },
    {
      id: 'a2',
      at: '2026-09-19T00:01:00.000Z',
      module: 'inventory',
      action: 'automatic_two',
      message: 'Automatic',
      actor: 'jourvis',
      executionMode: 'automatic',
      reason: 'test',
    },
    {
      id: 'a3',
      at: '2026-09-19T00:02:00.000Z',
      module: 'inventory',
      action: 'manual_one',
      message: 'Manual',
      actor: 'owner',
      executionMode: 'manual',
      reason: 'test',
    },
  ];

  const performance = buildCommandCenterPerformance(runtime, 2);

  assert.equal(performance.automationSharePercent, 67);
  assert.equal(performance.automaticActivityCount, 2);
  assert.equal(performance.manualActivityCount, 1);
  assert.equal(performance.ownerExceptionCount, 2);
});

await test('Performance purchase completion uses only closed workflows', () => {
  const shrimp = item();
  const received = purchase({
    id: 'JV-0001',
    status: 'received',
    receivedQuantity: 10,
  });
  const rejected = purchase({
    id: 'JV-0002',
    status: 'rejected',
  });
  const active = purchase({
    id: 'JV-0003',
    status: 'in_transit',
  });
  const performance = buildCommandCenterPerformance(
    state(shrimp, [received, rejected, active]),
    0,
  );

  assert.equal(performance.activeWorkflowCount, 1);
  assert.equal(performance.receivedPurchaseCount, 1);
  assert.equal(performance.closedPurchaseCount, 2);
  assert.equal(performance.purchaseCompletionPercent, 50);
});


await test('Finance derives purchase commitments and received spend from runtime purchases', () => {
  const shrimp = item();
  const active = purchase({
    id: 'JV-0001',
    status: 'in_transit',
    quotedTotal: 6000,
  });
  const received = purchase({
    id: 'JV-0002',
    status: 'received',
    quotedTotal: 5500,
    receivedQuantity: 10,
  });
  const rejected = purchase({
    id: 'JV-0003',
    status: 'rejected',
    quotedTotal: 9000,
  });
  const finance = buildCommandCenterFinance(
    state(shrimp, [active, received, rejected]),
  );

  assert.equal(finance.openPurchaseCommitments, 6000);
  assert.equal(finance.confirmedIncomingCommitments, 6000);
  assert.equal(finance.receivedPurchaseSpend, 5500);
});

await test('Finance estimates configured inventory value from pack unit cost', () => {
  const shrimp = item({
    current: 2.2,
    packSize: 5,
    packPrice: 2800,
  });
  const finance = buildCommandCenterFinance(state(shrimp));

  assert.equal(finance.configuredInventoryValue, 1232);
});

await test('Finance computes menu gross profit and margin only for priced mapped items', () => {
  const shrimp = item({
    packSize: 5,
    packPrice: 2800,
  });
  const runtime = state(shrimp);
  runtime.recipes = [
    {
      id: 'recipe-shrimp',
      name: 'Shrimp Pasta',
      description: 'Test',
      active: true,
      ingredients: { shrimp: 0.1 },
    },
  ];
  runtime.menuItems = [
    {
      id: 'menu-shrimp',
      name: 'Shrimp Pasta',
      printedName: 'Shrimp Pasta',
      dishKey: 'shrimp-pasta',
      category: 'Pasta',
      currentPrice: 200,
      referenceSource: 'demo',
      currentPriceVerified: true,
      active: true,
      available: true,
      recipeId: 'recipe-shrimp',
    },
  ];

  const finance = buildCommandCenterFinance(runtime);

  assert.equal(finance.pricedMappedMenuCount, 1);
  assert.equal(finance.averageMenuGrossProfit, 144);
  assert.equal(finance.averageMenuGrossMarginPercent, 72);
});


await test('History snapshots dedupe identical business states', () => {
  const runtime = state(item());
  const once = appendCommandCenterHistorySnapshot(
    runtime,
    0,
    '2026-09-19T00:00:00.000Z',
  );
  const twice = appendCommandCenterHistorySnapshot(
    once,
    0,
    '2026-09-19T00:01:00.000Z',
  );

  assert.equal(once.history.length, 1);
  assert.equal(twice.history.length, 1);
});

await test('History records KPI changes and calculates trend deltas', () => {
  const initial = appendCommandCenterHistorySnapshot(
    state(item({ current: 10, dailyUse: 1 })),
    0,
    '2026-09-19T00:00:00.000Z',
  );
  const changedState: CommandCenterRuntimeState = {
    ...initial,
    inventory: initial.inventory.map((entry) => ({
      ...entry,
      current: 2,
    })),
    activity: [
      {
        id: 'history-action',
        at: '2026-09-19T01:00:00.000Z',
        module: 'inventory',
        action: 'stock_adjusted',
        message: 'Stock changed',
        actor: 'owner',
        executionMode: 'manual',
        reason: 'test',
      },
      ...initial.activity,
    ],
  };
  const changed = appendCommandCenterHistorySnapshot(
    changedState,
    1,
    '2026-09-19T01:00:00.000Z',
  );
  const trend = buildCommandCenterHistoryTrend(changed);

  assert.equal(changed.history.length, 2);
  assert.equal(trend.snapshotCount, 2);
  assert.equal(trend.inventoryReadinessDelta, -80);
  assert.equal(trend.ownerExceptionDelta, 1);
  assert.equal(trend.manualActionDelta, 1);
});

await test('History preserves finance movement across snapshots', () => {
  const shrimp = item();
  const initial = appendCommandCenterHistorySnapshot(
    state(shrimp),
    0,
    '2026-09-19T00:00:00.000Z',
  );
  const withPurchase: CommandCenterRuntimeState = {
    ...initial,
    purchases: [
      purchase({
        status: 'in_transit',
        quotedTotal: 6000,
      }),
    ],
  };
  const changed = appendCommandCenterHistorySnapshot(
    withPurchase,
    0,
    '2026-09-19T00:10:00.000Z',
  );
  const trend = buildCommandCenterHistoryTrend(changed);

  assert.equal(trend.openCommitmentDelta, 6000);
  assert.equal(trend.activeWorkflowDelta, 1);
});


await test('Forecast accuracy stays collecting until the horizon has matured', () => {
  const initial = appendCommandCenterHistorySnapshot(
    state(item({ current: 10, dailyUse: 1, fullLevel: 10 })),
    0,
    '2026-09-19T00:00:00.000Z',
  );
  const changed: CommandCenterRuntimeState = {
    ...initial,
    inventory: initial.inventory.map((entry) => ({
      ...entry,
      current: 8,
    })),
  };
  const recent = appendCommandCenterHistorySnapshot(
    changed,
    0,
    '2026-09-20T00:00:00.000Z',
  );
  const accuracy = buildCommandCenterForecastAccuracy(recent, 7);

  assert.equal(accuracy.matured, false);
  assert.equal(accuracy.itemCount, 0);
});

await test('Forecast accuracy compares matured prediction with later actual stock', () => {
  const initial = appendCommandCenterHistorySnapshot(
    state(item({ current: 10, dailyUse: 1, fullLevel: 10 })),
    0,
    '2026-09-01T00:00:00.000Z',
  );
  const changed: CommandCenterRuntimeState = {
    ...initial,
    inventory: initial.inventory.map((entry) => ({
      ...entry,
      current: 4,
    })),
  };
  const matured = appendCommandCenterHistorySnapshot(
    changed,
    0,
    '2026-09-08T00:00:00.000Z',
  );
  const accuracy = buildCommandCenterForecastAccuracy(matured, 7);

  assert.equal(accuracy.matured, true);
  assert.equal(accuracy.itemCount, 1);
  assert.equal(accuracy.rows[0]?.predicted, 3);
  assert.equal(accuracy.rows[0]?.actual, 4);
  assert.equal(accuracy.rows[0]?.absoluteError, 1);
  assert.equal(accuracy.meanNormalizedErrorPercent, 10);
});
