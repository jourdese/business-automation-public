import {
  initialIngredients,
  suppliers,
} from "@/lib/businesses/restaurant/marinara-ristorante/inventory-config";
import { marinaraOriginalMenu } from "@/lib/businesses/restaurant/marinara-ristorante/menu";
import { marinaraRistoranteBusiness } from "./marinara-ristorante";
import type { CommandCenterRuntimeState } from "../core/runtime";

const recipeIdByMenuItemId: Readonly<Record<string, string>> = {
  seafood_marinara_solo: "seafood-marinara",
  shrimp_mushroom_alfredo_solo: "shrimp-alfredo",
  quattro_formaggi_pizza_12: "quattro",
  grilled_salmon: "salmon",
};

const marinaraRecipes = [
  {
    id: "seafood-marinara",
    name: "Seafood Marinara",
    description: "Pasta, tomato sauce, shrimp, squid, basil and Parmigiano.",
    active: true,
    ingredients: {
      pasta: 0.18,
      tomato: 0.16,
      shrimp: 0.07,
      squid: 0.05,
      basil: 0.003,
      parmesan: 0.015,
      "olive-oil": 0.012,
    },
  },
  {
    id: "shrimp-alfredo",
    name: "Shrimp & Mushroom Alfredo",
    description: "Creamy pasta with shrimp, mushroom and Parmigiano.",
    active: true,
    ingredients: {
      pasta: 0.18,
      shrimp: 0.09,
      mushroom: 0.06,
      cream: 0.12,
      parmesan: 0.02,
      "olive-oil": 0.01,
    },
  },
  {
    id: "quattro",
    name: "Quattro Formaggi Pizza",
    description: "Pizza flour, mozzarella and Parmigiano.",
    active: true,
    ingredients: {
      flour: 0.24,
      mozzarella: 0.13,
      parmesan: 0.035,
      tomato: 0.08,
      basil: 0.002,
    },
  },
  {
    id: "salmon",
    name: "Grilled Salmon Fillet",
    description: "Salmon with olive oil, mushrooms and herbs.",
    active: true,
    ingredients: {
      salmon: 0.19,
      mushroom: 0.05,
      "olive-oil": 0.016,
      basil: 0.002,
    },
  },
] as const;

function demoRecipeIngredientCost(recipeId: string) {
  const recipe = marinaraRecipes.find((entry) => entry.id === recipeId);
  if (!recipe) return 0;
  return Math.round(
    Object.entries(recipe.ingredients).reduce((sum, [itemId, quantity]) => {
      const item = initialIngredients.find((entry) => entry.id === itemId);
      if (!item) return sum;
      return sum + (item.packPrice / Math.max(item.packSize, 0.01)) * quantity;
    }, 0) * 100,
  ) / 100;
}

function createDemoSales(demoNow: number) {
  const configs = [
    { menuItemId: "seafood_marinara_solo", base: 11, step: 3 },
    { menuItemId: "shrimp_mushroom_alfredo_solo", base: 8, step: 5 },
    { menuItemId: "quattro_formaggi_pizza_12", base: 9, step: 2 },
    { menuItemId: "grilled_salmon", base: 5, step: 4 },
  ];

  return Array.from({ length: 90 }, (_, daysAgo) =>
    configs.flatMap((config, itemIndex) => {
      const menuItem = marinaraOriginalMenu.find(
        (entry) => entry.key === config.menuItemId,
      );
      const recipeId = recipeIdByMenuItemId[config.menuItemId];
      if (!menuItem || !recipeId || menuItem.referencePriceCents === null) {
        return [];
      }

      const day = new Date(demoNow - daysAgo * 86_400_000);
      const weekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
      const quantity = Math.max(
        1,
        Math.round(
          (config.base + ((daysAgo * config.step + itemIndex) % 6)) *
            (weekend ? 1.18 : 1),
        ),
      );
      const unitPrice = menuItem.referencePriceCents / 100;
      const ingredientCostPerUnit = demoRecipeIngredientCost(recipeId);
      const revenue = Math.round(unitPrice * quantity * 100) / 100;
      const ingredientCost =
        Math.round(ingredientCostPerUnit * quantity * 100) / 100;
      const at = new Date(
        demoNow - daysAgo * 86_400_000 - itemIndex * 12 * 60_000,
      ).toISOString();

      return [{
        id: `SALE-DEMO-${daysAgo}-${itemIndex}`,
        at,
        menuItemId: menuItem.key,
        recipeId,
        itemName: menuItem.name,
        quantity,
        unitPrice,
        revenue,
        ingredientCostPerUnit,
        ingredientCost,
        ingredientContribution:
          Math.round((revenue - ingredientCost) * 100) / 100,
        priceSource: "reference_demo" as const,
        origin: "seeded_demo" as const,
      }];
    }),
  ).flat();
}

export function createMarinaraRuntimeSeed(): CommandCenterRuntimeState {
  const demoNow = Date.now();
  const demoAt = (minutesAgo: number) =>
    new Date(demoNow - minutesAgo * 60_000).toISOString();

  return {
    version: 2,
    business: marinaraRistoranteBusiness,
    automationMasterOn: false,
    inventory: initialIngredients.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      current:
        item.id === "tomato"
          ? 2.6
          : item.id === "parmesan"
            ? 2.8
            : item.id === "squid"
              ? 3
              : item.current,
      fullLevel: item.fullLevel,
      reorderAt: item.reorderAt,
      incoming: item.id === "tomato" ? 12 : item.incoming,
      supplierId: item.supplierId,
      contactId: item.contactId,
      packSize: item.packSize,
      packPrice: item.packPrice,
      purchaseUnit: item.purchaseUnit,
      leadDays: item.leadDays,
      dailyUse: item.dailyUse,
      zone: item.zone,
      purchasingMode: item.purchasingMode,
      automationEnabled: true,
      automationMode: "autobuy",
      automationTriggerPercent: item.automationTriggerPercent,
      targetPackPrice: item.targetPackPrice,
      autoAcceptPackPrice: item.autoAcceptPackPrice,
      hardMaxPackPrice: item.hardMaxPackPrice,
      maxAutoOrderQty: item.maxAutoOrderQty,
      maxAutoOrderSpend: item.maxAutoOrderSpend,
      autoNegotiate: item.autoNegotiate,
      maxCounteroffers: item.maxCounteroffers,
      maxDeliveryFee: item.maxDeliveryFee,
      maxLeadDays: item.maxLeadDays,
    })),
    purchases: [
      {
        id: "JV-DEMO-TOMATO",
        itemId: "tomato",
        supplierId: "casa-rosso",
        contactId: "lia",
        quantity: 12,
        status: "in_transit",
        estimatedTotal: 2940,
        etaDays: 1,
        buyerConfirmed: true,
        supplierConfirmed: true,
        createdAt: demoAt(18),
        origin: "jourvis",
        automationMode: "autobuy",
        explanation:
          "Jourvis automatically replenished Tomato sauce within the configured fixed-price authority. The supplier confirmed the order and it is now in transit.",
      },
      {
        id: "JV-DEMO-BASIL",
        itemId: "basil",
        supplierId: "green-basket",
        contactId: "mika",
        quantity: 2,
        status: "quote_requested",
        estimatedTotal: 820,
        counteroffersUsed: 0,
        buyerConfirmed: false,
        supplierConfirmed: false,
        createdAt: demoAt(3),
        origin: "jourvis",
        automationMode: "autobuy",
        explanation:
          "Jourvis automatically requested a supplier quote after Fresh basil crossed its configured stock trigger.",
      },
      {
        id: "JV-DEMO-SHRIMP",
        itemId: "shrimp",
        supplierId: "davao-seafood",
        contactId: "maria",
        quantity: 10,
        status: "quote_received",
        estimatedTotal: 5600,
        quotedPackPrice: 3250,
        quotedTotal: 6650,
        deliveryFee: 150,
        etaDays: 1,
        counteroffersUsed: 0,
        buyerConfirmed: false,
        supplierConfirmed: false,
        createdAt: demoAt(14),
        origin: "jourvis",
        automationMode: "autobuy",
        explanation:
          "The supplier quote exceeded Jourvis' configured hard pack-price limit, so Jourvis stopped before accepting or negotiating the purchase.",
      },
    ],
    suppliers: suppliers.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      contacts: supplier.contacts,
      itemIds: initialIngredients
        .filter((item) => item.supplierId === supplier.id)
        .map((item) => item.id),
    })),
    recipes: marinaraRecipes.map((recipe) => ({
      ...recipe,
      ingredients: { ...recipe.ingredients },
    })),
    menuItems: marinaraOriginalMenu.map((item) => ({
      id: item.key,
      name: item.name,
      printedName: item.printedName,
      dishKey: item.dishKey,
      category: item.category,
      variant: item.variant ?? undefined,
      description: item.description,
      currentPrice: undefined,
      referencePrice:
        item.referencePriceCents === null
          ? undefined
          : item.referencePriceCents / 100,
      referenceSource: "archived-menu-photo" as const,
      referencePublicationDate: item.sourcePublicationDate ?? undefined,
      currentPriceVerified: false,
      active: true,
      available: true,
      recipeId: recipeIdByMenuItemId[item.key],
    })),
    sales: createDemoSales(demoNow),
    pausedItemIds: [],
    activity: [
      {
        id: "activity-demo-basil-started",
        at: demoAt(2),
        module: "purchasing",
        action: "purchase_started",
        message: "Jourvis automatically started JV-DEMO-BASIL for Fresh basil.",
        actor: "jourvis",
        executionMode: "automatic",
        reason:
          "Fresh basil crossed its configured action trigger and the proposed purchase is inside Jourvis' automatic authority.",
        relatedEntityId: "basil",
        relatedRequestId: "JV-DEMO-BASIL",
      },
      {
        id: "activity-demo-tomato-transit",
        at: demoAt(4),
        module: "purchasing",
        action: "shipment_in_transit",
        message:
          "JV-DEMO-TOMATO: Casa Rosso Foods marked the Tomato sauce delivery in transit.",
        actor: "external",
        executionMode: "automatic",
        reason:
          "Jourvis recorded the supplier shipment after automatically accepting the fixed-price purchase within configured limits.",
        relatedEntityId: "tomato",
        relatedRequestId: "JV-DEMO-TOMATO",
      },
      {
        id: "activity-demo-shrimp-stopped",
        at: demoAt(9),
        module: "purchasing",
        action: "authority_escalation",
        message:
          "Jourvis stopped JV-DEMO-SHRIMP and sent the supplier quote to Decisions.",
        actor: "jourvis",
        executionMode: "automatic",
        reason:
          "The quoted pack price is ₱3,250, above the configured ₱3,100 hard maximum. Jourvis will not accept or negotiate beyond that authority.",
        relatedEntityId: "shrimp",
        relatedRequestId: "JV-DEMO-SHRIMP",
      },
      {
        id: "activity-demo-shrimp-quote",
        at: demoAt(10),
        module: "purchasing",
        action: "quote_received",
        message:
          "JV-DEMO-SHRIMP: Davao Fresh Seafood returned a quote for Shrimp.",
        actor: "external",
        executionMode: "automatic",
        reason:
          "Jourvis recorded the supplier terms before checking them against automatic purchasing authority.",
        relatedEntityId: "shrimp",
        relatedRequestId: "JV-DEMO-SHRIMP",
      },
      {
        id: "activity-demo-tomato-started",
        at: demoAt(18),
        module: "purchasing",
        action: "purchase_started",
        message:
          "Jourvis automatically started the Tomato sauce replenishment workflow.",
        actor: "jourvis",
        executionMode: "automatic",
        reason:
          "Tomato sauce crossed its configured action trigger and the fixed-price replenishment was inside Jourvis' purchasing authority.",
        relatedEntityId: "tomato",
        relatedRequestId: "JV-DEMO-TOMATO",
      },
    ],
    history: [],
  };
}
