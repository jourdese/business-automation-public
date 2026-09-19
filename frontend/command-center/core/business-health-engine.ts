import { buildCommandCenterForecast } from "./forecast-engine.ts";
import { buildCommandCenterFinance } from "./finance-engine.ts";
import { buildCommandCenterMenuEconomics } from "./menu-economics.ts";
import { buildCommandCenterPerformance } from "./performance-engine.ts";
import { buildCommandCenterSupplierPerformance } from "./supplier-performance-engine.ts";
import type {
  CommandCenterRuntimeState,
  JourvisRuntimeTask,
} from "./runtime.ts";

export type CommandCenterOperatingSignalSeverity =
  | "critical"
  | "warning"
  | "watch"
  | "stable";

export type CommandCenterOperatingSignal = {
  id: string;
  severity: CommandCenterOperatingSignalSeverity;
  module: string;
  title: string;
  summary: string;
  nextAction: string;
  relatedEntityIds: string[];
};

export type CommandCenterOperatingHealth = {
  signals: CommandCenterOperatingSignal[];
  criticalCount: number;
  warningCount: number;
  watchCount: number;
  stableCount: number;
  attentionCount: number;
  highestSeverity: CommandCenterOperatingSignalSeverity;
};

const severityRank: Record<CommandCenterOperatingSignalSeverity, number> = {
  critical: 4,
  warning: 3,
  watch: 2,
  stable: 1,
};

function highestSeverity(
  signals: CommandCenterOperatingSignal[],
): CommandCenterOperatingSignalSeverity {
  return (
    signals
      .slice()
      .sort(
        (left, right) =>
          severityRank[right.severity] - severityRank[left.severity],
      )[0]?.severity ?? "stable"
  );
}

function formatMoney(value: number) {
  return "₱" + Math.round(value).toLocaleString("en-PH");
}

export function buildCommandCenterOperatingHealth(
  state: CommandCenterRuntimeState,
  tasks: JourvisRuntimeTask[],
): CommandCenterOperatingHealth {
  const forecast = buildCommandCenterForecast(state, 7);
  const performance = buildCommandCenterPerformance(
    state,
    tasks.length,
  );
  const finance = buildCommandCenterFinance(state);
  const supplierPerformance =
    buildCommandCenterSupplierPerformance(state);
  const signals: CommandCenterOperatingSignal[] = [];

  const criticalRows = forecast.inventoryRows.filter(
    (row) => row.risk === "critical",
  );
  const highRows = forecast.inventoryRows.filter(
    (row) => row.risk === "high",
  );
  if (criticalRows.length) {
    signals.push({
      id: "inventory-critical",
      severity: "critical",
      module: "forecast",
      title:
        String(criticalRows.length) +
        " ingredient" +
        (criticalRows.length === 1 ? "" : "s") +
        " can run out before or near supplier arrival",
      summary: criticalRows
        .slice(0, 3)
        .map(
          (row) =>
            row.name +
            ": " +
            String(row.daysCover ?? "—") +
            " days cover, " +
            String(row.projectedAtDelivery) +
            " " +
            row.unit +
            " projected at delivery",
        )
        .join(" · "),
      nextAction:
        criticalRows.find((row) => row.activePurchaseId)?.nextAction ??
        criticalRows[0]?.nextAction ??
        "Review the Forecast and start the required restock workflow.",
      relatedEntityIds: criticalRows.map((row) => row.itemId),
    });
  } else if (highRows.length) {
    signals.push({
      id: "inventory-high",
      severity: "warning",
      module: "forecast",
      title:
        String(highRows.length) +
        " ingredient" +
        (highRows.length === 1 ? "" : "s") +
        " need near-term restock attention",
      summary: highRows
        .slice(0, 3)
        .map(
          (row) =>
            row.name +
            ": " +
            String(row.daysCover ?? "—") +
            " days cover",
        )
        .join(" · "),
      nextAction:
        highRows.find((row) => row.activePurchaseId)?.nextAction ??
        highRows[0]?.nextAction ??
        "Review the Forecast and purchasing queue.",
      relatedEntityIds: highRows.map((row) => row.itemId),
    });
  }

  const highPriorityTasks = tasks.filter(
    (task) => task.priority === "high",
  );
  if (tasks.length) {
    signals.push({
      id: "owner-exceptions",
      severity: highPriorityTasks.length ? "critical" : "warning",
      module: "decisions",
      title:
        String(tasks.length) +
        " owner decision" +
        (tasks.length === 1 ? "" : "s") +
        " waiting",
      summary: tasks
        .slice(0, 3)
        .map((task) => task.title)
        .join(" · "),
      nextAction:
        "Open Decisions and resolve only the exceptions that exceed Jourvis authority.",
      relatedEntityIds: tasks.flatMap((task) =>
        task.entityId ? [task.entityId] : [],
      ),
    });
  }

  const activeRecipes = new Map(
    state.recipes
      .filter((recipe) => recipe.active)
      .map((recipe) => [recipe.id, recipe]),
  );
  const menuEconomics = state.menuItems.flatMap((item) => {
    if (!item.active || !item.recipeId) return [];
    const recipe = activeRecipes.get(item.recipeId);
    if (!recipe) return [];
    return [
      {
        item,
        economics: buildCommandCenterMenuEconomics(
          item,
          recipe,
          state.inventory,
        ),
      },
    ];
  });
  const highFoodCost = menuEconomics.filter(
    ({ economics }) => economics.warning === "high",
  );
  const watchFoodCost = menuEconomics.filter(
    ({ economics }) => economics.warning === "watch",
  );
  if (highFoodCost.length) {
    signals.push({
      id: "menu-cost-pressure",
      severity: "warning",
      module: "menu",
      title:
        String(highFoodCost.length) +
        " menu item" +
        (highFoodCost.length === 1 ? " has" : "s have") +
        " high food cost",
      summary: highFoodCost
        .slice(0, 3)
        .map(
          ({ item, economics }) =>
            item.name + ": " + String(economics.foodCostPercent) + "%",
        )
        .join(" · "),
      nextAction:
        "Review Menu economics and the linked recipes before changing price or recipe quantities.",
      relatedEntityIds: highFoodCost.map(({ item }) => item.id),
    });
  } else if (watchFoodCost.length) {
    signals.push({
      id: "menu-cost-watch",
      severity: "watch",
      module: "menu",
      title:
        String(watchFoodCost.length) +
        " menu item" +
        (watchFoodCost.length === 1 ? " is" : "s are") +
        " approaching the food-cost warning threshold",
      summary: watchFoodCost
        .slice(0, 3)
        .map(
          ({ item, economics }) =>
            item.name + ": " + String(economics.foodCostPercent) + "%",
        )
        .join(" · "),
      nextAction:
        "Keep current price and recipe changes visible in Menu economics.",
      relatedEntityIds: watchFoodCost.map(({ item }) => item.id),
    });
  }

  const recipeCostDrift = menuEconomics.filter(
    ({ economics }) =>
      (economics.costDriftSinceRecipeSavePercent ?? 0) >= 10,
  );
  if (recipeCostDrift.length) {
    signals.push({
      id: "recipe-cost-drift",
      severity: "watch",
      module: "recipes",
      title:
        String(recipeCostDrift.length) +
        " recipe-linked menu item" +
        (recipeCostDrift.length === 1 ? " has" : "s have") +
        " ingredient cost drift",
      summary: recipeCostDrift
        .slice(0, 3)
        .map(
          ({ item, economics }) =>
            item.name +
            ": +" +
            String(economics.costDriftSinceRecipeSavePercent) +
            "% since recipe save",
        )
        .join(" · "),
      nextAction:
        "Review recipe change impact before adjusting portions or selling price.",
      relatedEntityIds: recipeCostDrift.map(({ item }) => item.id),
    });
  }

  if (
    supplierPerformance.closedCount >= 2 &&
    supplierPerformance.completionRatePercent !== null &&
    supplierPerformance.completionRatePercent < 80
  ) {
    signals.push({
      id: "supplier-completion",
      severity: "warning",
      module: "suppliers",
      title: "Supplier workflow completion is below the demo watch threshold",
      summary:
        String(supplierPerformance.receivedCount) +
        "/" +
        String(supplierPerformance.closedCount) +
        " closed supplier requests were received (" +
        String(supplierPerformance.completionRatePercent) +
        "%).",
      nextAction:
        "Review rejected supplier requests and their Activity history before changing supplier or authority settings.",
      relatedEntityIds: [],
    });
  } else if (supplierPerformance.requestCount) {
    signals.push({
      id: "supplier-observation",
      severity: "watch",
      module: "suppliers",
      title: "Supplier workflow history is being observed",
      summary:
        supplierPerformance.averageViewMinutes === null
          ? String(supplierPerformance.requestCount) +
            " supplier request" +
            (supplierPerformance.requestCount === 1 ? "" : "s") +
            " recorded; response timing is still incomplete."
          : String(supplierPerformance.requestCount) +
            " supplier request" +
            (supplierPerformance.requestCount === 1 ? "" : "s") +
            " recorded; average supplier-view time is " +
            String(supplierPerformance.averageViewMinutes) +
            " minutes.",
      nextAction:
        "Keep supplier lifecycle events flowing so response and completion history becomes more representative.",
      relatedEntityIds: [],
    });
  }

  if (
    !state.automationMasterOn &&
    forecast.purchasePressureCount > 0
  ) {
    signals.push({
      id: "automation-paused",
      severity: "warning",
      module: "overview",
      title: "Automation is off while restock work is waiting",
      summary:
        String(forecast.purchasePressureCount) +
        " ingredient" +
        (forecast.purchasePressureCount === 1 ? " has" : "s have") +
        " a calculated replenishment need.",
      nextAction:
        "Review the queue, keep owner-only work Manual, then start Jourvis when the automatic items are ready.",
      relatedEntityIds: forecast.inventoryRows
        .filter((row) => row.recommendedQuantity > 0)
        .map((row) => row.itemId),
    });
  }

  if (finance.openPurchaseCommitments > 0) {
    signals.push({
      id: "purchase-capital",
      severity: "watch",
      module: "finance",
      title:
        formatMoney(finance.openPurchaseCommitments) +
        " is committed to active purchasing",
      summary:
        formatMoney(finance.confirmedIncomingCommitments) +
        " is already confirmed, in transit, or partially received.",
      nextAction:
        "Track active purchases through receipt; this is operational purchasing value, not accounting cash flow.",
      relatedEntityIds: state.purchases
        .filter(
          (purchase) =>
            purchase.status !== "received" &&
            purchase.status !== "rejected",
        )
        .map((purchase) => purchase.id),
    });
  }

  if (
    performance.recipeCoveragePercent !== null &&
    performance.recipeCoveragePercent < 100
  ) {
    signals.push({
      id: "menu-coverage",
      severity: "watch",
      module: "menu",
      title: "Some active menu items are not connected to active recipes",
      summary:
        String(performance.recipeMappedMenuCount) +
        "/" +
        String(performance.activeMenuItemCount) +
        " active menu items currently have active recipe mappings.",
      nextAction:
        "Map remaining demo menu items only when their recipe/inventory behavior is needed for the demo.",
      relatedEntityIds: state.menuItems
        .filter(
          (item) =>
            item.active &&
            (!item.recipeId || !activeRecipes.has(item.recipeId)),
        )
        .map((item) => item.id),
    });
  }

  if (!signals.length) {
    signals.push({
      id: "operating-stable",
      severity: "stable",
      module: "overview",
      title: "No immediate operating exception is visible",
      summary:
        "Inventory, menu economics, purchasing authority, and the owner decision queue are currently inside the configured demo operating model.",
      nextAction:
        "Continue monitoring Forecast, Activity, and supplier workflows.",
      relatedEntityIds: [],
    });
  }

  signals.sort(
    (left, right) =>
      severityRank[right.severity] - severityRank[left.severity],
  );

  return {
    signals,
    criticalCount: signals.filter(
      (signal) => signal.severity === "critical",
    ).length,
    warningCount: signals.filter(
      (signal) => signal.severity === "warning",
    ).length,
    watchCount: signals.filter(
      (signal) => signal.severity === "watch",
    ).length,
    stableCount: signals.filter(
      (signal) => signal.severity === "stable",
    ).length,
    attentionCount: signals.filter(
      (signal) =>
        signal.severity === "critical" ||
        signal.severity === "warning",
    ).length,
    highestSeverity: highestSeverity(signals),
  };
}
