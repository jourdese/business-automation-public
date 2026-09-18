import {
  initialIngredients,
  suppliers,
} from "@/app/restaurant/marinara-ristorante/Autoinventory-preview/inventory-config";
import { marinaraRistoranteBusiness } from "./marinara-ristorante";
import type { CommandCenterRuntimeState } from "../core/runtime";

export function createMarinaraRuntimeSeed(): CommandCenterRuntimeState {
  return {
    version: 1,
    business: marinaraRistoranteBusiness,
    automationMasterOn: true,
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
      purchasingMode: item.purchasingMode,
      automationEnabled: true,
      automationMode: "autobuy",
      automationTriggerPercent: item.automationTriggerPercent,
      maxAutoOrderSpend: item.maxAutoOrderSpend,
      autoAcceptPackPrice: item.autoAcceptPackPrice,
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
    pausedItemIds: [],
    activity: [
      {
        id: "seed-1",
        at: new Date(0).toISOString(),
        module: "system",
        message: "Command Center demo initialized for Marinara Ristorante.",
      },
    ],
  };
}
