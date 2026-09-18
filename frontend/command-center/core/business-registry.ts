import type { CommandCenterBusiness } from "./types";
import { marinaraRistoranteBusiness } from "../businesses/marinara-ristorante";
import { ribCribBusiness } from "../businesses/rib-crib";

const sharedCapabilities = [
  "forecast",
  "performance",
  "finance",
  "briefings",
  "insights",
  "decisions",
];

const businesses: CommandCenterBusiness[] = [
  marinaraRistoranteBusiness,
  ribCribBusiness,
];

export const operationCatalog: Record<string, { label: string; description: string }> = {
  inventory: { label: "Inventory", description: "Stock, usage, adjustments, waste, and inventory risk." },
  purchasing: { label: "Purchasing", description: "Restock suggestions, quotes, purchase orders, incoming stock, and receiving." },
  suppliers: { label: "Suppliers", description: "Contacts, pricing, lead times, quote history, and supplier reliability." },
  menu: { label: "Menu", description: "Menu economics, pricing, popularity, margin, and availability." },
  recipes: { label: "Recipes", description: "Recipe consumption, yields, ingredient mapping, and costing." },
  waste: { label: "Waste", description: "Waste, spoilage, variance, root causes, and cost impact." },
  labor: { label: "Labor", description: "Staffing demand, hours, cost, utilization, and scheduling signals." },
  workflows: { label: "Workflows", description: "Automated business processes managed by Jourvis." },
  customers: { label: "Customers", description: "Customer activity, service history, follow-up, and retention." },
  team: { label: "Team", description: "Team workload, assignments, capacity, and exceptions." },
};

export function listCommandCenterBusinesses() {
  return businesses;
}

export function resolveCommandCenterBusiness(businessId: string): CommandCenterBusiness {
  const found = businesses.find((business) => business.id === businessId);
  if (found) return found;

  const readable = businessId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    id: businessId,
    name: readable || "Business",
    shortName: readable || "Business",
    industry: "generic",
    currency: "PHP",
    timezone: "Asia/Manila",
    operations: ["workflows", "customers", "team"],
    capabilities: sharedCapabilities,
    demoMetrics: [
      { label: "Revenue today", value: "—", note: "connect a data source" },
      { label: "Operating result", value: "—", note: "connect a data source" },
      { label: "Jourvis working", value: "0", note: "automations in progress" },
      { label: "Needs owner", value: "0", note: "exceptions only" },
    ],
  };
}
