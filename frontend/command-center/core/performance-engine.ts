import { buildCommandCenterForecast } from "./forecast-engine";
import {
  inventoryPercent,
  isPurchaseActive,
  type CommandCenterRuntimeState,
} from "./runtime";

export type CommandCenterPerformanceSnapshot = {
  inventoryReadinessPercent: number | null;
  inventoryRiskCount: number;
  activeWorkflowCount: number;
  ownerExceptionCount: number;
  automationSharePercent: number | null;
  automaticActivityCount: number;
  manualActivityCount: number;
  activeMenuItemCount: number;
  recipeMappedMenuCount: number;
  recipeCoveragePercent: number | null;
  pricedMappedMenuCount: number;
  averageFoodCostPercent: number | null;
  receivedPurchaseCount: number;
  closedPurchaseCount: number;
  purchaseCompletionPercent: number | null;
};

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 100);
}

export function buildCommandCenterPerformance(
  state: CommandCenterRuntimeState,
  ownerExceptionCount: number,
): CommandCenterPerformanceSnapshot {
  const inventoryReadinessPercent = state.inventory.length
    ? Math.round(
        state.inventory.reduce(
          (sum, item) => sum + inventoryPercent(item),
          0,
        ) / state.inventory.length,
      )
    : null;
  const forecast = buildCommandCenterForecast(state, 7);
  const activeWorkflowCount = state.purchases.filter((purchase) =>
    isPurchaseActive(purchase.status),
  ).length;
  const automaticActivityCount = state.activity.filter(
    (entry) => entry.executionMode === "automatic",
  ).length;
  const manualActivityCount = state.activity.filter(
    (entry) => entry.executionMode === "manual",
  ).length;
  const automationSharePercent = percent(
    automaticActivityCount,
    automaticActivityCount + manualActivityCount,
  );

  const activeRecipes = new Map(
    state.recipes
      .filter((recipe) => recipe.active)
      .map((recipe) => [recipe.id, recipe]),
  );
  const activeMenuItems = state.menuItems.filter((item) => item.active);
  const recipeMappedMenuItems = activeMenuItems.filter(
    (item) => item.recipeId && activeRecipes.has(item.recipeId),
  );
  const recipeCoveragePercent = percent(
    recipeMappedMenuItems.length,
    activeMenuItems.length,
  );

  const foodCostPercentages = recipeMappedMenuItems.flatMap((menuItem) => {
    if (
      menuItem.currentPrice === undefined ||
      menuItem.currentPrice <= 0 ||
      !menuItem.recipeId
    ) {
      return [];
    }
    const recipe = activeRecipes.get(menuItem.recipeId);
    if (!recipe) return [];

    const ingredientCost = Object.entries(recipe.ingredients).reduce(
      (sum, [itemId, amount]) => {
        const item = state.inventory.find((entry) => entry.id === itemId);
        if (!item) return sum;
        return (
          sum +
          (item.packPrice / Math.max(item.packSize, 0.01)) * amount
        );
      },
      0,
    );

    return [(ingredientCost / menuItem.currentPrice) * 100];
  });

  const receivedPurchaseCount = state.purchases.filter(
    (purchase) => purchase.status === "received",
  ).length;
  const closedPurchaseCount = state.purchases.filter(
    (purchase) =>
      purchase.status === "received" || purchase.status === "rejected",
  ).length;

  return {
    inventoryReadinessPercent,
    inventoryRiskCount: forecast.horizonRiskCount,
    activeWorkflowCount,
    ownerExceptionCount,
    automationSharePercent,
    automaticActivityCount,
    manualActivityCount,
    activeMenuItemCount: activeMenuItems.length,
    recipeMappedMenuCount: recipeMappedMenuItems.length,
    recipeCoveragePercent,
    pricedMappedMenuCount: foodCostPercentages.length,
    averageFoodCostPercent: foodCostPercentages.length
      ? Math.round(
          (foodCostPercentages.reduce((sum, value) => sum + value, 0) /
            foodCostPercentages.length) *
            10,
        ) / 10
      : null,
    receivedPurchaseCount,
    closedPurchaseCount,
    purchaseCompletionPercent: percent(
      receivedPurchaseCount,
      closedPurchaseCount,
    ),
  };
}
