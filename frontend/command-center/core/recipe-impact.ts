import { recipeIngredientCost, recipePossibleServings } from "./menu-economics.ts";
import type {
  CommandCenterInventoryItem,
  CommandCenterMenuItem,
  CommandCenterRecipe,
} from "./runtime.ts";

export type RecipeIngredientImpact = {
  itemId: string;
  name: string;
  unit: string;
  beforeAmount: number;
  afterAmount: number;
  quantityChangePercent: number | null;
  configuredDailyUse: number | null;
  modeledDailyUseAfter: number | null;
  dailyUseChangePercent: number | null;
  stockoutDaysBefore: number | null;
  stockoutDaysAfter: number | null;
  stockoutDaysDelta: number | null;
};

export type CommandCenterRecipeImpact = {
  beforeCost: number;
  afterCost: number;
  costChange: number;
  costChangePercent: number | null;
  beforeServings: number | null;
  afterServings: number | null;
  averageLinkedFoodCostBefore: number | null;
  averageLinkedFoodCostAfter: number | null;
  ingredientChanges: RecipeIngredientImpact[];
};

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]) {
  if (!values.length) return null;
  return round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
    1,
  );
}

export function buildCommandCenterRecipeImpact(
  existing: CommandCenterRecipe | undefined,
  draftIngredients: Record<string, number>,
  inventory: CommandCenterInventoryItem[],
  linkedMenuItems: CommandCenterMenuItem[],
): CommandCenterRecipeImpact {
  const beforeRecipe: CommandCenterRecipe = existing ?? {
    id: "draft-before",
    name: "Draft",
    description: "",
    active: true,
    ingredients: {},
  };
  const afterRecipe: CommandCenterRecipe = {
    ...beforeRecipe,
    id: existing?.id ?? "draft-after",
    ingredients: draftIngredients,
  };

  const beforeCost = recipeIngredientCost(beforeRecipe, inventory);
  const afterCost = recipeIngredientCost(afterRecipe, inventory);
  const beforeServings = recipePossibleServings(beforeRecipe, inventory);
  const afterServings = recipePossibleServings(afterRecipe, inventory);

  const pricedMenuItems = linkedMenuItems.filter(
    (item) => item.currentPrice !== undefined && item.currentPrice > 0,
  );
  const beforeFoodCosts = pricedMenuItems.map(
    (item) => (beforeCost / Math.max(item.currentPrice ?? 0, 0.01)) * 100,
  );
  const afterFoodCosts = pricedMenuItems.map(
    (item) => (afterCost / Math.max(item.currentPrice ?? 0, 0.01)) * 100,
  );

  const itemIds = new Set([
    ...Object.keys(beforeRecipe.ingredients),
    ...Object.keys(draftIngredients),
  ]);
  const ingredientChanges = Array.from(itemIds).flatMap(
    (itemId): RecipeIngredientImpact[] => {
      const beforeAmount = beforeRecipe.ingredients[itemId] ?? 0;
      const afterAmount = draftIngredients[itemId] ?? 0;
      if (beforeAmount === afterAmount) return [];
      const item = inventory.find((entry) => entry.id === itemId);
      if (!item) return [];

      const quantityChangePercent =
        beforeAmount > 0
          ? round(((afterAmount - beforeAmount) / beforeAmount) * 100, 1)
          : null;
      const configuredDailyUse =
        item.dailyUse !== undefined && item.dailyUse > 0
          ? item.dailyUse
          : null;
      const modeledDailyUseAfter =
        configuredDailyUse !== null && beforeAmount > 0
          ? round(configuredDailyUse * (afterAmount / beforeAmount), 3)
          : configuredDailyUse !== null && afterAmount > 0
            ? configuredDailyUse
            : null;
      const dailyUseChangePercent =
        configuredDailyUse !== null &&
        modeledDailyUseAfter !== null &&
        configuredDailyUse > 0
          ? round(
              ((modeledDailyUseAfter - configuredDailyUse) /
                configuredDailyUse) *
                100,
              1,
            )
          : null;
      const stockoutDaysBefore =
        configuredDailyUse !== null
          ? round(item.current / configuredDailyUse, 1)
          : null;
      const stockoutDaysAfter =
        modeledDailyUseAfter !== null && modeledDailyUseAfter > 0
          ? round(item.current / modeledDailyUseAfter, 1)
          : null;
      const stockoutDaysDelta =
        stockoutDaysBefore !== null && stockoutDaysAfter !== null
          ? round(stockoutDaysAfter - stockoutDaysBefore, 1)
          : null;

      return [{
        itemId,
        name: item.name,
        unit: item.unit,
        beforeAmount,
        afterAmount,
        quantityChangePercent,
        configuredDailyUse,
        modeledDailyUseAfter,
        dailyUseChangePercent,
        stockoutDaysBefore,
        stockoutDaysAfter,
        stockoutDaysDelta,
      }];
    },
  );

  return {
    beforeCost,
    afterCost,
    costChange: round(afterCost - beforeCost),
    costChangePercent:
      beforeCost > 0
        ? round(((afterCost - beforeCost) / beforeCost) * 100, 1)
        : null,
    beforeServings,
    afterServings,
    averageLinkedFoodCostBefore: average(beforeFoodCosts),
    averageLinkedFoodCostAfter: average(afterFoodCosts),
    ingredientChanges,
  };
}
