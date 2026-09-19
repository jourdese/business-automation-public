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
  | "supplier_viewed"
  | "quote_received"
  | "counter_sent"
  | "approved"
  | "awaiting_confirmation"
  | "confirmed"
  | "in_transit"
  | "partial_received"
  | "received"
  | "rejected";

export type CommandCenterPurchase = {
  id: string;
  itemId: string;
  supplierId: string;
  contactId?: string;
  quantity: number;
  status: CommandCenterPurchaseStatus;
  estimatedTotal: number;
  quotedPackPrice?: number;
  quotedTotal?: number;
  deliveryFee?: number;
  etaDays?: number;
  counteroffersUsed?: number;
  receivedQuantity?: number;
  buyerConfirmed?: boolean;
  supplierConfirmed?: boolean;
  createdAt: string;
  origin: "jourvis" | "owner";
  automationMode?: "assist" | "auto_contact" | "autobuy";
  explanation: string;
};

export type CommandCenterRecipe = {
  id: string;
  name: string;
  description: string;
  notes?: string;
  active: boolean;
  ingredients: Record<string, number>;
  savedIngredientCost?: number;
  updatedAt?: string;
};

export type CommandCenterMenuItem = {
  id: string;
  name: string;
  printedName: string;
  dishKey: string;
  category: string;
  variant?: string;
  description?: string;
  currentPrice?: number;
  referencePrice?: number;
  referenceSource: "archived-menu-photo" | "demo";
  referencePublicationDate?: string;
  currentPriceVerified: boolean;
  active: boolean;
  available: boolean;
  recipeId?: string;
  displayOrder?: number;
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

export type CommandCenterHistoryInventoryObservation = {
  itemId: string;
  unit: string;
  onHand: number;
  incoming: number;
  fullLevel: number;
  dailyUse: number;
  projected7d: number;
};

export type CommandCenterHistorySnapshot = {
  id: string;
  capturedAt: string;
  trigger: string;
  stateSignature: string;
  inventoryReadinessPercent: number | null;
  inventoryRiskCount: number;
  activeWorkflowCount: number;
  ownerExceptionCount: number;
  recipeCoveragePercent: number | null;
  averageFoodCostPercent: number | null;
  openPurchaseCommitments: number;
  confirmedIncomingCommitments: number;
  receivedPurchaseSpend: number;
  configuredInventoryValue: number;
  averageMenuGrossMarginPercent: number | null;
  automaticActivityCount: number;
  manualActivityCount: number;
  inventoryForecast7d: CommandCenterHistoryInventoryObservation[];
};

export type CommandCenterRuntimeState = {
  version: 2;
  business: CommandCenterBusiness;
  automationMasterOn: boolean;
  inventory: CommandCenterInventoryItem[];
  purchases: CommandCenterPurchase[];
  suppliers: CommandCenterSupplier[];
  recipes: CommandCenterRecipe[];
  menuItems: CommandCenterMenuItem[];
  pausedItemIds: string[];
  activity: CommandCenterActivity[];
  history: CommandCenterHistorySnapshot[];
};

export function canMenuItemBeAvailable(
  item: Pick<CommandCenterMenuItem, "recipeId">,
  recipes: CommandCenterRecipe[],
) {
  if (!item.recipeId) return true;
  return recipes.some(
    (recipe) => recipe.id === item.recipeId && recipe.active,
  );
}

export function reconcileMenuItemsForRecipeStatus(
  menuItems: CommandCenterMenuItem[],
  recipeId: string,
  recipeActive: boolean,
) {
  return menuItems.map((item) =>
    item.recipeId === recipeId && item.active
      ? { ...item, available: recipeActive }
      : item,
  );
}

export function inventoryPercent(item: CommandCenterInventoryItem) {
  return Math.max(
    0,
    Math.min(100, Math.round((item.current / Math.max(item.fullLevel, 0.01)) * 100)),
  );
}

export function suggestedPurchaseQuantity(item: CommandCenterInventoryItem) {
  const dailyUse = item.dailyUse ?? 0;
  const projectedAtDelivery = Math.max(
    0,
    item.current + item.incoming - dailyUse * item.leadDays,
  );
  const shortage = Math.max(0, item.fullLevel - projectedAtDelivery);
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

export function evaluateAutomaticPurchaseStart(
  item: CommandCenterInventoryItem,
) {
  const quantity = suggestedPurchaseQuantity(item);
  const estimatedTotal = estimatedPurchaseTotal(item, quantity);
  const reasons: string[] = [];

  if (quantity <= 0) {
    reasons.push("No purchase quantity is currently required.");
  }
  if (quantity > item.maxAutoOrderQty) {
    reasons.push(
      `Suggested quantity ${quantity} ${item.unit} exceeds the automatic quantity limit of ${item.maxAutoOrderQty} ${item.unit}.`,
    );
  }
  if (item.leadDays > item.maxLeadDays) {
    reasons.push(
      `Supplier lead time of ${item.leadDays} days exceeds the allowed ${item.maxLeadDays} days.`,
    );
  }
  if (item.purchasingMode === "fixed") {
    if (estimatedTotal > item.maxAutoOrderSpend) {
      reasons.push(
        `Known order total ₱${Math.round(estimatedTotal).toLocaleString("en-PH")} exceeds the automatic order cap of ₱${Math.round(item.maxAutoOrderSpend).toLocaleString("en-PH")}.`,
      );
    }
    if (item.packPrice > item.hardMaxPackPrice) {
      reasons.push(
        `Configured pack price ₱${Math.round(item.packPrice).toLocaleString("en-PH")} exceeds the hard maximum of ₱${Math.round(item.hardMaxPackPrice).toLocaleString("en-PH")}.`,
      );
    }
  }

  return {
    allowed: reasons.length === 0,
    quantity,
    estimatedTotal,
    reasons,
  };
}

export function isPurchaseActive(status: CommandCenterPurchaseStatus) {
  return status !== "received" && status !== "rejected";
}

const purchaseTransitions: Record<
  CommandCenterPurchaseStatus,
  ReadonlyArray<CommandCenterPurchaseStatus>
> = {
  suggested: ["requested", "quote_requested", "rejected"],
  requested: ["supplier_viewed", "rejected"],
  quote_requested: ["supplier_viewed", "rejected"],
  supplier_viewed: ["quote_received", "awaiting_confirmation", "rejected"],
  quote_received: ["counter_sent", "awaiting_confirmation", "rejected"],
  counter_sent: ["awaiting_confirmation", "rejected"],
  approved: ["awaiting_confirmation", "rejected"],
  awaiting_confirmation: ["confirmed", "rejected"],
  confirmed: ["in_transit", "partial_received", "received"],
  in_transit: ["partial_received", "received"],
  partial_received: ["partial_received", "received"],
  received: [],
  rejected: [],
};

export function canTransitionPurchaseStatus(
  from: CommandCenterPurchaseStatus,
  to: CommandCenterPurchaseStatus,
) {
  if (from === to) return from === "partial_received";
  return purchaseTransitions[from].includes(to);
}

export function canReceivePurchaseStatus(
  status: CommandCenterPurchaseStatus,
) {
  return (
    status === "confirmed" ||
    status === "in_transit" ||
    status === "partial_received"
  );
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

  if (
    purchase.status === "requested" ||
    purchase.status === "quote_requested"
  ) {
    if (purchase.origin === "owner") return true;
    return (
      state.automationMasterOn &&
      purchase.automationMode !== "assist"
    );
  }

  if (purchase.status === "supplier_viewed") {
    if (item.purchasingMode === "quote") {
      return true;
    }
    if (purchase.buyerConfirmed) {
      return true;
    }
    if (
      purchase.origin === "jourvis" &&
      purchase.automationMode === "autobuy" &&
      state.automationMasterOn
    ) {
      return evaluatePurchaseAuthority(item, purchase).withinAutoAccept;
    }
    return false;
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

  if (
    purchase.status === "counter_sent" ||
    purchase.status === "approved" ||
    purchase.status === "awaiting_confirmation" ||
    purchase.status === "confirmed"
  ) {
    return true;
  }

  return false;
}

export function purchaseProgressStage(
  status: CommandCenterPurchaseStatus,
) {
  if (status === "received") return 5;
  if (
    status === "confirmed" ||
    status === "in_transit" ||
    status === "partial_received"
  ) {
    return 4;
  }
  if (
    status === "quote_received" ||
    status === "counter_sent" ||
    status === "approved" ||
    status === "awaiting_confirmation"
  ) {
    return 3;
  }
  if (status === "supplier_viewed") return 2;
  if (
    status === "requested" ||
    status === "quote_requested" ||
    status === "suggested"
  ) {
    return 1;
  }
  return 0;
}

export type CommandCenterRuntimeValidationIssue = {
  code: string;
  entityId?: string;
  message: string;
};

function duplicateIds<T extends { id: string }>(entries: T[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.id)) duplicates.add(entry.id);
    seen.add(entry.id);
  }
  return [...duplicates];
}

export function validateCommandCenterRuntimeState(
  state: CommandCenterRuntimeState,
): CommandCenterRuntimeValidationIssue[] {
  const issues: CommandCenterRuntimeValidationIssue[] = [];
  const collections: Array<
    [string, Array<{ id: string }>]
  > = [
    ["inventory", state.inventory],
    ["purchase", state.purchases],
    ["supplier", state.suppliers],
    ["recipe", state.recipes],
    ["menu", state.menuItems],
  ];

  for (const [label, entries] of collections) {
    for (const id of duplicateIds(entries)) {
      issues.push({
        code: "duplicate_id",
        entityId: id,
        message: `Duplicate ${label} id: ${id}.`,
      });
    }
  }

  const inventoryById = new Map(
    state.inventory.map((item) => [item.id, item]),
  );
  const supplierById = new Map(
    state.suppliers.map((supplier) => [supplier.id, supplier]),
  );
  const recipeById = new Map(
    state.recipes.map((recipe) => [recipe.id, recipe]),
  );

  for (const recipe of state.recipes) {
    for (const itemId of Object.keys(recipe.ingredients)) {
      if (!inventoryById.has(itemId)) {
        issues.push({
          code: "recipe_missing_inventory",
          entityId: recipe.id,
          message: `Recipe ${recipe.name} references missing inventory item ${itemId}.`,
        });
      }
    }
  }

  for (const menuItem of state.menuItems) {
    const recipe = menuItem.recipeId
      ? recipeById.get(menuItem.recipeId)
      : undefined;
    if (menuItem.recipeId && !recipe) {
      issues.push({
        code: "menu_missing_recipe",
        entityId: menuItem.id,
        message: `Menu item ${menuItem.name} references missing recipe ${menuItem.recipeId}.`,
      });
    }
    if (
      menuItem.active &&
      menuItem.available &&
      menuItem.recipeId &&
      recipe &&
      !recipe.active
    ) {
      issues.push({
        code: "available_menu_archived_recipe",
        entityId: menuItem.id,
        message: `Available menu item ${menuItem.name} points to archived recipe ${recipe.name}.`,
      });
    }
  }

  for (const item of state.inventory) {
    if (item.current < 0 || item.incoming < 0) {
      issues.push({
        code: "negative_inventory",
        entityId: item.id,
        message: `Inventory item ${item.name} has negative stock state.`,
      });
    }

    if (!item.supplierId) continue;
    const supplier = supplierById.get(item.supplierId);
    if (!supplier) {
      issues.push({
        code: "inventory_missing_supplier",
        entityId: item.id,
        message: `Inventory item ${item.name} references missing supplier ${item.supplierId}.`,
      });
      continue;
    }
    if (
      item.contactId &&
      !supplier.contacts.some(
        (contact) => contact.id === item.contactId,
      )
    ) {
      issues.push({
        code: "inventory_missing_supplier_contact",
        entityId: item.id,
        message: `Inventory item ${item.name} references a contact not owned by ${supplier.name}.`,
      });
    }
    if (!supplier.itemIds.includes(item.id)) {
      issues.push({
        code: "supplier_item_link_missing",
        entityId: item.id,
        message: `Supplier ${supplier.name} does not include inventory item ${item.name} in its item links.`,
      });
    }
  }

  for (const purchase of state.purchases) {
    const item = inventoryById.get(purchase.itemId);
    if (!item) {
      issues.push({
        code: "purchase_missing_inventory",
        entityId: purchase.id,
        message: `Purchase ${purchase.id} references missing inventory item ${purchase.itemId}.`,
      });
    }
    const supplier = supplierById.get(purchase.supplierId);
    if (!supplier) {
      issues.push({
        code: "purchase_missing_supplier",
        entityId: purchase.id,
        message: `Purchase ${purchase.id} references missing supplier ${purchase.supplierId}.`,
      });
    }
    if (
      purchase.contactId &&
      supplier &&
      !supplier.contacts.some(
        (contact) => contact.id === purchase.contactId,
      )
    ) {
      issues.push({
        code: "purchase_missing_supplier_contact",
        entityId: purchase.id,
        message: `Purchase ${purchase.id} references a contact not owned by ${supplier.name}.`,
      });
    }
    if (
      ["confirmed", "in_transit", "partial_received", "received"].includes(
        purchase.status,
      ) &&
      !purchase.supplierConfirmed
    ) {
      issues.push({
        code: "confirmed_purchase_without_supplier_confirmation",
        entityId: purchase.id,
        message: `Purchase ${purchase.id} is ${purchase.status} without supplier confirmation.`,
      });
    }
  }

  return issues;
}

export function taskPriorityValue(priority: JourvisTaskPriority) {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}
