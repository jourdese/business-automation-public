import { buildCommandCenterFinance } from "./finance-engine.ts";
import { buildCommandCenterPerformance } from "./performance-engine.ts";
import type {
  CommandCenterHistorySnapshot,
  CommandCenterRuntimeState,
} from "./runtime.ts";

const HISTORY_LIMIT = 500;

function stableNumber(value: number | null) {
  return value === null ? null : Math.round(value * 100) / 100;
}

export function commandCenterHistorySignature(
  state: CommandCenterRuntimeState,
  ownerExceptionCount: number,
) {
  const performance = buildCommandCenterPerformance(
    state,
    ownerExceptionCount,
  );
  const finance = buildCommandCenterFinance(state);

  return JSON.stringify({
    inventoryReadinessPercent: performance.inventoryReadinessPercent,
    inventoryRiskCount: performance.inventoryRiskCount,
    activeWorkflowCount: performance.activeWorkflowCount,
    ownerExceptionCount,
    recipeCoveragePercent: performance.recipeCoveragePercent,
    averageFoodCostPercent: performance.averageFoodCostPercent,
    openPurchaseCommitments: finance.openPurchaseCommitments,
    confirmedIncomingCommitments: finance.confirmedIncomingCommitments,
    receivedPurchaseSpend: finance.receivedPurchaseSpend,
    configuredInventoryValue: finance.configuredInventoryValue,
    averageMenuGrossMarginPercent:
      finance.averageMenuGrossMarginPercent,
    automaticActivityCount: performance.automaticActivityCount,
    manualActivityCount: performance.manualActivityCount,
  });
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
