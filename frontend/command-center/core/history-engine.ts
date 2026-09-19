import { buildCommandCenterFinance } from "./finance-engine.ts";
import { buildCommandCenterForecast } from "./forecast-engine.ts";
import { buildCommandCenterPerformance } from "./performance-engine.ts";
import type {
  CommandCenterHistorySnapshot,
  CommandCenterRuntimeState,
} from "./runtime.ts";

const HISTORY_LIMIT = 500;

function stableNumber(value: number | null) {
  return value === null ? null : Math.round(value * 100) / 100;
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function commandCenterHistorySignature(
  state: CommandCenterRuntimeState,
  ownerExceptionCount: number,
) {
  const domainFingerprint = {
    automationMasterOn: state.automationMasterOn,
    inventory: state.inventory
      .map((item) => ({
        id: item.id,
        current: item.current,
        incoming: item.incoming,
        fullLevel: item.fullLevel,
        reorderAt: item.reorderAt,
        dailyUse: item.dailyUse ?? 0,
        supplierId: item.supplierId,
        contactId: item.contactId,
        packSize: item.packSize,
        packPrice: item.packPrice,
        leadDays: item.leadDays,
        purchasingMode: item.purchasingMode,
        automationEnabled: item.automationEnabled,
        automationMode: item.automationMode,
        automationTriggerPercent: item.automationTriggerPercent,
        maxAutoOrderQty: item.maxAutoOrderQty,
        maxAutoOrderSpend: item.maxAutoOrderSpend,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    purchases: state.purchases
      .map((purchase) => ({
        id: purchase.id,
        itemId: purchase.itemId,
        quantity: purchase.quantity,
        status: purchase.status,
        estimatedTotal: purchase.estimatedTotal,
        quotedTotal: purchase.quotedTotal ?? null,
        quotedPackPrice: purchase.quotedPackPrice ?? null,
        deliveryFee: purchase.deliveryFee ?? null,
        etaDays: purchase.etaDays ?? null,
        receivedQuantity: purchase.receivedQuantity ?? 0,
        buyerConfirmed: purchase.buyerConfirmed ?? false,
        supplierConfirmed: purchase.supplierConfirmed ?? false,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    recipes: state.recipes
      .map((recipe) => ({
        id: recipe.id,
        active: recipe.active,
        name: recipe.name,
        ingredients: Object.entries(recipe.ingredients).sort(
          ([left], [right]) => left.localeCompare(right),
        ),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    menuItems: state.menuItems
      .map((item) => ({
        id: item.id,
        active: item.active,
        available: item.available,
        currentPrice: item.currentPrice ?? null,
        recipeId: item.recipeId ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    pausedItemIds: [...state.pausedItemIds].sort(),
    ownerExceptionCount,
    latestActivityId: state.activity[0]?.id ?? null,
  };

  return hashString(JSON.stringify(domainFingerprint));
}

export function createCommandCenterHistorySnapshot(
  state: CommandCenterRuntimeState,
  ownerExceptionCount: number,
  capturedAt = new Date().toISOString(),
): CommandCenterHistorySnapshot {
  const performance = buildCommandCenterPerformance(
    state,
    ownerExceptionCount,
  );
  const finance = buildCommandCenterFinance(state);
  const forecast = buildCommandCenterForecast(state, 7);
  const stateSignature = commandCenterHistorySignature(
    state,
    ownerExceptionCount,
  );
  const latestActivity = state.activity[0];

  return {
    id: `history-${capturedAt}-${state.history.length + 1}`,
    capturedAt,
    trigger: latestActivity?.action ?? "state_observed",
    stateSignature,
    inventoryReadinessPercent:
      performance.inventoryReadinessPercent,
    inventoryRiskCount: performance.inventoryRiskCount,
    activeWorkflowCount: performance.activeWorkflowCount,
    ownerExceptionCount,
    recipeCoveragePercent: performance.recipeCoveragePercent,
    averageFoodCostPercent: stableNumber(
      performance.averageFoodCostPercent,
    ),
    openPurchaseCommitments: finance.openPurchaseCommitments,
    confirmedIncomingCommitments:
      finance.confirmedIncomingCommitments,
    receivedPurchaseSpend: finance.receivedPurchaseSpend,
    configuredInventoryValue: finance.configuredInventoryValue,
    averageMenuGrossMarginPercent: stableNumber(
      finance.averageMenuGrossMarginPercent,
    ),
    automaticActivityCount: performance.automaticActivityCount,
    manualActivityCount: performance.manualActivityCount,
    inventoryForecast7d: forecast.inventoryRows.map((row) => {
      const item = state.inventory.find(
        (entry) => entry.id === row.itemId,
      );
      return {
        itemId: row.itemId,
        unit: row.unit,
        onHand: row.current,
        incoming: row.incoming,
        fullLevel: item?.fullLevel ?? Math.max(row.current, 0.01),
        dailyUse: row.dailyUse,
        projected7d: row.projectedAtHorizon,
      };
    }),
  };
}

export function appendCommandCenterHistorySnapshot(
  state: CommandCenterRuntimeState,
  ownerExceptionCount: number,
  capturedAt = new Date().toISOString(),
): CommandCenterRuntimeState {
  const snapshot = createCommandCenterHistorySnapshot(
    state,
    ownerExceptionCount,
    capturedAt,
  );
  if (state.history[0]?.stateSignature === snapshot.stateSignature) {
    return state;
  }

  return {
    ...state,
    history: [snapshot, ...state.history].slice(0, HISTORY_LIMIT),
  };
}

export type CommandCenterHistoryTrend = {
  snapshotCount: number;
  oldestAt?: string;
  latestAt?: string;
  inventoryReadinessDelta: number | null;
  inventoryRiskDelta: number;
  activeWorkflowDelta: number;
  ownerExceptionDelta: number;
  recipeCoverageDelta: number | null;
  foodCostDelta: number | null;
  openCommitmentDelta: number;
  receivedSpendDelta: number;
  inventoryValueDelta: number;
  grossMarginDelta: number | null;
  automaticActionDelta: number;
  manualActionDelta: number;
};

function nullableDelta(
  latest: number | null,
  oldest: number | null,
) {
  if (latest === null || oldest === null) return null;
  return Math.round((latest - oldest) * 10) / 10;
}

export function buildCommandCenterHistoryTrend(
  state: CommandCenterRuntimeState,
): CommandCenterHistoryTrend {
  const latest = state.history[0];
  const oldest = state.history[state.history.length - 1];

  if (!latest || !oldest) {
    return {
      snapshotCount: state.history.length,
      inventoryReadinessDelta: null,
      inventoryRiskDelta: 0,
      activeWorkflowDelta: 0,
      ownerExceptionDelta: 0,
      recipeCoverageDelta: null,
      foodCostDelta: null,
      openCommitmentDelta: 0,
      receivedSpendDelta: 0,
      inventoryValueDelta: 0,
      grossMarginDelta: null,
      automaticActionDelta: 0,
      manualActionDelta: 0,
    };
  }

  return {
    snapshotCount: state.history.length,
    oldestAt: oldest.capturedAt,
    latestAt: latest.capturedAt,
    inventoryReadinessDelta: nullableDelta(
      latest.inventoryReadinessPercent,
      oldest.inventoryReadinessPercent,
    ),
    inventoryRiskDelta:
      latest.inventoryRiskCount - oldest.inventoryRiskCount,
    activeWorkflowDelta:
      latest.activeWorkflowCount - oldest.activeWorkflowCount,
    ownerExceptionDelta:
      latest.ownerExceptionCount - oldest.ownerExceptionCount,
    recipeCoverageDelta: nullableDelta(
      latest.recipeCoveragePercent,
      oldest.recipeCoveragePercent,
    ),
    foodCostDelta: nullableDelta(
      latest.averageFoodCostPercent,
      oldest.averageFoodCostPercent,
    ),
    openCommitmentDelta:
      Math.round(
        (latest.openPurchaseCommitments -
          oldest.openPurchaseCommitments) *
          100,
      ) / 100,
    receivedSpendDelta:
      Math.round(
        (latest.receivedPurchaseSpend -
          oldest.receivedPurchaseSpend) *
          100,
      ) / 100,
    inventoryValueDelta:
      Math.round(
        (latest.configuredInventoryValue -
          oldest.configuredInventoryValue) *
          100,
      ) / 100,
    grossMarginDelta: nullableDelta(
      latest.averageMenuGrossMarginPercent,
      oldest.averageMenuGrossMarginPercent,
    ),
    automaticActionDelta:
      latest.automaticActivityCount -
      oldest.automaticActivityCount,
    manualActionDelta:
      latest.manualActivityCount - oldest.manualActivityCount,
  };
}

export type CommandCenterForecastAccuracyRow = {
  itemId: string;
  unit: string;
  predicted: number;
  actual: number;
  absoluteError: number;
  errorPercentOfFullLevel: number;
};

export type CommandCenterForecastAccuracy = {
  matured: boolean;
  horizonDays: number;
  baselineAt?: string;
  actualAt?: string;
  itemCount: number;
  meanNormalizedErrorPercent: number | null;
  rows: CommandCenterForecastAccuracyRow[];
};

export function buildCommandCenterForecastAccuracy(
  state: CommandCenterRuntimeState,
  horizonDays = 7,
): CommandCenterForecastAccuracy {
  if (state.history.length < 2) {
    return {
      matured: false,
      horizonDays,
      itemCount: 0,
      meanNormalizedErrorPercent: null,
      rows: [],
    };
  }

  const latest = state.history[0];
  const latestAt = Date.parse(latest.capturedAt);
  if (!Number.isFinite(latestAt)) {
    return {
      matured: false,
      horizonDays,
      itemCount: 0,
      meanNormalizedErrorPercent: null,
      rows: [],
    };
  }

  const targetTime =
    latestAt - horizonDays * 24 * 60 * 60 * 1000;
  const eligible = state.history
    .slice(1)
    .filter((snapshot) => {
      const at = Date.parse(snapshot.capturedAt);
      return Number.isFinite(at) && at <= targetTime;
    })
    .sort(
      (left, right) =>
        Math.abs(Date.parse(left.capturedAt) - targetTime) -
        Math.abs(Date.parse(right.capturedAt) - targetTime),
    );
  const baseline = eligible[0];

  if (!baseline) {
    return {
      matured: false,
      horizonDays,
      actualAt: latest.capturedAt,
      itemCount: 0,
      meanNormalizedErrorPercent: null,
      rows: [],
    };
  }

  const latestByItem = new Map(
    (latest.inventoryForecast7d ?? []).map((entry) => [
      entry.itemId,
      entry,
    ]),
  );
  const rows = (baseline.inventoryForecast7d ?? []).flatMap(
    (prediction): CommandCenterForecastAccuracyRow[] => {
      if (prediction.dailyUse <= 0) return [];
      const actual = latestByItem.get(prediction.itemId);
      if (!actual) return [];

      const absoluteError =
        Math.round(
          Math.abs(actual.onHand - prediction.projected7d) * 100,
        ) / 100;
      const errorPercentOfFullLevel =
        Math.round(
          (absoluteError /
            Math.max(prediction.fullLevel, 0.01)) *
            1000,
        ) / 10;

      return [
        {
          itemId: prediction.itemId,
          unit: prediction.unit,
          predicted: prediction.projected7d,
          actual: actual.onHand,
          absoluteError,
          errorPercentOfFullLevel,
        },
      ];
    },
  );

  return {
    matured: rows.length > 0,
    horizonDays,
    baselineAt: baseline.capturedAt,
    actualAt: latest.capturedAt,
    itemCount: rows.length,
    meanNormalizedErrorPercent: rows.length
      ? Math.round(
          (rows.reduce(
            (sum, row) =>
              sum + row.errorPercentOfFullLevel,
            0,
          ) /
            rows.length) *
            10,
        ) / 10
      : null,
    rows,
  };
}
