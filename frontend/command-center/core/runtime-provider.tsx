"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { resolveCommandCenterBusiness } from "./business-registry";
import {
  canAdvancePurchase,
  estimatedPurchaseTotal,
  evaluatePurchaseAuthority,
  isPurchaseActive,
  normalizeInventoryAuthorityConfiguration,
  suggestedPurchaseQuantity,
  type CommandCenterInventoryItem,
  type CommandCenterPurchase,
  type CommandCenterRuntimeState,
  type CommandCenterStockAdjustmentReason,
  type JourvisRuntimeTask,
  type JourvisTaskAction,
} from "./runtime";
import { deriveJourvisTasks } from "./task-engine";
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
    pausedItemIds: [],
    activity: [],
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
    quantity,
    status: item.purchasingMode === "quote" ? "quote_requested" : "requested",
    estimatedTotal: estimatedPurchaseTotal(item, quantity),
    createdAt: new Date().toISOString(),
    origin,
    automationMode: item.automationMode,
    counteroffersUsed: 0,
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
    recipes: stored.recipes ?? seed.recipes,
    pausedItemIds: stored.pausedItemIds ?? [],
    purchases: stored.purchases ?? [],
    activity: (stored.activity ?? []).map((entry) => normalizeActivity(entry)),
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
      return percent <= candidate.automationTriggerPercent;
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
    return percent <= item.automationTriggerPercent;
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

  if (purchase.status === "requested") {
    replacement = { ...purchase, status: "confirmed", etaDays: item.leadDays };
    message = `${purchase.id}: supplier confirmed the fixed-price purchase for ${item.name}.`;
  } else if (purchase.status === "quote_requested") {
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
  } else if (purchase.status === "quote_received") {
    const authority = evaluatePurchaseAuthority(item, purchase);
    if (authority.withinAutoAccept) {
      replacement = {
        ...purchase,
        status: "approved",
        explanation:
          "Jourvis accepted the supplier quote automatically because price, spend, quantity, delivery fee, and lead time stayed inside its authority.",
      };
      message = `${purchase.id}: Jourvis accepted the quote automatically within configured limits.`;
    } else if (authority.canNegotiate) {
      replacement = {
        ...purchase,
        status: "counter_sent",
        quotedPackPrice: item.targetPackPrice,
        quotedTotal: authority.negotiatedTotal,
        counteroffersUsed: authority.counteroffersUsed + 1,
        explanation:
          "Jourvis automatically countered at the configured target price because the supplier quote was outside the auto-accept range but still within negotiation authority.",
      };
      message = `${purchase.id}: Jourvis automatically countered at ₱${Math.round(item.targetPackPrice).toLocaleString("en-PH")} per pack.`;
    }
  } else if (purchase.status === "counter_sent") {
    replacement = {
      ...purchase,
      status: "approved",
      explanation:
        "The supplier accepted Jourvis' automatic counteroffer within the configured negotiation limits.",
    };
    message = `${purchase.id}: supplier accepted Jourvis' counteroffer.`;
  } else if (purchase.status === "approved") {
    replacement = { ...purchase, status: "confirmed" };
    message = `${purchase.id}: supplier confirmed the approved purchase.`;
  } else if (purchase.status === "confirmed") {
    replacement = { ...purchase, status: "in_transit" };
    message = `${purchase.id}: supplier marked the delivery in transit.`;
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
          action:
            purchase.status === "requested"
              ? "supplier_confirmed"
              : purchase.status === "quote_requested"
                ? "quote_received"
                : purchase.status === "quote_received"
                  ? replacement.status === "counter_sent"
                    ? "quote_auto_countered"
                    : "quote_auto_approved"
                  : purchase.status === "counter_sent"
                    ? "counteroffer_accepted"
                    : purchase.status === "approved"
                      ? "supplier_confirmed"
                      : "shipment_in_transit",
          message,
          actor:
            purchase.status === "quote_received"
              ? "jourvis"
              : "external",
          executionMode: "automatic",
          reason:
            purchase.status === "quote_received"
              ? replacement.status === "counter_sent"
                ? `Jourvis automatically negotiated because the quote was outside auto-accept limits, auto-negotiate was enabled, the counteroffer count was below ${item.maxCounteroffers}, and the target price ₱${Math.round(item.targetPackPrice).toLocaleString("en-PH")} kept the resulting order within the configured spending and hard-price limits.`
                : `Jourvis accepted the quote automatically because total spend, pack price, quantity, delivery fee, and lead time all remained inside the configured authority limits.`
              : purchase.status === "quote_requested"
                ? "The supplier returned a quote in response to the purchase request. This was recorded automatically because no owner action created the supplier response."
                : purchase.status === "counter_sent"
                  ? "The supplier accepted the automatic counteroffer Jourvis had already sent within its negotiation authority."
                  : purchase.status === "confirmed"
                    ? "The supplier changed the purchase to in transit. Jourvis recorded the external status update automatically."
                    : "The supplier confirmed the purchase after the previous authorized step. Jourvis recorded the supplier response automatically.",
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
              purchases: current.purchases.map((entry) =>
                entry.id === purchase.id
                  ? { ...entry, status: "approved", explanation: "Owner approved the exception through Jourvis." }
                  : entry,
              ),
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
          ["confirmed", "in_transit", "partial_received", "received", "rejected"].includes(
            purchase.status,
          )
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
          purchases: current.purchases.map((entry) =>
            entry.id === purchaseId
              ? {
                  ...entry,
                  quantity: normalizedQuantity,
                  estimatedTotal:
                    packs * item.packPrice,
                  quotedTotal:
                    entry.quotedPackPrice !== undefined
                      ? nextTotal
                      : entry.quotedTotal,
                  status:
                    entry.status === "quote_received" ||
                    entry.status === "counter_sent" ||
                    entry.status === "approved"
                      ? item.purchasingMode === "quote"
                        ? "quote_requested"
                        : "requested"
                      : entry.status,
                  explanation:
                    "The owner changed the requested quantity, so Jourvis recalculated the request and returned it to the supplier workflow.",
                }
              : entry,
          ),
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

  const recordRecipeSale = useCallback(
    (recipeId: string, quantity = 1) => {
      if (!Number.isFinite(quantity) || quantity <= 0) return;

      setState((current) => {
        const recipe = current.recipes.find((entry) => entry.id === recipeId);
        if (!recipe) return current;

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
