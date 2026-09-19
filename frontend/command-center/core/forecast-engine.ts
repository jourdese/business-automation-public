import {
  evaluateAutomaticPurchaseStart,
  isPurchaseActive,
  projectedInventoryAtDelivery,
  suggestedPurchaseQuantity,
  type CommandCenterRuntimeState,
} from "./runtime.ts";

export type InventoryForecastRisk =
  | "critical"
  | "high"
  | "watch"
  | "covered";

export type InventoryForecastRow = {
  itemId: string;
  name: string;
  unit: string;
  current: number;
  incoming: number;
  dailyUse: number;
  leadDays: number;
  daysCover: number | null;
  projectedAtDelivery: number;
  projectedAtHorizon: number;
  recommendedQuantity: number;
  risk: InventoryForecastRisk;
  affectedRecipes: string[];
  affectedMenuItems: string[];
  activePurchaseId?: string;
  nextAction: string;
};

export type CommandCenterForecastSnapshot = {
  horizonDays: number;
  inventoryRows: InventoryForecastRow[];
  leadTimeRiskCount: number;
  horizonRiskCount: number;
  purchasePressureCount: number;
  protectedByIncomingCount: number;
  configuredDemandInputs: number;
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function forecastRisk(
  projectedAtDelivery: number,
  projectedAtHorizon: number,
  reorderAt: number,
  daysCover: number | null,
  leadDays: number,
): InventoryForecastRisk {
  if (
    projectedAtDelivery <= 0 ||
    (daysCover !== null && daysCover <= leadDays)
  ) {
    return "critical";
  }
  if (
    projectedAtDelivery <= reorderAt ||
    (daysCover !== null && daysCover <= 7)
  ) {
    return "high";
  }
  if (projectedAtHorizon <= reorderAt) {
    return "watch";
  }
  return "covered";
}

function riskValue(risk: InventoryForecastRisk) {
  if (risk === "critical") return 4;
  if (risk === "high") return 3;
  if (risk === "watch") return 2;
  return 1;
}

export function buildCommandCenterForecast(
  state: CommandCenterRuntimeState,
  horizonDays = 7,
): CommandCenterForecastSnapshot {
  const activePurchases = state.purchases.filter((purchase) =>
    isPurchaseActive(purchase.status),
  );

  const inventoryRows = state.inventory
    .map((item): InventoryForecastRow => {
      const dailyUse = Math.max(0, item.dailyUse ?? 0);
      const daysCover =
        dailyUse > 0
          ? round((item.current + item.incoming) / dailyUse)
          : null;
      const projectedAtDelivery = projectedInventoryAtDelivery(item);
      const projectedAtHorizon = Math.max(
        0,
        round(item.current + item.incoming - dailyUse * horizonDays),
      );
      const recommendedQuantity = suggestedPurchaseQuantity(item);
      const risk = forecastRisk(
        projectedAtDelivery,
        projectedAtHorizon,
        item.reorderAt,
        daysCover,
        item.leadDays,
      );
      const affectedRecipes = state.recipes
        .filter(
          (recipe) =>
            recipe.active &&
            Object.prototype.hasOwnProperty.call(recipe.ingredients, item.id),
        )
        .map((recipe) => recipe.name);
      const affectedRecipeIds = new Set(
        state.recipes
          .filter(
            (recipe) =>
              recipe.active &&
              Object.prototype.hasOwnProperty.call(recipe.ingredients, item.id),
          )
          .map((recipe) => recipe.id),
      );
      const affectedMenuItems = state.menuItems
        .filter(
          (menuItem) =>
            menuItem.active &&
            menuItem.recipeId !== undefined &&
            affectedRecipeIds.has(menuItem.recipeId),
        )
        .map((menuItem) => menuItem.name);
      const activePurchase = activePurchases.find(
        (purchase) => purchase.itemId === item.id,
      );
      const automaticStart = evaluateAutomaticPurchaseStart(item);

      let nextAction = "Monitor current stock.";
      if (activePurchase) {
        nextAction =
          `Track ${activePurchase.id}; confirmed/in-progress purchasing already protects this ingredient.`;
      } else if (recommendedQuantity > 0) {
        if (
          state.automationMasterOn &&
          item.automationEnabled &&
          item.automationMode !== "assist" &&
          automaticStart.allowed
        ) {
          nextAction =
            `Jourvis can start ${recommendedQuantity} ${item.unit} automatically when the configured trigger is reached.`;
        } else if (!automaticStart.allowed) {
          nextAction =
            `Owner review is required before supplier contact: ${automaticStart.reasons.join(" ")}`;
        } else if (!item.automationEnabled || item.automationMode === "assist") {
          nextAction =
            `Prepare ${recommendedQuantity} ${item.unit}; this item is not authorized for automatic purchasing.`;
        } else {
          nextAction =
            `Prepare ${recommendedQuantity} ${item.unit}; global autonomy is currently paused.`;
        }
      }

      return {
        itemId: item.id,
        name: item.name,
        unit: item.unit,
        current: item.current,
        incoming: item.incoming,
        dailyUse,
        leadDays: item.leadDays,
        daysCover,
        projectedAtDelivery,
        projectedAtHorizon,
        recommendedQuantity,
        risk,
        affectedRecipes,
        affectedMenuItems,
        activePurchaseId: activePurchase?.id,
        nextAction,
      };
    })
    .sort((a, b) => {
      const riskDifference = riskValue(b.risk) - riskValue(a.risk);
      if (riskDifference) return riskDifference;
      const aDays = a.daysCover ?? Number.POSITIVE_INFINITY;
      const bDays = b.daysCover ?? Number.POSITIVE_INFINITY;
      return aDays - bDays;
    });

  return {
    horizonDays,
    inventoryRows,
    leadTimeRiskCount: inventoryRows.filter(
      (row) => row.risk === "critical" || row.risk === "high",
    ).length,
    horizonRiskCount: inventoryRows.filter(
      (row) => row.risk !== "covered",
    ).length,
    purchasePressureCount: inventoryRows.filter(
      (row) => row.recommendedQuantity > 0,
    ).length,
    protectedByIncomingCount: state.inventory.filter(
      (item) => item.incoming > 0,
    ).length,
    configuredDemandInputs: state.inventory.filter(
      (item) => (item.dailyUse ?? 0) > 0,
    ).length,
  };
}
