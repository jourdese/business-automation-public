import type { CommandCenterBusiness } from "./types";

export type JourvisTaskState =
  | "watching"
  | "forecasting"
  | "acting"
  | "waiting"
  | "verifying"
  | "needs_owner"
  | "completed"
  | "rejected";

export type JourvisTaskPriority = "high" | "medium" | "low";

export type JourvisTaskAction =
  | "approve"
  | "reject"
  | "update"
  | "receive"
  | "retry"
  | "resume"
  | "review";

export type JourvisRuntimeTask = {
  id: string;
  businessId: string;
  module: string;
  entityId?: string;
  requestId?: string;
  priority: JourvisTaskPriority;
  state: JourvisTaskState;
  title: string;
  whatHappened: string;
  why: string;
  whatJourvisDid: string;
  whyOwnerIsNeeded?: string;
  actions: JourvisTaskAction[];
};

export type CommandCenterInventoryItem = {
  id: string;
  name: string;
  unit: string;
  current: number;
  fullLevel: number;
  reorderAt: number;
  incoming: number;
  supplierId: string;
  contactId: string;
  packSize: number;
  packPrice: number;
  purchaseUnit: string;
  leadDays: number;
  purchasingMode: "fixed" | "quote";
  automationEnabled: boolean;
  automationMode: "assist" | "auto_contact" | "autobuy";
  automationTriggerPercent: number;
  maxAutoOrderSpend: number;
  autoAcceptPackPrice: number;
};

export type CommandCenterPurchaseStatus =
  | "suggested"
  | "requested"
  | "quote_requested"
  | "quote_received"
  | "approved"
  | "confirmed"
  | "in_transit"
  | "partial_received"
  | "received"
  | "rejected";

export type CommandCenterPurchase = {
  id: string;
  itemId: string;
  supplierId: string;
  quantity: number;
  status: CommandCenterPurchaseStatus;
  estimatedTotal: number;
  quotedPackPrice?: number;
  quotedTotal?: number;
  receivedQuantity?: number;
  createdAt: string;
  origin: "jourvis" | "owner";
  explanation: string;
};

export type CommandCenterSupplier = {
  id: string;
  name: string;
  contacts: Array<{
    id: string;
    name: string;
    role: string;
    channel: string;
    email: string;
    phone: string;
  }>;
  itemIds: string[];
};

export type CommandCenterActivity = {
  id: string;
  at: string;
  module: string;
  message: string;
};

export type CommandCenterRuntimeState = {
  version: 1;
  business: CommandCenterBusiness;
  automationMasterOn: boolean;
  inventory: CommandCenterInventoryItem[];
  purchases: CommandCenterPurchase[];
  suppliers: CommandCenterSupplier[];
  pausedItemIds: string[];
  activity: CommandCenterActivity[];
};

export function inventoryPercent(item: CommandCenterInventoryItem) {
  return Math.max(
    0,
    Math.min(100, Math.round((item.current / Math.max(item.fullLevel, 0.01)) * 100)),
  );
}

export function suggestedPurchaseQuantity(item: CommandCenterInventoryItem) {
  const shortage = Math.max(0, item.fullLevel - item.current - item.incoming);
  if (shortage <= 0) return 0;
  return Math.max(
    item.packSize,
    Math.ceil(shortage / Math.max(item.packSize, 0.01)) * item.packSize,
  );
}

export function estimatedPurchaseTotal(
  item: CommandCenterInventoryItem,
  quantity = suggestedPurchaseQuantity(item),
) {
  if (quantity <= 0) return 0;
  return (
    Math.ceil(quantity / Math.max(item.packSize, 0.01)) *
    Math.max(0, item.packPrice)
  );
}

export function isPurchaseActive(status: CommandCenterPurchaseStatus) {
  return status !== "received" && status !== "rejected";
}

export function taskPriorityValue(priority: JourvisTaskPriority) {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}
