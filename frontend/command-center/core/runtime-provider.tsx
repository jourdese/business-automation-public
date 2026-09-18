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
  estimatedPurchaseTotal,
  isPurchaseActive,
  suggestedPurchaseQuantity,
  type CommandCenterInventoryItem,
  type CommandCenterPurchase,
  type CommandCenterRuntimeState,
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
  updateInventoryItem: (
    itemId: string,
    patch: Partial<CommandCenterInventoryItem>,
  ) => void;
  applyInventoryConfiguration: (
    previous: CommandCenterInventoryItem,
    next: CommandCenterInventoryItem,
  ) => void;
  setAutomationMasterOn: (enabled: boolean) => void;
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
    automationMasterOn: true,
    inventory: [],
    purchases: [],
    suppliers: [],
    pausedItemIds: [],
    activity: [
      {
        id: "seed-generic",
        at: new Date(0).toISOString(),
        module: "system",
        action: "runtime_initialized",
        message: "Command Center runtime initialized.",
        actor: "system",
        executionMode: "system",
        reason: "The shared Jourvis Command Center runtime was initialized for this business.",
      },
    ],
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
  return {
    ...stored,
    activity: (stored.activity ?? []).map((entry) => normalizeActivity(entry)),
  };
}

function planAutonomousPurchases(
  state: CommandCenterRuntimeState,
): CommandCenterRuntimeState {
  if (!state.automationMasterOn) return state;

  const activeItemIds = new Set(
    state.purchases
      .filter((purchase) => isPurchaseActive(purchase.status))
      .map((purchase) => purchase.itemId),
  );

  let next = state;
  for (const item of state.inventory) {
    if (
      !item.automationEnabled ||
      item.automationMode === "assist" ||
      state.pausedItemIds.includes(item.id) ||
      activeItemIds.has(item.id)
    ) {
      continue;
    }

    const percent =
      (item.current / Math.max(item.fullLevel, 0.01)) * 100;
    if (percent > item.automationTriggerPercent) continue;

    const purchase = createPurchase(next, item, "jourvis");
    next = {
      ...next,
      purchases: [purchase, ...next.purchases],
      activity: addActivity(next, {
        module: "purchasing",
        action: "purchase_started",
        message: `Jourvis automatically started ${purchase.id} for ${item.name}.`,
        actor: "jourvis",
        executionMode: "automatic",
        reason:
          `${item.name} was at ${Math.round(percent)}% stock, at or below its ` +
          `${item.automationTriggerPercent}% Jourvis action trigger. Global autonomy and item automation were enabled, and the configured mode was ${item.automationMode}.`,
        configuration: inventoryRuleSnapshot(item, next.automationMasterOn),
        relatedEntityId: item.id,
        relatedRequestId: purchase.id,
      }),
    };
    activeItemIds.add(item.id);
  }
  return next;
}

function advanceOneAutonomousStep(
  state: CommandCenterRuntimeState,
): CommandCenterRuntimeState {
  const purchase = state.purchases.find((candidate) => {
    const item = state.inventory.find((entry) => entry.id === candidate.itemId);
    if (!item) return false;

    if (candidate.status === "requested") {
      if (candidate.origin === "owner") return true;
      if (candidate.automationMode !== "autobuy") return false;
      return (
        candidate.estimatedTotal <= item.maxAutoOrderSpend &&
        item.packPrice <= item.autoAcceptPackPrice
      );
    }
    if (candidate.status === "quote_requested") return true;
    if (candidate.status === "approved") return true;
    if (candidate.status === "confirmed") return true;
    if (
      candidate.status === "quote_received" &&
      candidate.origin === "jourvis" &&
      candidate.automationMode === "autobuy"
    ) {
      const quotedTotal = candidate.quotedTotal ?? candidate.estimatedTotal;
      const quotedPackPrice = candidate.quotedPackPrice ?? item.packPrice;
      return (
        quotedTotal <= item.maxAutoOrderSpend &&
        quotedPackPrice <= item.autoAcceptPackPrice
      );
    }
    return false;
  });

  if (!purchase) return state;
  const item = state.inventory.find((candidate) => candidate.id === purchase.itemId);
  if (!item) return state;

  let replacement: CommandCenterPurchase = purchase;
  let message = "";

  if (purchase.status === "requested") {
    replacement = { ...purchase, status: "confirmed" };
    message = `${purchase.id}: supplier confirmed the fixed-price purchase for ${item.name}.`;
  } else if (purchase.status === "quote_requested") {
    const quotedPackPrice = Math.round(item.packPrice * 1.05);
    const quotedTotal =
      Math.ceil(purchase.quantity / Math.max(item.packSize, 0.01)) *
      quotedPackPrice +
      150;
    replacement = {
      ...purchase,
      status: "quote_received",
      quotedPackPrice,
      quotedTotal,
    };
    message = `${purchase.id}: supplier returned a quote for ${item.name}.`;
  } else if (purchase.status === "quote_received") {
    replacement = {
      ...purchase,
      status: "approved",
      explanation:
        "Jourvis accepted the supplier quote automatically because the price and total stayed inside its authority.",
    };
    message = `${purchase.id}: Jourvis accepted the quote automatically within configured limits.`;
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
                  ? "quote_auto_approved"
                  : purchase.status === "approved"
                    ? "supplier_confirmed"
                    : "shipment_in_transit",
          message,
          actor:
            purchase.status === "quote_received" ? "jourvis" : "external",
          executionMode: "automatic",
          reason:
            purchase.status === "quote_received"
              ? `Jourvis accepted the quote automatically because the quoted total ₱${Math.round(purchase.quotedTotal ?? purchase.estimatedTotal).toLocaleString("en-PH")} was within the configured ₱${Math.round(item.maxAutoOrderSpend).toLocaleString("en-PH")} order limit and the quoted pack price ₱${Math.round(purchase.quotedPackPrice ?? item.packPrice).toLocaleString("en-PH")} was within the ₱${Math.round(item.autoAcceptPackPrice).toLocaleString("en-PH")} pack-price limit.`
              : purchase.status === "quote_requested"
                ? "The supplier returned a quote in response to the purchase request. This was recorded automatically because no owner action created the supplier response."
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
  }, []);

  useEffect(() => {
    if (loading || state.business.id !== businessId) return;
    window.localStorage.setItem(storageKey(businessId), JSON.stringify(state));
  }, [businessId, loading, state]);

  useEffect(() => {
    if (loading) return;
    setState((current) => {
      const planned = planAutonomousPurchases(current);
      return planned === current ? current : planned;
    });
  }, [loading, state.automationMasterOn, state.inventory, state.pausedItemIds]);

  useEffect(() => {
    if (loading) return;
    const hasWork = state.purchases.some((purchase) =>
      ["requested", "quote_requested", "approved", "confirmed"].includes(
        purchase.status,
      ) ||
      (
        purchase.status === "quote_received" &&
        purchase.origin === "jourvis" &&
        state.inventory.some((item) =>
          item.id === purchase.itemId &&
          item.automationMode === "autobuy" &&
          (purchase.quotedTotal ?? purchase.estimatedTotal) <= item.maxAutoOrderSpend &&
          (purchase.quotedPackPrice ?? item.packPrice) <= item.autoAcceptPackPrice
        )
      ),
    );
    if (!hasWork) return;

    const timer = window.setTimeout(() => {
      setState((current) => advanceOneAutonomousStep(current));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [loading, state.inventory, state.purchases]);

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

  const updateInventoryItem = useCallback(
    (itemId: string, patch: Partial<CommandCenterInventoryItem>) => {
      setState((current) => ({
        ...current,
        inventory: current.inventory.map((item) =>
          item.id === itemId ? { ...item, ...patch } : item,
        ),
        pausedItemIds: current.pausedItemIds.filter((id) => id !== itemId),
      }));
    },
    [],
  );

  const applyInventoryConfiguration = useCallback(
    (
      previous: CommandCenterInventoryItem,
      next: CommandCenterInventoryItem,
    ) => {
      setState((current) => {
        const changed = (Object.keys(next) as Array<keyof CommandCenterInventoryItem>)
          .filter((key) => next[key] !== previous[key])
          .map((key) => `${String(key)}: ${String(previous[key])} → ${String(next[key])}`);

        if (!changed.length) return current;

        return {
          ...current,
          inventory: current.inventory.map((item) =>
            item.id === next.id ? next : item,
          ),
          pausedItemIds: current.pausedItemIds.filter((id) => id !== next.id),
          activity: addActivity(current, {
            module: "inventory",
            action: "configuration_updated",
            message: `Owner updated Jourvis configuration for ${next.name}.`,
            actor: "owner",
            executionMode: "manual",
            reason: `The owner changed the operating rule through Jourvis Update. Changed settings: ${changed.join("; ")}.`,
            configuration: inventoryRuleSnapshot(next, current.automationMasterOn),
            relatedEntityId: next.id,
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
    setState(createSeed(businessId));
  }, [businessId]);

  const value = useMemo(
    () => ({
      businessId,
      state,
      tasks,
      loading,
      actOnTask,
      updateInventoryItem,
      applyInventoryConfiguration,
      setAutomationMasterOn,
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
      state,
      tasks,
      updateInventoryItem,
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
