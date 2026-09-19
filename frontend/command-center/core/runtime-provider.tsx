"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { resolveCommandCenterBusiness } from "./business-registry";
import {
  canAdvancePurchase,
  estimatedPurchaseTotal,
  evaluateAutomaticPurchaseStart,
  evaluatePurchaseAuthority,
  isPurchaseActive,
  normalizeInventoryAuthorityConfiguration,
  suggestedPurchaseQuantity,
  type CommandCenterActivity,
  type CommandCenterInventoryItem,
  type CommandCenterMenuItem,
  type CommandCenterPurchase,
  type CommandCenterRecipe,
  type CommandCenterRuntimeState,
  type CommandCenterStockAdjustmentReason,
  type JourvisRuntimeTask,
  type JourvisTaskAction,
} from "./runtime";
import { deriveJourvisTasks } from "./task-engine";
import {
  appendCommandCenterHistorySnapshot,
  commandCenterHistorySignature,
} from "./history-engine";
import {
  inventoryRuleSnapshot,
  normalizeActivity,
  prependActivity,
  type ActivityInput,
} from "./activity-audit";
import { createMarinaraRuntimeSeed } from "../businesses/marinara-runtime";

type CommandCenterRuntimeContextValue = {
  businessId: string;
  state: CommandCenterRuntimeState;
  tasks: JourvisRuntimeTask[];
  loading: boolean;
  actOnTask: (taskId: string, action: JourvisTaskAction) => void;
  applyInventoryConfiguration: (
    previous: CommandCenterInventoryItem,
    next: CommandCenterInventoryItem,
  ) => void;
  setAutomationMasterOn: (enabled: boolean) => void;
  setItemAutomationEnabled: (itemId: string, enabled: boolean) => void;
  adjustInventory: (
    itemId: string,
    change: number,
    reason: CommandCenterStockAdjustmentReason,
  ) => void;
  receivePurchase: (purchaseId: string, quantity: number) => void;
  updatePurchaseQuantity: (purchaseId: string, quantity: number) => void;
  startOwnerPurchase: (itemId: string) => void;
  saveMenuItem: (
    item: Omit<
      CommandCenterMenuItem,
      | "id"
      | "printedName"
      | "dishKey"
      | "referencePrice"
      | "referenceSource"
      | "referencePublicationDate"
      | "currentPriceVerified"
    > & { id?: string },
  ) => void;
  archiveMenuItem: (itemId: string) => void;
  saveRecipe: (
    recipe: Omit<CommandCenterRecipe, "id"> & { id?: string },
  ) => void;
  archiveRecipe: (recipeId: string) => void;
  createInventoryItem: (
    item: Omit<CommandCenterInventoryItem, "id">,
  ) => string;
  recordRecipeSale: (recipeId: string, quantity?: number) => void;
  resumeItem: (itemId: string) => void;
  resetDemo: () => void;
};

const RuntimeContext = createContext<CommandCenterRuntimeContextValue | null>(null);

const STORAGE_PREFIX = "jourvis:command-center";

function businessIdFromPath() {
  if (typeof window === "undefined") return "marinara-ristorante";
  const parts = window.location.pathname.split("/").filter(Boolean);
  const index = parts.indexOf("command-center");
  return index >= 0 ? parts[index + 1] || "marinara-ristorante" : "marinara-ristorante";
}

function storageKey(businessId: string) {
  return `${STORAGE_PREFIX}:${businessId}:runtime:v1`;
}

function createGenericSeed(businessId: string): CommandCenterRuntimeState {
  return {
    version: 1,
    business: resolveCommandCenterBusiness(businessId),
    automationMasterOn: false,
    inventory: [],
    purchases: [],
    suppliers: [],
    recipes: [],
    menuItems: [],
    pausedItemIds: [],
    activity: [],
    history: [],
  };
}

function createSeed(businessId: string) {
  if (businessId === "marinara-ristorante") return createMarinaraRuntimeSeed();
  return createGenericSeed(businessId);
}

function nextRequestId(state: CommandCenterRuntimeState) {
  return `JV-${String(state.purchases.length + 1).padStart(4, "0")}`;
}

function createPurchase(
  state: CommandCenterRuntimeState,
  item: CommandCenterInventoryItem,
  origin: "jourvis" | "owner",
): CommandCenterPurchase {
  const quantity = suggestedPurchaseQuantity(item);
  return {
    id: nextRequestId(state),
    itemId: item.id,
    supplierId: item.supplierId,
    contactId: item.contactId,
    quantity,
    status: item.purchasingMode === "quote" ? "quote_requested" : "requested",
    estimatedTotal: estimatedPurchaseTotal(item, quantity),
    createdAt: new Date().toISOString(),
    origin,
    automationMode: item.automationMode,
    counteroffersUsed: 0,
    buyerConfirmed: origin === "owner" && item.purchasingMode === "fixed",
    supplierConfirmed: false,
    explanation:
      origin === "jourvis"
        ? "Jourvis started this purchase automatically because stock reached its configured trigger."
        : "The owner approved Jourvis' suggested restock.",
  };
}

function addActivity(
  state: CommandCenterRuntimeState,
  input: ActivityInput,
) {
  return prependActivity(state, input);
}

function entitySlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "item";
}

function nextEntityId(
  prefix: string,
  name: string,
  existingIds: string[],
) {
  const base = `${prefix}-${entitySlug(name)}`;
  if (!existingIds.includes(base)) return base;
  let index = 2;
  while (existingIds.includes(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function normalizeStoredState(
  stored: CommandCenterRuntimeState,
): CommandCenterRuntimeState {
  const seed = createSeed(stored.business?.id ?? businessIdFromPath());
  const seedInventory = new Map(seed.inventory.map((item) => [item.id, item]));

  return {
    ...seed,
    ...stored,
    inventory: (stored.inventory ?? seed.inventory).map((item) => ({
      ...(seedInventory.get(item.id) ?? item),
      ...item,
    })),
    suppliers: stored.suppliers ?? seed.suppliers,
    recipes: (stored.recipes ?? seed.recipes).map((recipe) => {
      const seeded = seed.recipes.find((entry) => entry.id === recipe.id);
      return {
        ...seeded,
        ...recipe,
        active: recipe.active ?? seeded?.active ?? true,
      };
    }),
    menuItems: (stored.menuItems ?? seed.menuItems).map((item) => {
      const seeded = seed.menuItems.find((entry) => entry.id === item.id);
      return {
        ...seeded,
        ...item,
        description: item.description ?? seeded?.description,
        currentPrice: item.currentPrice ?? seeded?.currentPrice,
        active: item.active ?? seeded?.active ?? true,
        available: item.available ?? seeded?.available ?? true,
      };
    }),
    pausedItemIds: stored.pausedItemIds ?? [],
    purchases: (stored.purchases ?? []).map((purchase) => {
      const item = (stored.inventory ?? seed.inventory).find(
        (entry) => entry.id === purchase.itemId,
      );
      const buyerAlreadyConfirmed = [
        "approved",
        "awaiting_confirmation",
        "confirmed",
        "in_transit",
        "partial_received",
        "received",
      ].includes(purchase.status);
      const supplierAlreadyConfirmed = [
        "confirmed",
        "in_transit",
        "partial_received",
        "received",
      ].includes(purchase.status);
      return {
        ...purchase,
        contactId: purchase.contactId ?? item?.contactId,
        buyerConfirmed:
          purchase.buyerConfirmed ?? buyerAlreadyConfirmed,
        supplierConfirmed:
          purchase.supplierConfirmed ?? supplierAlreadyConfirmed,
      };
    }),
    activity: (stored.activity ?? []).map((entry) => normalizeActivity(entry)),
    history: (stored.history ?? []).map((snapshot) => ({
      ...snapshot,
      inventoryForecast7d: snapshot.inventoryForecast7d ?? [],
    })),
  };
}

function nextAutonomousPurchase(
  state: CommandCenterRuntimeState,
): CommandCenterRuntimeState {
  if (!state.automationMasterOn) return state;

  const activeItemIds = new Set(
    state.purchases
      .filter((purchase) => isPurchaseActive(purchase.status))
      .map((purchase) => purchase.itemId),
  );

  const item = state.inventory
    .filter((candidate) => {
      if (
        !candidate.automationEnabled ||
        candidate.automationMode === "assist" ||
        state.pausedItemIds.includes(candidate.id) ||
        activeItemIds.has(candidate.id)
      ) {
        return false;
      }

      const percent =
        (candidate.current / Math.max(candidate.fullLevel, 0.01)) * 100;
      if (percent > candidate.automationTriggerPercent) return false;
      return evaluateAutomaticPurchaseStart(candidate).allowed;
    })
    .sort((a, b) => {
      const aPercent = a.current / Math.max(a.fullLevel, 0.01);
      const bPercent = b.current / Math.max(b.fullLevel, 0.01);
      return aPercent - bPercent;
    })[0];

  if (!item) return state;

  const percent =
    (item.current / Math.max(item.fullLevel, 0.01)) * 100;
  const purchase = createPurchase(state, item, "jourvis");

  return {
    ...state,
    purchases: [purchase, ...state.purchases],
    activity: addActivity(state, {
      module: "purchasing",
      action: "purchase_started",
      message: `Jourvis automatically started ${purchase.id} for ${item.name}.`,
      actor: "jourvis",
      executionMode: "automatic",
      reason:
        `${item.name} was at ${Math.round(percent)}% stock, at or below its ` +
        `${item.automationTriggerPercent}% Jourvis action trigger. Global autonomy and item automation were enabled, and the configured mode was ${item.automationMode}.`,
      configuration: inventoryRuleSnapshot(item, state.automationMasterOn),
      relatedEntityId: item.id,
      relatedRequestId: purchase.id,
    }),
  };
}

function hasQueuedAutonomousPurchase(state: CommandCenterRuntimeState) {
  if (!state.automationMasterOn) return false;

  const activeItemIds = new Set(
    state.purchases
      .filter((purchase) => isPurchaseActive(purchase.status))
      .map((purchase) => purchase.itemId),
  );

  return state.inventory.some((item) => {
    if (
      !item.automationEnabled ||
      item.automationMode === "assist" ||
      state.pausedItemIds.includes(item.id) ||
      activeItemIds.has(item.id)
    ) {
      return false;
    }
    const percent =
      (item.current / Math.max(item.fullLevel, 0.01)) * 100;
    if (percent > item.automationTriggerPercent) return false;
    return evaluateAutomaticPurchaseStart(item).allowed;
  });
}

function advanceOneAutonomousStep(
  state: CommandCenterRuntimeState,
): CommandCenterRuntimeState {
  const purchase = state.purchases.find((candidate) =>
    canAdvancePurchase(state, candidate),
  );

  if (!purchase) return state;
  const item = state.inventory.find((candidate) => candidate.id === purchase.itemId);
  if (!item) return state;

  let replacement: CommandCenterPurchase = purchase;
  let message = "";
  let action = "workflow_advanced";
  let actor: CommandCenterActivity["actor"] = "external";
  let reason = "The supplier workflow advanced to its next verified state.";

  if (
    purchase.status === "requested" ||
    purchase.status === "quote_requested"
  ) {
    replacement = {
      ...purchase,
      status: "supplier_viewed",
    };
    message = `${purchase.id}: supplier viewed the request for ${item.name}.`;
    action = "supplier_viewed";
    reason =
      "The supplier opened the request. Jourvis records this separately from agreement or confirmation so the owner can see where the workflow is waiting.";
  } else if (purchase.status === "supplier_viewed") {
    if (item.purchasingMode === "quote") {
      const quotedPackPrice = Math.round(item.packPrice * 1.05);
      const deliveryFee = 150;
      const etaDays = item.leadDays;
      const quotedTotal =
        Math.ceil(purchase.quantity / Math.max(item.packSize, 0.01)) *
        quotedPackPrice +
        deliveryFee;
      replacement = {
        ...purchase,
        status: "quote_received",
        quotedPackPrice,
        quotedTotal,
        deliveryFee,
        etaDays,
        counteroffersUsed: purchase.counteroffersUsed ?? 0,
      };
      message = `${purchase.id}: supplier returned a quote for ${item.name}.`;
      action = "quote_received";
      reason =
        "The supplier returned price, delivery-fee, and ETA terms after viewing the request. Jourvis has not treated the quote as accepted yet.";
    } else {
      replacement = {
        ...purchase,
        status: "awaiting_confirmation",
        buyerConfirmed: true,
        etaDays: purchase.etaDays ?? item.leadDays,
        explanation:
          purchase.origin === "jourvis"
            ? "Jourvis accepted the configured fixed-price purchase within its authority and is waiting for final supplier confirmation."
            : "The owner already approved the fixed-price purchase; Jourvis is waiting for final supplier confirmation.",
      };
      message = `${purchase.id}: fixed-price terms for ${item.name} are accepted; waiting for supplier confirmation.`;
      action =
        purchase.origin === "jourvis"
          ? "fixed_purchase_auto_approved"
          : "fixed_purchase_owner_approved";
      actor = purchase.origin === "jourvis" ? "jourvis" : "system";
      reason =
        purchase.origin === "jourvis"
          ? "Jourvis accepted the known fixed-price terms because spend, pack price, quantity, and lead time remained inside the configured authority."
          : "The owner had already approved the fixed-price restock before the supplier viewed it; no second buyer approval is required.";
    }
  } else if (purchase.status === "quote_received") {
    const authority = evaluatePurchaseAuthority(item, purchase);
    if (authority.withinAutoAccept) {
      replacement = {
        ...purchase,
        status: "awaiting_confirmation",
        buyerConfirmed: true,
        explanation:
          "Jourvis accepted the supplier quote automatically because price, spend, quantity, delivery fee, and lead time stayed inside its authority. Final supplier confirmation is still pending.",
      };
      message = `${purchase.id}: Jourvis accepted the quote within configured limits; waiting for supplier confirmation.`;
      action = "quote_auto_approved";
      actor = "jourvis";
      reason =
        "Jourvis accepted the quote automatically because total spend, pack price, quantity, delivery fee, and lead time all remained inside the configured authority limits.";
    } else if (authority.canNegotiate) {
      replacement = {
        ...purchase,
        status: "counter_sent",
        buyerConfirmed: true,
        quotedPackPrice: item.targetPackPrice,
        quotedTotal: authority.negotiatedTotal,
        counteroffersUsed: authority.counteroffersUsed + 1,
        explanation:
          "Jourvis automatically countered at the configured target price because the supplier quote was outside the auto-accept range but still within negotiation authority.",
      };
      message = `${purchase.id}: Jourvis automatically countered at ₱${Math.round(item.targetPackPrice).toLocaleString("en-PH")} per pack.`;
      action = "quote_auto_countered";
      actor = "jourvis";
      reason =
        `Jourvis automatically negotiated because the quote was outside auto-accept limits, auto-negotiate was enabled, the counteroffer count was below ${item.maxCounteroffers}, and the target price ₱${Math.round(item.targetPackPrice).toLocaleString("en-PH")} kept the resulting order within the configured spending and hard-price limits.`;
    }
  } else if (purchase.status === "counter_sent") {
    replacement = {
      ...purchase,
      status: "awaiting_confirmation",
      buyerConfirmed: true,
      explanation:
        "The supplier accepted Jourvis' automatic counteroffer. Final supplier confirmation is still pending before stock becomes incoming.",
    };
    message = `${purchase.id}: supplier accepted Jourvis' counteroffer; waiting for final confirmation.`;
    action = "counteroffer_accepted";
    reason =
      "The supplier accepted the automatic counteroffer Jourvis had already sent within its negotiation authority.";
  } else if (purchase.status === "approved") {
    replacement = {
      ...purchase,
      status: "awaiting_confirmation",
      buyerConfirmed: true,
    };
    message = `${purchase.id}: buyer approval recorded; waiting for supplier confirmation.`;
    action = "buyer_approval_migrated";
    actor = "system";
    reason =
      "This stored purchase used the earlier approved state. Jourvis migrated it into the explicit final-confirmation stage without changing the buyer decision.";
  } else if (purchase.status === "awaiting_confirmation") {
    replacement = {
      ...purchase,
      status: "confirmed",
      supplierConfirmed: true,
    };
    message = `${purchase.id}: supplier gave final confirmation for ${item.name}.`;
    action = "supplier_confirmed";
    reason =
      "The supplier gave final confirmation after buyer acceptance. Jourvis now treats the agreed quantity as confirmed incoming stock.";
  } else if (purchase.status === "confirmed") {
    replacement = { ...purchase, status: "in_transit" };
    message = `${purchase.id}: supplier marked the delivery in transit.`;
    action = "shipment_in_transit";
    reason =
      "The supplier changed the confirmed purchase to in transit. Jourvis recorded the external status update automatically.";
  }

  return {
    ...state,
    purchases: state.purchases.map((candidate) =>
      candidate.id === purchase.id ? replacement : candidate,
    ),
    inventory:
      replacement.status === "confirmed" && purchase.status !== "confirmed"
        ? state.inventory.map((entry) =>
            entry.id === item.id
              ? { ...entry, incoming: entry.incoming + purchase.quantity }
              : entry,
          )
        : state.inventory,
    activity: message
      ? addActivity(state, {
          module: "purchasing",
          action,
          message,
          actor,
          executionMode: "automatic",
          reason,
          configuration: inventoryRuleSnapshot(item, state.automationMasterOn),
          relatedEntityId: item.id,
          relatedRequestId: purchase.id,
        })
      : state.activity,
  };
}

export function CommandCenterRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [businessId, setBusinessId] = useState("marinara-ristorante");
  const [state, setState] = useState<CommandCenterRuntimeState>(() =>
    createSeed("marinara-ristorante"),
  );
  const [loading, setLoading] = useState(true);
  const historySignatureRef = useRef<string | null>(null);

  useEffect(() => {
    const resolved = businessIdFromPath();
    const timer = window.setTimeout(() => {
      setBusinessId(resolved);
      try {
        const stored = window.localStorage.getItem(storageKey(resolved));
        if (stored) {
          setState(normalizeStoredState(JSON.parse(stored) as CommandCenterRuntimeState));
        } else {
          setState(createSeed(resolved));
        }
      } catch {
        setState(createSeed(resolved));
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading || state.business.id !== businessId) return;
    window.localStorage.setItem(storageKey(businessId), JSON.stringify(state));
  }, [businessId, loading, state]);

  useEffect(() => {
    if (loading || state.business.id !== businessId) return;

    const ownerExceptionCount = deriveJourvisTasks(state).length;
    const signature = commandCenterHistorySignature(
      state,
      ownerExceptionCount,
    );

    if (
      historySignatureRef.current === signature ||
      state.history[0]?.stateSignature === signature
    ) {
      historySignatureRef.current = signature;
      return;
    }

    historySignatureRef.current = signature;
    setState((current) => {
      const currentOwnerExceptionCount =
        deriveJourvisTasks(current).length;
      const currentSignature = commandCenterHistorySignature(
        current,
        currentOwnerExceptionCount,
      );
      if (currentSignature !== signature) return current;

      return appendCommandCenterHistorySnapshot(
        current,
        currentOwnerExceptionCount,
      );
    });
  }, [businessId, loading, state]);

  useEffect(() => {
    if (loading || !hasQueuedAutonomousPurchase(state)) return;

    const timer = window.setTimeout(() => {
      setState((current) => nextAutonomousPurchase(current));
    }, 850);

    return () => window.clearTimeout(timer);
  }, [loading, state]);

  useEffect(() => {
    if (loading) return;
    const hasWork = state.purchases.some((purchase) =>
      canAdvancePurchase(state, purchase),
    );
    if (!hasWork) return;

    const timer = window.setTimeout(() => {
      setState((current) => advanceOneAutonomousStep(current));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [loading, state]);

  const tasks = useMemo(() => deriveJourvisTasks(state), [state]);

  const actOnTask = useCallback(
    (taskId: string, action: JourvisTaskAction) => {
      setState((current) => {
        const task = deriveJourvisTasks(current).find((entry) => entry.id === taskId);
        if (!task) return current;
        const item = task.entityId
          ? current.inventory.find((entry) => entry.id === task.entityId)
          : undefined;
        const purchase = task.requestId
          ? current.purchases.find((entry) => entry.id === task.requestId)
          : undefined;

        if (action === "approve") {
          if (purchase) {
            return {
              ...current,
              purchases: current.purchases.map((entry) => {
                if (entry.id !== purchase.id) return entry;

                if (
                  entry.status === "requested" ||
                  entry.status === "quote_requested"
                ) {
                  return {
                    ...entry,
                    origin: "owner" as const,
                    buyerConfirmed: item?.purchasingMode === "fixed",
                    explanation:
                      "Owner approved this specific supplier request while global autonomy or the automatic rule would not continue it.",
                  };
                }

                return {
                  ...entry,
                  status: "awaiting_confirmation" as const,
                  buyerConfirmed: true,
                  explanation:
                    "Owner accepted the purchase terms through Jourvis. Final supplier confirmation is still pending.",
                };
              }),
              pausedItemIds: item
                ? current.pausedItemIds.filter((id) => id !== item.id)
                : current.pausedItemIds,
              activity: addActivity(current, {
                module: task.module,
                action: "owner_approved",
                message: `${task.title}: owner approved. Jourvis continued the workflow.`,
                actor: "owner",
                executionMode: "manual",
                reason: `The owner approved an exception after Jourvis escalated it. Jourvis' reason for stopping was: ${task.why}`,
                configuration: item
                  ? inventoryRuleSnapshot(item, current.automationMasterOn)
                  : undefined,
                relatedEntityId: item?.id,
                relatedRequestId: purchase.id,
              }),
            };
          }
          if (item) {
            const nextPurchase = createPurchase(current, item, "owner");
            return {
              ...current,
              purchases: [nextPurchase, ...current.purchases],
              pausedItemIds: current.pausedItemIds.filter((id) => id !== item.id),
              activity: addActivity(current, {
                module: task.module,
                action: "owner_approved_restock",
                message: `${task.title}: owner approved. Jourvis started ${nextPurchase.id}.`,
                actor: "owner",
                executionMode: "manual",
                reason: `The owner manually approved Jourvis' suggested restock. Jourvis had escalated because: ${task.why}`,
                configuration: inventoryRuleSnapshot(item, current.automationMasterOn),
                relatedEntityId: item.id,
                relatedRequestId: nextPurchase.id,
              }),
            };
          }
        }

        if (action === "reject") {
          return {
            ...current,
            purchases: purchase
              ? current.purchases.map((entry) =>
                  entry.id === purchase.id
                    ? { ...entry, status: "rejected", explanation: "Owner rejected the request." }
                    : entry,
                )
              : current.purchases,
            pausedItemIds:
              item && !current.pausedItemIds.includes(item.id)
                ? [...current.pausedItemIds, item.id]
                : current.pausedItemIds,
            activity: addActivity(current, {
              module: task.module,
              action: "owner_rejected",
              message: `${task.title}: owner rejected. Jourvis paused this item until its rule is updated or resumed.`,
              actor: "owner",
              executionMode: "manual",
              reason: `The owner manually rejected a Jourvis exception. The condition Jourvis presented was: ${task.why}`,
              configuration: item
                ? inventoryRuleSnapshot(item, current.automationMasterOn)
                : undefined,
              relatedEntityId: item?.id,
              relatedRequestId: purchase?.id,
            }),
          };
        }

        if (action === "receive" && purchase && item) {
          const alreadyReceived = purchase.receivedQuantity ?? 0;
          const remaining = Math.max(0, purchase.quantity - alreadyReceived);
          return {
            ...current,
            purchases: current.purchases.map((entry) =>
              entry.id === purchase.id
                ? {
                    ...entry,
                    status: "received",
                    receivedQuantity: purchase.quantity,
                    explanation: "Physical delivery confirmed and received.",
                  }
                : entry,
            ),
            inventory: current.inventory.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    current: entry.current + remaining,
                    incoming: Math.max(0, entry.incoming - remaining),
                  }
                : entry,
            ),
            activity: addActivity(current, {
              module: "inventory",
              action: "delivery_received",
              message: `${purchase.id}: received ${remaining} ${item.unit} of ${item.name}.`,
              actor: "owner",
              executionMode: "manual",
              reason: "A person manually confirmed the physical quantity delivered. Jourvis does not assume physical receipt from a supplier status alone.",
              configuration: inventoryRuleSnapshot(item, current.automationMasterOn),
              relatedEntityId: item.id,
              relatedRequestId: purchase.id,
            }),
          };
        }

        if (action === "resume" && item) {
          return {
            ...current,
            pausedItemIds: current.pausedItemIds.filter((id) => id !== item.id),
            activity: addActivity(current, {
              module: task.module,
              action: "automation_resumed",
              message: `Owner resumed Jourvis automation for ${item.name}.`,
              actor: "owner",
              executionMode: "manual",
              reason: "The owner manually resumed an item that had previously been paused.",
              configuration: inventoryRuleSnapshot(item, current.automationMasterOn),
              relatedEntityId: item.id,
            }),
          };
        }

        return current;
      });
    },
    [],
  );

  const applyInventoryConfiguration = useCallback(
    (
      previous: CommandCenterInventoryItem,
      next: CommandCenterInventoryItem,
    ) => {
      setState((current) => {
        const live = current.inventory.find((item) => item.id === next.id);
        if (!live) return current;

        const validated = normalizeInventoryAuthorityConfiguration(next);

        const configurableKeys: Array<keyof CommandCenterInventoryItem> = [
          "fullLevel",
          "reorderAt",
          "supplierId",
          "contactId",
          "packSize",
          "packPrice",
          "purchaseUnit",
          "leadDays",
          "purchasingMode",
          "automationEnabled",
          "automationMode",
          "automationTriggerPercent",
          "targetPackPrice",
          "autoAcceptPackPrice",
          "hardMaxPackPrice",
          "maxAutoOrderQty",
          "maxAutoOrderSpend",
          "autoNegotiate",
          "maxCounteroffers",
          "maxDeliveryFee",
          "maxLeadDays",
        ];
        const changed = configurableKeys
          .filter((key) => validated[key] !== previous[key])
          .map((key) => `${String(key)}: ${String(previous[key])} → ${String(validated[key])}`);

        if (!changed.length) return current;

        const applied: CommandCenterInventoryItem = {
          ...live,
          fullLevel: validated.fullLevel,
          reorderAt: validated.reorderAt,
          supplierId: validated.supplierId,
          contactId: validated.contactId,
          packSize: validated.packSize,
          packPrice: validated.packPrice,
          purchaseUnit: validated.purchaseUnit,
          leadDays: validated.leadDays,
          purchasingMode: validated.purchasingMode,
          automationEnabled: validated.automationEnabled,
          automationMode: validated.automationMode,
          automationTriggerPercent: validated.automationTriggerPercent,
          targetPackPrice: validated.targetPackPrice,
          autoAcceptPackPrice: validated.autoAcceptPackPrice,
          hardMaxPackPrice: validated.hardMaxPackPrice,
          maxAutoOrderQty: validated.maxAutoOrderQty,
          maxAutoOrderSpend: validated.maxAutoOrderSpend,
          autoNegotiate: validated.autoNegotiate,
          maxCounteroffers: validated.maxCounteroffers,
          maxDeliveryFee: validated.maxDeliveryFee,
          maxLeadDays: validated.maxLeadDays,
        };

        return {
          ...current,
          inventory: current.inventory.map((item) =>
            item.id === applied.id ? applied : item,
          ),
          pausedItemIds: current.pausedItemIds.filter((id) => id !== applied.id),
          activity: addActivity(current, {
            module: "inventory",
            action: "configuration_updated",
            message: `Owner updated Jourvis configuration for ${applied.name}.`,
            actor: "owner",
            executionMode: "manual",
            reason: `The owner changed the operating rule through Jourvis Update. Changed settings: ${changed.join("; ")}.`,
            configuration: inventoryRuleSnapshot(applied, current.automationMasterOn),
            relatedEntityId: applied.id,
          }),
        };
      });
    },
    [],
  );

  const setAutomationMasterOn = useCallback((enabled: boolean) => {
    setState((current) => ({
      ...current,
      automationMasterOn: enabled,
      activity: addActivity(current, {
        module: "system",
        action: "global_autonomy_changed",
        message: `Owner switched Jourvis autonomous operations ${enabled ? "ON" : "OFF"}.`,
        actor: "owner",
        executionMode: "manual",
        reason: "The owner manually changed the global Command Center autonomy setting.",
        configuration: {
          capturedAt: new Date().toISOString(),
          summary: `Global autonomy ${enabled ? "ON" : "OFF"}`,
          values: { automationMasterOn: enabled },
        },
      }),
    }));
  }, []);

  const setItemAutomationEnabled = useCallback(
    (itemId: string, enabled: boolean) => {
      setState((current) => {
        const item = current.inventory.find((entry) => entry.id === itemId);
        if (!item || item.automationEnabled === enabled) return current;

        const updated: CommandCenterInventoryItem = {
          ...item,
          automationEnabled: enabled,
          automationMode:
            enabled && item.automationMode === "assist"
              ? "autobuy"
              : item.automationMode,
        };

        return {
          ...current,
          inventory: current.inventory.map((entry) =>
            entry.id === itemId ? updated : entry,
          ),
          pausedItemIds: enabled
            ? current.pausedItemIds.filter((id) => id !== itemId)
            : current.pausedItemIds,
          activity: addActivity(current, {
            module: "inventory",
            action: "task_execution_mode_changed",
            message: `Owner set ${item.name} to ${enabled ? "Jourvis automatic" : "Manual"} handling.`,
            actor: "owner",
            executionMode: "manual",
            reason: enabled
              ? "The owner chose to let Jourvis handle this recurring inventory task automatically within its configured limits."
              : "The owner chose to keep this recurring inventory task manual, so Jourvis will observe it but will not start purchasing automatically.",
            configuration: inventoryRuleSnapshot(updated, current.automationMasterOn),
            relatedEntityId: itemId,
          }),
        };
      });
    },
    [],
  );

  const adjustInventory = useCallback(
    (
      itemId: string,
      change: number,
      reason: CommandCenterStockAdjustmentReason,
    ) => {
      if (!Number.isFinite(change) || change === 0) return;

      setState((current) => {
        const item = current.inventory.find((entry) => entry.id === itemId);
        if (!item) return current;

        const nextCurrent = Math.max(0, Math.round((item.current + change) * 100) / 100);
        const actualChange = Math.round((nextCurrent - item.current) * 100) / 100;
        if (actualChange === 0) return current;

        const labels: Record<CommandCenterStockAdjustmentReason, string> = {
          external_delivery: "outside-Jourvis delivery",
          physical_count: "physical count correction",
          waste: "waste / spoilage",
          transfer: "stock transfer",
          other: "manual stock adjustment",
        };

        const updated = { ...item, current: nextCurrent };

        return {
          ...current,
          inventory: current.inventory.map((entry) =>
            entry.id === itemId ? updated : entry,
          ),
          activity: addActivity(current, {
            module: reason === "waste" ? "waste" : "inventory",
            action: reason === "waste" ? "waste_recorded" : "stock_adjusted",
            message:
              reason === "waste"
                ? `Owner recorded ${Math.abs(actualChange)} ${item.unit} of ${item.name} as waste / spoilage.`
                : `Owner adjusted ${item.name} by ${actualChange > 0 ? "+" : ""}${actualChange} ${item.unit}.`,
            actor: "owner",
            executionMode: "manual",
            reason:
              `The owner recorded a ${labels[reason]}. On-hand stock changed from ${item.current} to ${nextCurrent} ${item.unit}.`,
            configuration: inventoryRuleSnapshot(updated, current.automationMasterOn),
            relatedEntityId: item.id,
          }),
        };
      });
    },
    [],
  );

  const updatePurchaseQuantity = useCallback(
    (purchaseId: string, quantity: number) => {
      if (!Number.isFinite(quantity) || quantity <= 0) return;

      setState((current) => {
        const purchase = current.purchases.find((entry) => entry.id === purchaseId);
        if (!purchase) return current;
        if (
          [
            "awaiting_confirmation",
            "confirmed",
            "in_transit",
            "partial_received",
            "received",
            "rejected",
          ].includes(purchase.status)
        ) {
          return current;
        }

        const item = current.inventory.find((entry) => entry.id === purchase.itemId);
        if (!item) return current;

        const normalizedQuantity =
          Math.round(Math.max(item.packSize, quantity) * 100) / 100;
        if (normalizedQuantity === purchase.quantity) return current;

        const packs = Math.ceil(
          normalizedQuantity / Math.max(item.packSize, 0.01),
        );
        const effectivePackPrice =
          purchase.quotedPackPrice ?? item.packPrice;
        const deliveryFee = purchase.deliveryFee ?? 0;
        const nextTotal = packs * effectivePackPrice + deliveryFee;

        return {
          ...current,
          purchases: current.purchases.map((entry) => {
            if (entry.id !== purchaseId) return entry;

            const restartSupplierFlow = [
              "supplier_viewed",
              "quote_received",
              "counter_sent",
              "approved",
            ].includes(entry.status);

            return {
              ...entry,
              quantity: normalizedQuantity,
              estimatedTotal: packs * item.packPrice,
              quotedPackPrice: restartSupplierFlow
                ? undefined
                : entry.quotedPackPrice,
              quotedTotal: restartSupplierFlow
                ? undefined
                : entry.quotedPackPrice !== undefined
                  ? nextTotal
                  : entry.quotedTotal,
              deliveryFee: restartSupplierFlow
                ? undefined
                : entry.deliveryFee,
              etaDays: restartSupplierFlow
                ? undefined
                : entry.etaDays,
              counteroffersUsed: restartSupplierFlow
                ? 0
                : entry.counteroffersUsed,
              origin: restartSupplierFlow ? "owner" as const : entry.origin,
              buyerConfirmed: restartSupplierFlow
                ? item.purchasingMode === "fixed"
                : entry.buyerConfirmed,
              supplierConfirmed: restartSupplierFlow
                ? false
                : entry.supplierConfirmed,
              status: restartSupplierFlow
                ? item.purchasingMode === "quote"
                  ? "quote_requested" as const
                  : "requested" as const
                : entry.status,
              explanation: restartSupplierFlow
                ? "The owner changed the requested quantity, so Jourvis cleared the previous supplier terms and restarted the supplier workflow."
                : "The owner changed the requested quantity before supplier agreement; Jourvis recalculated the request.",
            };
          }),
          activity: addActivity(current, {
            module: "purchasing",
            action: "purchase_quantity_updated",
            message: `${purchase.id}: owner changed ${item.name} quantity from ${purchase.quantity} to ${normalizedQuantity} ${item.unit}.`,
            actor: "owner",
            executionMode: "manual",
            reason:
              "The owner manually revised the requested quantity before supplier confirmation. Jourvis recalculated the expected total and returned the request to the appropriate supplier step.",
            configuration: inventoryRuleSnapshot(item, current.automationMasterOn),
            relatedEntityId: item.id,
            relatedRequestId: purchase.id,
          }),
        };
      });
    },
    [],
  );

  const receivePurchase = useCallback(
    (purchaseId: string, quantity: number) => {
      if (!Number.isFinite(quantity) || quantity <= 0) return;

      setState((current) => {
        const purchase = current.purchases.find((entry) => entry.id === purchaseId);
        if (!purchase) return current;
        const item = current.inventory.find((entry) => entry.id === purchase.itemId);
        if (!item) return current;

        const alreadyReceived = purchase.receivedQuantity ?? 0;
        const remaining = Math.max(0, purchase.quantity - alreadyReceived);
        const receivedNow = Math.min(remaining, Math.round(quantity * 100) / 100);
        if (receivedNow <= 0) return current;

        const receivedTotal = Math.round((alreadyReceived + receivedNow) * 100) / 100;
        const complete = receivedTotal >= purchase.quantity - 0.001;
        const updatedItem = {
          ...item,
          current: Math.round((item.current + receivedNow) * 100) / 100,
          incoming: Math.max(0, Math.round((item.incoming - receivedNow) * 100) / 100),
        };

        return {
          ...current,
          purchases: current.purchases.map((entry) =>
            entry.id === purchaseId
              ? {
                  ...entry,
                  receivedQuantity: receivedTotal,
                  status: complete ? "received" : "partial_received",
                  explanation: complete
                    ? "Physical delivery fully received."
                    : "Physical delivery partially received; remaining quantity stays incoming.",
                }
              : entry,
          ),
          inventory: current.inventory.map((entry) =>
            entry.id === item.id ? updatedItem : entry,
          ),
          activity: addActivity(current, {
            module: "inventory",
            action: complete ? "delivery_received" : "delivery_partially_received",
            message: `${purchase.id}: owner received ${receivedNow} ${item.unit} of ${item.name}${complete ? "" : " (partial)"}.`,
            actor: "owner",
            executionMode: "manual",
            reason:
              `A person confirmed the physical delivery quantity. Jourvis moved only the confirmed ${receivedNow} ${item.unit} from incoming to on-hand stock; unreceived quantity remains incoming.`,
            configuration: inventoryRuleSnapshot(updatedItem, current.automationMasterOn),
            relatedEntityId: item.id,
            relatedRequestId: purchase.id,
          }),
        };
      });
    },
    [],
  );

  const startOwnerPurchase = useCallback((itemId: string) => {
    setState((current) => {
      const item = current.inventory.find((entry) => entry.id === itemId);
      if (!item) return current;

      const alreadyActive = current.purchases.some(
        (purchase) =>
          purchase.itemId === itemId &&
          isPurchaseActive(purchase.status),
      );
      if (alreadyActive) return current;

      const quantity = suggestedPurchaseQuantity(item);
      if (quantity <= 0) return current;

      const purchase = createPurchase(current, item, "owner");
      return {
        ...current,
        purchases: [purchase, ...current.purchases],
        pausedItemIds: current.pausedItemIds.filter((id) => id !== itemId),
        activity: addActivity(current, {
          module: "purchasing",
          action: "owner_started_purchase",
          message: `Owner started ${purchase.id} for ${item.name} from the supplier restock suggestions.`,
          actor: "owner",
          executionMode: "manual",
          reason:
            "The owner manually approved the suggested restock. Jourvis started a separate item-scoped supplier workflow so this item's authority and audit trail remain independent.",
          configuration: inventoryRuleSnapshot(item, current.automationMasterOn),
          relatedEntityId: item.id,
          relatedRequestId: purchase.id,
        }),
      };
    });
  }, []);

  const saveMenuItem = useCallback(
    (
      draft: Omit<
        CommandCenterMenuItem,
        | "id"
        | "printedName"
        | "dishKey"
        | "referencePrice"
        | "referenceSource"
        | "referencePublicationDate"
        | "currentPriceVerified"
      > & { id?: string },
    ) => {
      setState((current) => {
        const name = draft.name.trim();
        const category = draft.category.trim();
        if (!name || !category) return current;

        const existing = draft.id
          ? current.menuItems.find((item) => item.id === draft.id)
          : undefined;
        const currentPrice =
          draft.currentPrice !== undefined &&
          Number.isFinite(draft.currentPrice) &&
          draft.currentPrice >= 0
            ? Math.round(draft.currentPrice * 100) / 100
            : undefined;
        const id =
          existing?.id ??
          nextEntityId(
            "menu",
            name,
            current.menuItems.map((item) => item.id),
          );
        const nextItem: CommandCenterMenuItem = existing
          ? {
              ...existing,
              name,
              category,
              variant: draft.variant?.trim() || undefined,
              description: draft.description?.trim() || undefined,
              currentPrice,
              currentPriceVerified: currentPrice !== undefined,
              active: draft.active,
              available: draft.available,
              recipeId: draft.recipeId || undefined,
            }
          : {
              id,
              name,
              printedName: name,
              dishKey: entitySlug(name),
              category,
              variant: draft.variant?.trim() || undefined,
              description: draft.description?.trim() || undefined,
              currentPrice,
              referenceSource: "demo",
              currentPriceVerified: currentPrice !== undefined,
              active: draft.active,
              available: draft.available,
              recipeId: draft.recipeId || undefined,
            };

        return {
          ...current,
          menuItems: existing
            ? current.menuItems.map((item) =>
                item.id === existing.id ? nextItem : item,
              )
            : [nextItem, ...current.menuItems],
          activity: addActivity(current, {
            module: "menu",
            action: existing ? "menu_item_updated" : "menu_item_created",
            message: existing
              ? `Owner updated menu item ${name}.`
              : `Owner created menu item ${name}.`,
            actor: "owner",
            executionMode: "manual",
            reason:
              "The owner changed live menu configuration in Command Center. Archived reference price/source fields remain separate and unchanged.",
            relatedEntityId: id,
          }),
        };
      });
    },
    [],
  );

  const archiveMenuItem = useCallback((itemId: string) => {
    setState((current) => {
      const item = current.menuItems.find((entry) => entry.id === itemId);
      if (!item || !item.active) return current;

      return {
        ...current,
        menuItems: current.menuItems.map((entry) =>
          entry.id === itemId
            ? { ...entry, active: false, available: false }
            : entry,
        ),
        activity: addActivity(current, {
          module: "menu",
          action: "menu_item_archived",
          message: `Owner archived menu item ${item.name}.`,
          actor: "owner",
          executionMode: "manual",
          reason:
            "Archiving keeps the menu history and archived source reference while removing the item from active service.",
          relatedEntityId: itemId,
        }),
      };
    });
  }, []);

  const saveRecipe = useCallback(
    (draft: Omit<CommandCenterRecipe, "id"> & { id?: string }) => {
      setState((current) => {
        const name = draft.name.trim();
        if (!name) return current;

        const existing = draft.id
          ? current.recipes.find((recipe) => recipe.id === draft.id)
          : undefined;
        const inventoryIds = new Set(current.inventory.map((item) => item.id));
        const ingredients = Object.fromEntries(
          Object.entries(draft.ingredients)
            .filter(
              ([itemId, amount]) =>
                inventoryIds.has(itemId) &&
                Number.isFinite(amount) &&
                amount > 0,
            )
            .map(([itemId, amount]) => [
              itemId,
              Math.round(amount * 1000) / 1000,
            ]),
        );
        const id =
          existing?.id ??
          nextEntityId(
            "recipe",
            name,
            current.recipes.map((recipe) => recipe.id),
          );
        const nextRecipe: CommandCenterRecipe = {
          id,
          name,
          description: draft.description.trim(),
          notes: draft.notes?.trim() || undefined,
          active: draft.active,
          ingredients,
        };

        return {
          ...current,
          recipes: existing
            ? current.recipes.map((recipe) =>
                recipe.id === existing.id ? nextRecipe : recipe,
              )
            : [nextRecipe, ...current.recipes],
          activity: addActivity(current, {
            module: "recipes",
            action: existing ? "recipe_updated" : "recipe_created",
            message: existing
              ? `Owner updated recipe ${name}.`
              : `Owner created recipe ${name}.`,
            actor: "owner",
            executionMode: "manual",
            reason:
              `The owner saved a recipe with ${Object.keys(ingredients).length} inventory ingredient mapping${Object.keys(ingredients).length === 1 ? "" : "s"}. Menu economics and future POS deductions now use this recipe configuration.`,
            relatedEntityId: id,
          }),
        };
      });
    },
    [],
  );

  const archiveRecipe = useCallback((recipeId: string) => {
    setState((current) => {
      const recipe = current.recipes.find((entry) => entry.id === recipeId);
      if (!recipe || !recipe.active) return current;

      return {
        ...current,
        recipes: current.recipes.map((entry) =>
          entry.id === recipeId ? { ...entry, active: false } : entry,
        ),
        activity: addActivity(current, {
          module: "recipes",
          action: "recipe_archived",
          message: `Owner archived recipe ${recipe.name}.`,
          actor: "owner",
          executionMode: "manual",
          reason:
            "Archiving preserves historical menu links and recipe configuration while preventing the recipe from being used for new simulated POS deductions.",
          relatedEntityId: recipeId,
        }),
      };
    });
  }, []);

  const createInventoryItem = useCallback(
    (draft: Omit<CommandCenterInventoryItem, "id">) => {
      const id = nextEntityId(
        "inventory",
        draft.name,
        state.inventory.map((item) => item.id),
      );

      setState((current) => {
        if (current.inventory.some((item) => item.id === id)) return current;

        const supplierExists = current.suppliers.some(
          (supplier) => supplier.id === draft.supplierId,
        );
        const normalized: CommandCenterInventoryItem = {
          ...normalizeInventoryAuthorityConfiguration({
            ...draft,
            id,
          }),
          supplierId: supplierExists ? draft.supplierId : "",
          contactId: supplierExists ? draft.contactId : "",
          current: Math.max(0, draft.current),
          fullLevel: Math.max(0.01, draft.fullLevel),
          reorderAt: Math.max(0, Math.min(draft.reorderAt, draft.fullLevel)),
          incoming: Math.max(0, draft.incoming),
          packSize: Math.max(0.01, draft.packSize),
          packPrice: Math.max(0, draft.packPrice),
          leadDays: Math.max(0, draft.leadDays),
          dailyUse:
            draft.dailyUse === undefined ? undefined : Math.max(0, draft.dailyUse),
          automationTriggerPercent: Math.max(
            0,
            Math.min(100, draft.automationTriggerPercent),
          ),
          maxAutoOrderQty: Math.max(0, draft.maxAutoOrderQty),
          maxAutoOrderSpend: Math.max(0, draft.maxAutoOrderSpend),
          maxCounteroffers: Math.max(0, draft.maxCounteroffers),
          maxDeliveryFee: Math.max(0, draft.maxDeliveryFee),
          maxLeadDays: Math.max(0, draft.maxLeadDays),
        };

        return {
          ...current,
          inventory: [normalized, ...current.inventory],
          suppliers: current.suppliers.map((supplier) =>
            supplier.id === normalized.supplierId &&
            !supplier.itemIds.includes(id)
              ? { ...supplier, itemIds: [...supplier.itemIds, id] }
              : supplier,
          ),
          activity: addActivity(current, {
            module: "inventory",
            action: "inventory_item_created",
            message: `Owner created inventory item ${normalized.name} from the recipe workflow.`,
            actor: "owner",
            executionMode: "manual",
            reason:
              "The owner needed an ingredient that did not yet exist in Inventory. Jourvis created the inventory configuration first so recipes, stock, supplier routing, and future purchasing can share one canonical ingredient.",
            configuration: inventoryRuleSnapshot(
              normalized,
              current.automationMasterOn,
            ),
            relatedEntityId: id,
          }),
        };
      });

      return id;
    },
    [state.inventory],
  );

  const recordRecipeSale = useCallback(
    (recipeId: string, quantity = 1) => {
      if (!Number.isFinite(quantity) || quantity <= 0) return;

      setState((current) => {
        const recipe = current.recipes.find((entry) => entry.id === recipeId);
        if (!recipe || !recipe.active) return current;

        const shortages = Object.entries(recipe.ingredients).filter(([itemId, amount]) => {
          const item = current.inventory.find((entry) => entry.id === itemId);
          return !item || item.current < amount * quantity;
        });

        if (shortages.length) {
          return {
            ...current,
            activity: addActivity(current, {
              module: "recipes",
              action: "recipe_sale_blocked",
              message: `Simulated POS sale for ${quantity} × ${recipe.name} could not deduct inventory.`,
              actor: "external",
              executionMode: "automatic",
              reason:
                "The recipe mapping found insufficient on-hand stock for at least one required ingredient, so Jourvis did not create negative inventory.",
            }),
          };
        }

        const nextInventory = current.inventory.map((item) => {
          const amount = recipe.ingredients[item.id] ?? 0;
          if (!amount) return item;
          return {
            ...item,
            current: Math.max(
              0,
              Math.round((item.current - amount * quantity) * 1000) / 1000,
            ),
          };
        });

        const ingredientSummary = Object.entries(recipe.ingredients)
          .map(([itemId, amount]) => {
            const item = current.inventory.find((entry) => entry.id === itemId);
            return item
              ? `${item.name} ${Math.round(amount * quantity * 1000) / 1000} ${item.unit}`
              : itemId;
          })
          .join(", ");

        return {
          ...current,
          inventory: nextInventory,
          activity: addActivity(current, {
            module: "recipes",
            action: "recipe_inventory_deducted",
            message: `POS sale: ${quantity} × ${recipe.name}. Jourvis deducted recipe inventory automatically.`,
            actor: "external",
            executionMode: "automatic",
            reason:
              `A simulated POS sale matched the configured recipe. Jourvis automatically applied the recipe quantities to inventory: ${ingredientSummary}.`,
          }),
        };
      });
    },
    [],
  );

  const resumeItem = useCallback((itemId: string) => {
    setState((current) => {
      const item = current.inventory.find((entry) => entry.id === itemId);
      return {
        ...current,
        pausedItemIds: current.pausedItemIds.filter((id) => id !== itemId),
        activity: addActivity(current, {
          module: "inventory",
          action: "automation_resumed",
          message: `Owner resumed Jourvis for ${item?.name ?? itemId}.`,
          actor: "owner",
          executionMode: "manual",
          reason: "The owner manually resumed this item's automation.",
          configuration: item
            ? inventoryRuleSnapshot(item, current.automationMasterOn)
            : undefined,
          relatedEntityId: itemId,
        }),
      };
    });
  }, []);

  const resetDemo = useCallback(() => {
    window.localStorage.removeItem(storageKey(businessId));
    const seed = createSeed(businessId);
    setState({
      ...seed,
      activity: addActivity(seed, {
        module: "system",
        action: "demo_reset",
        message: "Owner reset the Command Center demo state.",
        actor: "owner",
        executionMode: "manual",
        reason: "The owner explicitly requested a clean demo state. Previous browser-stored Command Center activity and runtime data were cleared.",
      }),
    });
  }, [businessId]);

  const value = useMemo(
    () => ({
      businessId,
      state,
      tasks,
      loading,
      actOnTask,
      applyInventoryConfiguration,
      setAutomationMasterOn,
      setItemAutomationEnabled,
      adjustInventory,
      receivePurchase,
      updatePurchaseQuantity,
      startOwnerPurchase,
      saveMenuItem,
      archiveMenuItem,
      saveRecipe,
      archiveRecipe,
      createInventoryItem,
      recordRecipeSale,
      resumeItem,
      resetDemo,
    }),
    [
      actOnTask,
      businessId,
      loading,
      resetDemo,
      resumeItem,
      applyInventoryConfiguration,
      setAutomationMasterOn,
      setItemAutomationEnabled,
      adjustInventory,
      receivePurchase,
      updatePurchaseQuantity,
      startOwnerPurchase,
      saveMenuItem,
      archiveMenuItem,
      saveRecipe,
      archiveRecipe,
      createInventoryItem,
      recordRecipeSale,
      state,
      tasks,
    ],
  );

  return (
    <RuntimeContext.Provider value={value}>
      {children}
    </RuntimeContext.Provider>
  );
}

export function useCommandCenterRuntime() {
  const value = useContext(RuntimeContext);
  if (!value) {
    throw new Error("useCommandCenterRuntime must be used inside CommandCenterRuntimeProvider");
  }
  return value;
}
