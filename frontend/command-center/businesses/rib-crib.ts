import type { CommandCenterBusiness } from "../core/types";
import {
  restaurantCapabilities,
  restaurantOperationModules,
} from "../industries/restaurant";

export const ribCribBusiness: CommandCenterBusiness = {
  id: "rib-crib",
  name: "The Rib Crib",
  shortName: "Rib Crib",
  industry: "restaurant",
  currency: "PHP",
  timezone: "Asia/Manila",
  operations: [...restaurantOperationModules],
  capabilities: [...restaurantCapabilities],
  demoMetrics: [
    { label: "Revenue today", value: "₱61,800", change: "+4.2%", note: "illustrative" },
    { label: "Est. operating profit", value: "₱13,900", change: "+1.8%", note: "illustrative" },
    { label: "Jourvis working", value: "3", note: "automations in progress" },
    { label: "Needs owner", value: "1", note: "exceptions only" },
  ],
};
