import {
  isPurchaseActive,
  type CommandCenterRuntimeState,
} from "./runtime";

export type CommandCenterFinanceSnapshot = {
  openPurchaseCommitments: number;
  confirmedIncomingCommitments: number;
  receivedPurchaseSpend: number;
  configuredInventoryValue: number;
  pricedMappedMenuCount: number;
  averageMenuGrossProfit: number | null;
  averageMenuGrossMarginPercent: number | null;
};

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function purchaseValue(
  purchase: CommandCenterRuntimeState["purchases"][number],
) {
  return Math.max(
    0,
    purchase.quotedTotal ?? purchase.estimatedTotal ?? 0,
  );
}

export function buildCommandCenterFinance(
  state: CommandCenterRuntimeState,
): CommandCenterFinanceSnapshot {
  const openPurchases = state.purchases.filter((purchase) =>
    isPurchaseActive(purchase.status),
  );
  const confirmedStatuses = new Set([
    "confirmed",
    "in_transit",
    "partial_received",
  ]);

  const openPurchaseCommitments = money(
    openPurchases.reduce(
      (sum, purchase) => sum + purchaseValue(purchase),
      0,
    ),
  );
  const confirmedIncomingCommitments = money(
    openPurchases
      .filter((purchase) => confirmedStatuses.has(purchase.status))
      .reduce(
        (sum, purchase) => sum + purchaseValue(purchase),
        0,
      ),
  );
  const receivedPurchaseSpend = money(
    state.purchases
      .filter((purchase) => purchase.status === "received")
      .reduce(
        (sum, purchase) => sum + purchaseValue(purchase),
        0,
      ),
  );

  const configuredInventoryValue = money(
    state.inventory.reduce((sum, item) => {
      const unitCost =
        item.packPrice / Math.max(item.packSize, 0.01);
      return sum + item.current * unitCost;
    }, 0),
  );

  const activeRecipes = new Map(
    state.recipes
      .filter((recipe) => recipe.active)
      .map((recipe) => [recipe.id, recipe]),
  );
  const menuEconomics = state.menuItems.flatMap((menuItem) => {
    if (
      !menuItem.active ||
      !menuItem.recipeId ||
      menuItem.currentPrice === undefined ||
      menuItem.currentPrice <= 0
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
    const grossProfit = menuItem.currentPrice - ingredientCost;
    const grossMarginPercent =
      (grossProfit / menuItem.currentPrice) * 100;

    return [{ grossProfit, grossMarginPercent }];
  });

  return {
    openPurchaseCommitments,
    confirmedIncomingCommitments,
    receivedPurchaseSpend,
    configuredInventoryValue,
    pricedMappedMenuCount: menuEconomics.length,
    averageMenuGrossProfit: menuEconomics.length
      ? money(
          menuEconomics.reduce(
            (sum, item) => sum + item.grossProfit,
            0,
          ) / menuEconomics.length,
        )
      : null,
    averageMenuGrossMarginPercent: menuEconomics.length
      ? Math.round(
          (menuEconomics.reduce(
            (sum, item) => sum + item.grossMarginPercent,
            0,
          ) /
            menuEconomics.length) *
            10,
        ) / 10
      : null,
  };
}
