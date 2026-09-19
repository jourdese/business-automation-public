import { buildCommandCenterForecast } from "./forecast-engine.ts";
import { buildCommandCenterHistoryTrend } from "./history-engine.ts";
import { buildCommandCenterMenuEconomics } from "./menu-economics.ts";
import {
  suggestedPurchaseQuantity,
  type CommandCenterPurchase,
  type CommandCenterRuntimeState,
  type JourvisRuntimeTask,
} from "./runtime.ts";

export type CommandCenterInsightSeverity =
  | "critical"
  | "high"
  | "attention"
  | "watch"
  | "protected"
  | "trend"
  | "clear";

export type CommandCenterInsightCalculation = {
  label: string;
  formula: string;
  substitution: string;
  result: string;
  meaning: string;
};

export type CommandCenterInsight = {
  id: string;
  severity: CommandCenterInsightSeverity;
  tag: string;
  title: string;
  summary: string;
  href?: string;
  calculations: CommandCenterInsightCalculation[];
  dataLimit?: string;
};

export type CommandCenterInsightMethod = {
  id: string;
  label: string;
  formula: string;
  status: "active" | "waiting_for_data";
  purpose: string;
  requires: string[];
};

export const commandCenterInsightMethods: CommandCenterInsightMethod[] = [
  {
    id: "days-cover",
    label: "Days of cover",
    formula: "(On hand + confirmed incoming) ÷ average daily use",
    status: "active",
    purpose: "Estimate how many days configured stock can support current usage.",
    requires: ["on-hand stock", "confirmed incoming", "average daily use"],
  },
  {
    id: "lead-time-demand",
    label: "Lead-time demand",
    formula: "Average daily use × supplier lead time",
    status: "active",
    purpose: "Estimate expected consumption before a new order can arrive.",
    requires: ["average daily use", "supplier lead time"],
  },
  {
    id: "demand-only-reorder-point",
    label: "Demand-only reorder point",
    formula: "Average daily use × supplier lead time",
    status: "active",
    purpose:
      "Provide the minimum reorder baseline before safety stock is added.",
    requires: ["average daily use", "supplier lead time"],
  },
  {
    id: "projected-delivery-stock",
    label: "Projected stock at supplier arrival",
    formula: "max(0, on hand + incoming − lead-time demand)",
    status: "active",
    purpose: "Show whether stock is expected to survive until replenishment arrives.",
    requires: ["on-hand stock", "incoming stock", "lead-time demand"],
  },
  {
    id: "projected-horizon-stock",
    label: "Projected horizon stock",
    formula: "max(0, on hand + incoming − average daily use × horizon days)",
    status: "active",
    purpose: "Estimate stock remaining at the end of the configured forecast horizon.",
    requires: ["on-hand stock", "incoming stock", "average daily use", "forecast horizon"],
  },
  {
    id: "reorder-quantity",
    label: "Pack-rounded reorder quantity",
    formula:
      "max(pack size, ceil((full level − projected arrival stock) ÷ pack size) × pack size)",
    status: "active",
    purpose: "Replenish toward the configured full level without ordering partial supplier packs.",
    requires: ["full level", "projected arrival stock", "supplier pack size"],
  },
  {
    id: "purchase-price-variance",
    label: "Purchase price variance vs configured target",
    formula: "(Quoted pack price − target pack price) × number of packs",
    status: "active",
    purpose: "Quantify how much a supplier quote differs from the configured target cost.",
    requires: ["quoted pack price", "target pack price", "purchase quantity", "pack size"],
  },
  {
    id: "food-cost-percent",
    label: "Menu food cost percentage",
    formula: "Recipe ingredient cost ÷ selling price × 100",
    status: "active",
    purpose: "Measure the share of a menu item's selling price consumed by configured ingredient cost.",
    requires: ["recipe quantities", "ingredient unit costs", "selling price"],
  },
  {
    id: "contribution-margin",
    label: "Menu contribution margin",
    formula: "Selling price − recipe ingredient cost",
    status: "active",
    purpose: "Estimate ingredient-only contribution per menu item sold.",
    requires: ["recipe ingredient cost", "selling price"],
  },
  {
    id: "gross-margin",
    label: "Ingredient-only gross margin",
    formula: "Contribution margin ÷ selling price × 100",
    status: "active",
    purpose: "Express ingredient-only contribution as a percentage of selling price.",
    requires: ["contribution margin", "selling price"],
  },
  {
    id: "observed-delta",
    label: "Observed runtime delta",
    formula: "Latest captured value − first captured value",
    status: "active",
    purpose: "Describe direction of travel only after multiple real runtime snapshots exist.",
    requires: ["at least two captured runtime snapshots"],
  },
  {
    id: "safety-stock",
    label: "Safety stock",
    formula:
      "(Maximum daily demand × maximum lead time) − (average daily demand × average lead time)",
    status: "waiting_for_data",
    purpose: "Protect against demand spikes and supplier lead-time variability.",
    requires: ["historical daily demand", "historical supplier lead times"],
  },
  {
    id: "full-reorder-point",
    label: "Full reorder point",
    formula: "Lead-time demand + safety stock",
    status: "waiting_for_data",
    purpose: "Set a statistically informed reorder trigger once a safety-stock estimate exists.",
    requires: ["lead-time demand", "safety stock"],
  },
  {
    id: "eoq",
    label: "Economic order quantity (EOQ)",
    formula: "sqrt((2 × annual demand × ordering cost) ÷ annual holding cost per unit)",
    status: "waiting_for_data",
    purpose: "Balance ordering frequency against inventory carrying cost.",
    requires: ["annual demand", "cost per order", "annual holding cost per unit"],
  },
  {
    id: "actual-vs-ideal-food-cost",
    label: "Actual vs ideal food-cost variance",
    formula: "Actual food cost % − theoretical recipe food cost %",
    status: "waiting_for_data",
    purpose: "Detect waste, overportioning, recipe drift, purchasing changes, or unrecorded usage.",
    requires: ["dated POS sales", "actual COGS", "theoretical recipe usage"],
  },
  {
    id: "menu-engineering",
    label: "Menu engineering classification",
    formula: "Popularity relative to average × contribution margin relative to average",
    status: "waiting_for_data",
    purpose: "Classify menu items by popularity and contribution margin.",
    requires: ["dated POS item counts", "menu contribution margins"],
  },
  {
    id: "forecast-error",
    label: "Forecast error / bias",
    formula: "Actual demand − forecast demand, summarized with MAE/MAD or WMAPE",
    status: "waiting_for_data",
    purpose: "Measure whether Jourvis systematically over- or under-forecasts demand.",
    requires: ["dated forecasts", "actual observed demand after each forecast horizon"],
  },
];

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function number(value: number, digits = 2) {
  return round(value, digits).toLocaleString("en-PH", {
    maximumFractionDigits: digits,
  });
}

function money(value: number) {
  return "₱" + Math.round(value).toLocaleString("en-PH");
}

function purchaseValue(purchase: CommandCenterPurchase) {
  return Math.max(0, purchase.quotedTotal ?? purchase.estimatedTotal ?? 0);
}

export function buildCommandCenterInsights(
  state: CommandCenterRuntimeState,
  tasks: JourvisRuntimeTask[],
): CommandCenterInsight[] {
  const insights: CommandCenterInsight[] = [];
  const forecast = buildCommandCenterForecast(state, 7);
  const historyTrend = buildCommandCenterHistoryTrend(state);
  const activeRecipeById = new Map(
    state.recipes
      .filter((recipe) => recipe.active)
      .map((recipe) => [recipe.id, recipe]),
  );

  const highestRisk = forecast.inventoryRows.find(
    (row) => row.risk === "critical" || row.risk === "high",
  );

  if (highestRisk) {
    const item = state.inventory.find((entry) => entry.id === highestRisk.itemId);
    if (item) {
      const leadTimeDemand = round(highestRisk.dailyUse * highestRisk.leadDays);
      const demandOnlyReorderPoint = leadTimeDemand;
      const reorderBuffer = round(item.reorderAt - demandOnlyReorderPoint);
      const recommendedQuantity = suggestedPurchaseQuantity(item);
      const matchingTask = tasks.find((task) => task.entityId === item.id);

      insights.push({
        id: `inventory-risk-${item.id}`,
        severity: highestRisk.risk === "critical" ? "critical" : "high",
        tag: `${highestRisk.risk.toUpperCase()} INVENTORY RISK`,
        title: `${item.name} is the clearest stock risk`,
        summary:
          `${highestRisk.daysCover === null ? "Days of cover cannot be calculated from the current inputs." : `About ${highestRisk.daysCover} days of cover remain.`} ` +
          `Projected stock at supplier arrival is ${highestRisk.projectedAtDelivery} ${item.unit}; the 7-day projection is ${highestRisk.projectedAtHorizon} ${item.unit}.` +
          (matchingTask
            ? ` Jourvis is currently stopped for owner authority: ${matchingTask.why}`
            : highestRisk.activePurchaseId
              ? ` Replenishment ${highestRisk.activePurchaseId} is already active.`
              : ""),
        href: `/command-center/${state.business.id}/forecast`,
        calculations: [
          {
            label: "Days of cover",
            formula: "(On hand + incoming) ÷ average daily use",
            substitution:
              `(${number(item.current)} + ${number(item.incoming)}) ÷ ${number(highestRisk.dailyUse)}`,
            result:
              highestRisk.daysCover === null
                ? "Not available"
                : `${number(highestRisk.daysCover)} days`,
            meaning: "Estimated time before configured stock is consumed at the current daily-use input.",
          },
          {
            label: "Lead-time demand",
            formula: "Average daily use × supplier lead time",
            substitution:
              `${number(highestRisk.dailyUse)} × ${number(highestRisk.leadDays)}`,
            result: `${number(leadTimeDemand)} ${item.unit}`,
            meaning: "Expected consumption while waiting for the supplier.",
          },
          {
            label: "Demand-only reorder baseline",
            formula: "Average daily use × supplier lead time",
            substitution:
              `${number(highestRisk.dailyUse)} × ${number(highestRisk.leadDays)}`,
            result: `${number(demandOnlyReorderPoint)} ${item.unit}`,
            meaning:
              `Configured reorder level is ${number(item.reorderAt)} ${item.unit}, a ${number(reorderBuffer)} ${item.unit} buffer versus the demand-only baseline.`,
          },
          {
            label: "Projected stock at supplier arrival",
            formula: "max(0, on hand + incoming − lead-time demand)",
            substitution:
              `max(0, ${number(item.current)} + ${number(item.incoming)} − ${number(leadTimeDemand)})`,
            result: `${number(highestRisk.projectedAtDelivery)} ${item.unit}`,
            meaning: "Expected stock when a new supplier order could arrive.",
          },
          {
            label: "7-day projected stock",
            formula: "max(0, on hand + incoming − daily use × 7)",
            substitution:
              `max(0, ${number(item.current)} + ${number(item.incoming)} − ${number(highestRisk.dailyUse)} × 7)`,
            result: `${number(highestRisk.projectedAtHorizon)} ${item.unit}`,
            meaning: "Expected stock at the end of the current seven-day operating horizon.",
          },
          {
            label: "Recommended replenishment",
            formula:
              "max(pack size, ceil((full level − projected arrival stock) ÷ pack size) × pack size)",
            substitution:
              `max(${number(item.packSize)}, ceil((${number(item.fullLevel)} − ${number(highestRisk.projectedAtDelivery)}) ÷ ${number(item.packSize)}) × ${number(item.packSize)})`,
            result: `${number(recommendedQuantity)} ${item.unit}`,
            meaning: "Pack-rounded quantity needed to replenish toward the configured full level.",
          },
        ],
        dataLimit:
          "Safety stock is not estimated yet because the demo does not have enough historical daily-demand and supplier lead-time variability. Until that exists, Jourvis shows the demand-only reorder baseline instead of pretending a safety-stock value.",
      });
    }
  }

  const quoteCandidates = state.purchases
    .flatMap((purchase) => {
      if (purchase.quotedPackPrice === undefined) return [];
      const item = state.inventory.find((entry) => entry.id === purchase.itemId);
      if (!item) return [];
      const packs = Math.ceil(
        purchase.quantity / Math.max(item.packSize, 0.01),
      );
      const variancePerPack = purchase.quotedPackPrice - item.targetPackPrice;
      const totalVariance = variancePerPack * packs;
      const hardMaxGap = purchase.quotedPackPrice - item.hardMaxPackPrice;
      return [{ purchase, item, packs, variancePerPack, totalVariance, hardMaxGap }];
    })
    .filter(({ totalVariance, hardMaxGap }) => totalVariance > 0 || hardMaxGap > 0)
    .sort(
      (left, right) =>
        Math.max(right.hardMaxGap, right.totalVariance) -
        Math.max(left.hardMaxGap, left.totalVariance),
    );

  const quotePressure = quoteCandidates[0];
  if (quotePressure) {
    const { purchase, item, packs, variancePerPack, totalVariance, hardMaxGap } =
      quotePressure;
    const matchingTask = tasks.find((task) => task.requestId === purchase.id);
    const hardMaxPercent =
      item.hardMaxPackPrice > 0
        ? round((hardMaxGap / item.hardMaxPackPrice) * 100, 1)
        : 0;

    insights.push({
      id: `purchase-price-${purchase.id}`,
      severity:
        hardMaxGap > 0
          ? "high"
          : purchase.quotedPackPrice! > item.autoAcceptPackPrice
            ? "attention"
            : "watch",
      tag: hardMaxGap > 0 ? "PRICE AUTHORITY" : "PURCHASE PRICE VARIANCE",
      title: `${item.name} supplier quote is above the configured target`,
      summary:
        `The quote is ${money(totalVariance)} above the configured target across ${packs} supplier pack${packs === 1 ? "" : "s"}.` +
        (hardMaxGap > 0
          ? ` The quoted pack price is ${money(hardMaxGap)} (${number(hardMaxPercent, 1)}%) above the hard pack-price ceiling.`
          : "") +
        (matchingTask
          ? ` Jourvis stopped instead of exceeding authority: ${matchingTask.whyOwnerIsNeeded ?? matchingTask.why}`
          : ""),
      href: `/command-center/${state.business.id}/operations/purchasing`,
      calculations: [
        {
          label: "Purchase price variance vs target",
          formula:
            "(Quoted pack price − configured target pack price) × number of packs",
          substitution:
            `(${money(purchase.quotedPackPrice!)} − ${money(item.targetPackPrice)}) × ${packs}`,
          result: money(totalVariance),
          meaning:
            variancePerPack >= 0
              ? `${money(variancePerPack)} extra per supplier pack versus the configured target.`
              : `${money(Math.abs(variancePerPack))} below target per supplier pack.`,
        },
        {
          label: "Hard-ceiling variance",
          formula:
            "(Quoted pack price − hard maximum pack price) ÷ hard maximum pack price × 100",
          substitution:
            `(${money(purchase.quotedPackPrice!)} − ${money(item.hardMaxPackPrice)}) ÷ ${money(item.hardMaxPackPrice)} × 100`,
          result:
            hardMaxGap > 0
              ? `+${number(hardMaxPercent, 1)}%`
              : `${number(hardMaxPercent, 1)}%`,
          meaning:
            hardMaxGap > 0
              ? "The quote exceeds the owner's absolute automatic purchasing ceiling."
              : "The quote remains inside the hard pack-price ceiling.",
        },
        {
          label: "Quoted purchase value",
          formula: "Quoted total when available; otherwise estimated purchase total",
          substitution:
            purchase.quotedTotal !== undefined
              ? money(purchase.quotedTotal)
              : money(purchase.estimatedTotal),
          result: money(purchaseValue(purchase)),
          meaning: "Current configured monetary exposure for this supplier request.",
        },
      ],
    });
  }

  const incomingProtection = forecast.inventoryRows.find(
    (row) => row.incoming > 0 && row.activePurchaseId,
  );
  if (incomingProtection) {
    const item = state.inventory.find(
      (entry) => entry.id === incomingProtection.itemId,
    );
    if (item) {
      const withoutIncoming = Math.max(
        0,
        round(item.current - incomingProtection.dailyUse * 7),
      );
      const protectionValue = round(
        incomingProtection.projectedAtHorizon - withoutIncoming,
      );

      insights.push({
        id: `incoming-protection-${item.id}`,
        severity: "protected",
        tag: "INCOMING PROTECTION",
        title: `${item.name} is being protected by confirmed incoming stock`,
        summary:
          `${number(item.incoming)} ${item.unit} is confirmed incoming under ${incomingProtection.activePurchaseId}. ` +
          `That improves the seven-day stock projection by ${number(protectionValue)} ${item.unit}, while remaining separate from on-hand inventory until physical receiving.`,
        href: `/command-center/${state.business.id}/operations/inventory`,
        calculations: [
          {
            label: "7-day projection without incoming",
            formula: "max(0, on hand − daily use × 7)",
            substitution:
              `max(0, ${number(item.current)} − ${number(incomingProtection.dailyUse)} × 7)`,
            result: `${number(withoutIncoming)} ${item.unit}`,
            meaning: "Expected position if the confirmed incoming quantity did not exist.",
          },
          {
            label: "7-day projection with incoming",
            formula: "max(0, on hand + incoming − daily use × 7)",
            substitution:
              `max(0, ${number(item.current)} + ${number(item.incoming)} − ${number(incomingProtection.dailyUse)} × 7)`,
            result: `${number(incomingProtection.projectedAtHorizon)} ${item.unit}`,
            meaning: "Expected position including confirmed incoming stock.",
          },
          {
            label: "Protection contribution",
            formula: "Projection with incoming − projection without incoming",
            substitution:
              `${number(incomingProtection.projectedAtHorizon)} − ${number(withoutIncoming)}`,
            result: `${number(protectionValue)} ${item.unit}`,
            meaning: "How much the confirmed incoming quantity improves the seven-day projection.",
          },
        ],
      });
    }
  }

  const menuPressure = state.menuItems
    .flatMap((menuItem) => {
      if (
        !menuItem.active ||
        menuItem.currentPrice === undefined ||
        menuItem.currentPrice <= 0 ||
        !menuItem.recipeId
      ) {
        return [];
      }
      const recipe = activeRecipeById.get(menuItem.recipeId);
      if (!recipe) return [];
      const economics = buildCommandCenterMenuEconomics(
        menuItem,
        recipe,
        state.inventory,
      );
      return economics.warning === "none"
        ? []
        : [{ menuItem, recipe, economics }];
    })
    .sort(
      (left, right) =>
        (right.economics.foodCostPercent ?? 0) -
        (left.economics.foodCostPercent ?? 0),
    )[0];

  if (menuPressure) {
    const { menuItem, economics } = menuPressure;
    insights.push({
      id: `menu-cost-${menuItem.id}`,
      severity: economics.warning === "high" ? "high" : "watch",
      tag: "MENU ECONOMICS",
      title: `${menuItem.name} is under ingredient-cost pressure`,
      summary:
        `Configured recipe cost is ${money(economics.ingredientCost ?? 0)} against a selling price of ${money(menuItem.currentPrice ?? 0)}, ` +
        `for a ${number(economics.foodCostPercent ?? 0, 1)}% ingredient-only food cost and ${money(economics.grossProfit ?? 0)} contribution per sale before labor and overhead.`,
      href: `/command-center/${state.business.id}/operations/menu`,
      calculations: [
        {
          label: "Recipe ingredient cost",
          formula: "Σ((pack price ÷ pack size) × recipe quantity)",
          substitution: "Sum of configured ingredient unit costs × recipe quantities",
          result: money(economics.ingredientCost ?? 0),
          meaning: "Theoretical ingredient cost for one configured serving.",
        },
        {
          label: "Food cost percentage",
          formula: "Recipe ingredient cost ÷ selling price × 100",
          substitution:
            `${money(economics.ingredientCost ?? 0)} ÷ ${money(menuItem.currentPrice ?? 0)} × 100`,
          result: `${number(economics.foodCostPercent ?? 0, 1)}%`,
          meaning: "Share of the menu price consumed by configured ingredients.",
        },
        {
          label: "Contribution margin",
          formula: "Selling price − recipe ingredient cost",
          substitution:
            `${money(menuItem.currentPrice ?? 0)} − ${money(economics.ingredientCost ?? 0)}`,
          result: money(economics.grossProfit ?? 0),
          meaning: "Ingredient-only contribution per sale before labor, overhead, tax, discounts, and waste.",
        },
        {
          label: "Ingredient-only gross margin",
          formula: "Contribution margin ÷ selling price × 100",
          substitution:
            `${money(economics.grossProfit ?? 0)} ÷ ${money(menuItem.currentPrice ?? 0)} × 100`,
          result: `${number(economics.grossMarginPercent ?? 0, 1)}%`,
          meaning: "Contribution expressed as a percentage of the configured selling price.",
        },
      ],
      dataLimit:
        "This is ingredient-only economics. Labor, overhead, tax, discounts, voids, waste, and actual POS sales are not included until those providers/data sources exist.",
    });
  }

  const meaningfulTrend =
    historyTrend.snapshotCount >= 2 &&
    (
      (historyTrend.inventoryReadinessDelta ?? 0) !== 0 ||
      (historyTrend.inventoryRiskDelta ?? 0) !== 0 ||
      (historyTrend.ownerExceptionDelta ?? 0) !== 0
    );

  if (meaningfulTrend) {
    insights.push({
      id: "observed-runtime-trend",
      severity: "trend",
      tag: "OBSERVED HISTORY",
      title: "The captured operating state has materially moved",
      summary:
        `Across ${historyTrend.snapshotCount} captured states, inventory readiness changed ${number(historyTrend.inventoryReadinessDelta ?? 0, 1)} points, ` +
        `7-day inventory risk changed ${number(historyTrend.inventoryRiskDelta ?? 0)}, and owner exceptions changed ${number(historyTrend.ownerExceptionDelta ?? 0)}.`,
      href: `/command-center/${state.business.id}/performance`,
      calculations: [
        {
          label: "Inventory readiness change",
          formula: "Latest captured readiness − first captured readiness",
          substitution: "latest − first",
          result: `${number(historyTrend.inventoryReadinessDelta ?? 0, 1)} points`,
          meaning: "Observed direction of change across captured runtime states.",
        },
        {
          label: "7-day inventory risk change",
          formula: "Latest risk count − first risk count",
          substitution: "latest − first",
          result: number(historyTrend.inventoryRiskDelta ?? 0),
          meaning: "Change in the number of ingredients in a forecast risk state.",
        },
        {
          label: "Owner exception change",
          formula: "Latest owner exceptions − first owner exceptions",
          substitution: "latest − first",
          result: number(historyTrend.ownerExceptionDelta ?? 0),
          meaning: "Change in workflows requiring human authority.",
        },
      ],
      dataLimit:
        "This is observed browser-runtime history, not a claimed weekly/monthly business trend.",
    });
  }

  return insights;
}
