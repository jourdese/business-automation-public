import type { CommandCenterBusiness } from "../core/types";
import {
  restaurantCapabilities,
  restaurantOperationModules,
} from "../industries/restaurant";

export const marinaraRistoranteBusiness: CommandCenterBusiness = {
  id: "marinara-ristorante",
  name: "Marinara Ristorante",
  shortName: "Marinara",
  industry: "restaurant",
  currency: "PHP",
  timezone: "Asia/Manila",
  operations: [...restaurantOperationModules],
  capabilities: [
    ...restaurantCapabilities,
    "inventory-automation",
    "supplier-procurement",
  ],
  demoMetrics: [
    { label: "Revenue today", value: "₱84,240", change: "+7.4%", note: "demo seed" },
    { label: "Est. operating profit", value: "₱18,320", change: "-2.1%", note: "demo seed" },
    { label: "Jourvis working", value: "4", note: "automations in progress" },
    { label: "Needs owner", value: "2", note: "exceptions only" },
  ],
};
