import type {
  CommandCenterInventoryItem,
  CommandCenterMenuItem,
  CommandCenterRecipe,
} from "./runtime.ts";

export type CommandCenterMenuEconomics = {
  ingredientCost: number | null;
  possibleServings: number | null;
  foodCostPercent: number | null;
  grossProfit: number | null;
  grossMarginPercent: number | null;
  referencePriceDelta: number | null;
  referencePriceDeltaPercent: number | null;
  costDriftSinceRecipeSavePercent: number | null;
  riskyIngredientIds: string[];
  warning: "none" | "watch" | "high";
};

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function recipeIngredientCost(
  recipe: CommandCenterRecipe,
  inventory: CommandCenterInventoryItem[],
) {
  return round(
    Object.entries(recipe.ingredients).reduce(
      (sum, [itemId, amount]) => {
        const item = inventory.find((entry) => entry.id === itemId);
        if (!item) return sum;
        return (
          sum +
          (item.packPrice / Math.max(item.packSize, 0.01)) * amount
        );
      },
      0,
    ),
  );
}

export function recipePossibleServings(
  recipe: CommandCenterRecipe,
  inventory: CommandCenterInventoryItem[],
) {
  const servings = Object.entries(recipe.ingredients).flatMap(
    ([itemId, amount]) => {
      const item = inventory.find((entry) => entry.id === itemId);
      if (!item || amount <= 0) return [];
      return [Math.floor(item.current / amount)];
    },
  );
  return servings.length ? Math.min(...servings) : null;
}

export function buildCommandCenterMenuEconomics(
  menuItem: CommandCenterMenuItem,
  recipe: CommandCenterRecipe | undefined,
  inventory: CommandCenterInventoryItem[],
  warningThresholdPercent = 35,
): CommandCenterMenuEconomics {
  if (!recipe) {
    return {
      ingredientCost: null,
      possibleServings: null,
      foodCostPercent: null,
      grossProfit: null,
      grossMarginPercent: null,
      referencePriceDelta:
        menuItem.currentPrice !== undefined &&
        menuItem.referencePrice !== undefined
          ? round(menuItem.currentPrice - menuItem.referencePrice)
          : null,
      referencePriceDeltaPercent:
        menuItem.currentPrice !== undefined &&
        menuItem.referencePrice !== undefined &&
        menuItem.referencePrice > 0
          ? round(
              ((menuItem.currentPrice - menuItem.referencePrice) /
                menuItem.referencePrice) *
                100,
              1,
            )
          : null,
      costDriftSinceRecipeSavePercent: null,
      riskyIngredientIds: [],
      warning: "none",
    };
  }

  const ingredientCost = recipeIngredientCost(recipe, inventory);
  const possibleServings = recipePossibleServings(recipe, inventory);
  const foodCostPercent =
    menuItem.currentPrice !== undefined && menuItem.currentPrice > 0
      ? round((ingredientCost / menuItem.currentPrice) * 100, 1)
      : null;
  const grossProfit =
    menuItem.currentPrice !== undefined
      ? round(menuItem.currentPrice - ingredientCost)
      : null;
  const grossMarginPercent =
    grossProfit !== null &&
    menuItem.currentPrice !== undefined &&
    menuItem.currentPrice > 0
      ? round((grossProfit / menuItem.currentPrice) * 100, 1)
      : null;
  const referencePriceDelta =
    menuItem.currentPrice !== undefined &&
    menuItem.referencePrice !== undefined
      ? round(menuItem.currentPrice - menuItem.referencePrice)
      : null;
  const referencePriceDeltaPercent =
    referencePriceDelta !== null &&
    menuItem.referencePrice !== undefined &&
    menuItem.referencePrice > 0
      ? round((referencePriceDelta / menuItem.referencePrice) * 100, 1)
      : null;
  const costDriftSinceRecipeSavePercent =
    recipe.savedIngredientCost !== undefined &&
    recipe.savedIngredientCost > 0
      ? round(
          ((ingredientCost - recipe.savedIngredientCost) /
            recipe.savedIngredientCost) *
            100,
          1,
        )
      : null;
  const riskyIngredientIds = Object.keys(recipe.ingredients).filter(
    (itemId) => {
      const item = inventory.find((entry) => entry.id === itemId);
      return item ? item.current <= item.reorderAt : false;
    },
  );

  const warning =
    foodCostPercent === null
      ? "none"
      : foodCostPercent >= warningThresholdPercent
        ? "high"
        : foodCostPercent >= warningThresholdPercent - 5
          ? "watch"
          : "none";

  return {
    ingredientCost,
    possibleServings,
    foodCostPercent,
    grossProfit,
    grossMarginPercent,
    referencePriceDelta,
    referencePriceDeltaPercent,
    costDriftSinceRecipeSavePercent,
    riskyIngredientIds,
    warning,
  };
}
