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
  dailyUse?: number;
  zone?: string;
  purchasingMode: "fixed" | "quote";
  automationEnabled: boolean;
  automationMode: "assist" | "auto_contact" | "autobuy";
  automationTriggerPercent: number;
  targetPackPrice: number;
  autoAcceptPackPrice: number;
  hardMaxPackPrice: number;
  maxAutoOrderQty: number;
  maxAutoOrderSpend: number;
  autoNegotiate: boolean;
  maxCounteroffers: number;
  maxDeliveryFee: number;
  maxLeadDays: number;
};

export type CommandCenterPurchaseStatus =
  | "suggested"
  | "requested"
  | "quote_requested"
  | "quote_received"
  | "counter_sent"
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
  deliveryFee?: number;
  etaDays?: number;
  counteroffersUsed?: number;
  receivedQuantity?: number;
  createdAt: string;
  origin: "jourvis" | "owner";
  automationMode?: "assist" | "auto_contact" | "autobuy";
  explanation: string;
};

export type CommandCenterRecipe = {
  id: string;
  name: string;
  description: string;
  ingredients: Record<string, number>;
};

export type CommandCenterMenuItem = {
  id: string;
  name: string;
  printedName: string;
  dishKey: string;
  category: string;
  variant?: string;
  referencePrice?: number;
  referenceSource: "archived-menu-photo" | "demo";
  referencePublicationDate?: string;
  currentPriceVerified: boolean;
  recipeId?: string;
};

export type CommandCenterStockAdjustmentReason =
  | "external_delivery"
  | "physical_count"
  | "waste"
  | "transfer"
  | "other";

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

export type CommandCenterActivityConfiguration = {
  capturedAt: string;
  summary: string;
  values: Record<string, string | number | boolean | null>;
};

export type CommandCenterActivity = {
  id: string;
  at: string;
  module: string;
  action: string;
  message: string;
  actor: "jourvis" | "owner" | "external" | "system";
  executionMode: "automatic" | "manual" | "system";
  reason: string;
  configuration?: CommandCenterActivityConfiguration;
  relatedEntityId?: string;
  relatedRequestId?: string;
};

export type CommandCenterRuntimeState = {
  version: 1;
  business: CommandCenterBusiness;
  automationMasterOn: boolean;
  inventory: CommandCenterInventoryItem[];
  purchases: CommandCenterPurchase[];
  suppliers: CommandCenterSupplier[];
  recipes: CommandCenterRecipe[];
  menuItems: CommandCenterMenuItem[];
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

export function projectedInventoryAtDelivery(
  item: CommandCenterInventoryItem,
) {
  const dailyUse = item.dailyUse ?? 0;
  return Math.max(
    0,
    Math.round(
      (item.current + item.incoming - dailyUse * item.leadDays) * 100,
    ) / 100,
  );
}

export function projectedInventoryPercentAtDelivery(
  item: CommandCenterInventoryItem,
) {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (projectedInventoryAtDelivery(item) /
          Math.max(item.fullLevel, 0.01)) *
          100,
      ),
    ),
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

export function evaluatePurchaseAuthority(
  item: CommandCenterInventoryItem,
  purchase: CommandCenterPurchase,
) {
  const total = purchase.quotedTotal ?? purchase.estimatedTotal;
  const packPrice = purchase.quotedPackPrice ?? item.packPrice;
  const deliveryFee = purchase.deliveryFee ?? 0;
  const etaDays = purchase.etaDays ?? item.leadDays;
  const quantity = purchase.quantity;
  const counteroffersUsed = purchase.counteroffersUsed ?? 0;

  const withinAutoAccept =
    total <= item.maxAutoOrderSpend &&
    packPrice <= item.autoAcceptPackPrice &&
    packPrice <= item.hardMaxPackPrice &&
    quantity <= item.maxAutoOrderQty &&
    deliveryFee <= item.maxDeliveryFee &&
    etaDays <= item.maxLeadDays;

  const withinHardLimits =
    packPrice <= item.hardMaxPackPrice &&
    quantity <= item.maxAutoOrderQty &&
    deliveryFee <= item.maxDeliveryFee &&
    etaDays <= item.maxLeadDays;

  const negotiatedTotal =
    Math.ceil(quantity / Math.max(item.packSize, 0.01)) *
      item.targetPackPrice +
    deliveryFee;

  const canNegotiate =
    !withinAutoAccept &&
    withinHardLimits &&
    item.autoNegotiate &&
    counteroffersUsed < item.maxCounteroffers &&
    item.targetPackPrice <= item.hardMaxPackPrice &&
    negotiatedTotal <= item.maxAutoOrderSpend;

  return {
    total,
    packPrice,
    deliveryFee,
    etaDays,
    quantity,
    counteroffersUsed,
    negotiatedTotal,
    withinAutoAccept,
    withinHardLimits,
    canNegotiate,
  };
}


export function normalizeInventoryAuthorityConfiguration(
  item: CommandCenterInventoryItem,
): CommandCenterInventoryItem {
  const hardMaxPackPrice = Math.max(0, item.hardMaxPackPrice);
  const autoAcceptPackPrice = Math.min(
    hardMaxPackPrice,
    Math.max(0, item.autoAcceptPackPrice),
  );
  const targetPackPrice = Math.min(
    autoAcceptPackPrice,
    Math.max(0, item.targetPackPrice),
  );

  return {
    ...item,
    targetPackPrice,
    autoAcceptPackPrice,
    hardMaxPackPrice,
  };
}

export function canAdvancePurchase(
  state: CommandCenterRuntimeState,
  purchase: CommandCenterPurchase,
) {
  const item = state.inventory.find((entry) => entry.id === purchase.itemId);
  if (!item) return false;

  if (purchase.status === "requested") {
    if (purchase.origin === "owner") return true;
    if (
      purchase.automationMode !== "autobuy" ||
      !state.automationMasterOn
    ) {
      return false;
    }
    return evaluatePurchaseAuthority(item, purchase).withinAutoAccept;
  }

  if (
    purchase.status === "quote_requested" ||
    purchase.status === "counter_sent" ||
    purchase.status === "approved" ||
    purchase.status === "confirmed"
  ) {
    return true;
  }

  if (
    purchase.status === "quote_received" &&
    purchase.origin === "jourvis" &&
    purchase.automationMode === "autobuy" &&
    state.automationMasterOn
  ) {
    const authority = evaluatePurchaseAuthority(item, purchase);
    return authority.withinAutoAccept || authority.canNegotiate;
  }

  return false;
}

export function taskPriorityValue(priority: JourvisTaskPriority) {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}
