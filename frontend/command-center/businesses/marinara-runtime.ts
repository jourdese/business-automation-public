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

export function createMarinaraRuntimeSeed(): CommandCenterRuntimeState {
  return {
    version: 1,
    business: marinaraRistoranteBusiness,
    automationMasterOn: false,
    inventory: initialIngredients.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      current: item.current,
      fullLevel: item.fullLevel,
      reorderAt: item.reorderAt,
      incoming: item.incoming,
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
    purchases: [],
    suppliers: suppliers.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      contacts: supplier.contacts,
      itemIds: initialIngredients
        .filter((item) => item.supplierId === supplier.id)
        .map((item) => item.id),
    })),
    recipes: [
      {
        id: "seafood-marinara",
        name: "Seafood Marinara",
        description: "Pasta, tomato sauce, shrimp, squid, basil and Parmigiano.",
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
        ingredients: {
          salmon: 0.19,
          mushroom: 0.05,
          "olive-oil": 0.016,
          basil: 0.002,
        },
      },
    ],
    menuItems: marinaraOriginalMenu.map((item) => ({
      id: item.key,
      name: item.name,
      printedName: item.printedName,
      dishKey: item.dishKey,
      category: item.category,
      variant: item.variant ?? undefined,
      referencePrice:
        item.referencePriceCents === null
          ? undefined
          : item.referencePriceCents / 100,
      referenceSource: "archived-menu-photo" as const,
      referencePublicationDate: item.sourcePublicationDate ?? undefined,
      currentPriceVerified: false,
      recipeId: recipeIdByMenuItemId[item.key],
    })),
    pausedItemIds: [],
    activity: [],
  };
}
