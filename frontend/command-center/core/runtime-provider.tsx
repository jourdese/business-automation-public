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
        message: "Command Center runtime initialized.",
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
    explanation:
      origin === "jourvis"
        ? "Jourvis started this purchase automatically because stock reached its configured trigger."
        : "The owner approved Jourvis' suggested restock.",
  };
}

function addActivity(
  state: CommandCenterRuntimeState,
  module: string,
  message: string,
) {
  return [
    {
      id: `activity-${Date.now()}-${state.activity.length + 1}`,
      at: new Date().toISOString(),
      module,
      message,
    },
    ...state.activity,
  ].slice(0, 80);
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
      activity: addActivity(
        next,
        "purchasing",
        `Jourvis automatically started ${purchase.id} for ${item.name}.`,
      ),
    };
    activeItemIds.add(item.id);
  }
  return next;
}

function advanceOneAutonomousStep(
  state: CommandCenterRuntimeState,
): CommandCenterRuntimeState {
  const purchase = state.purchases.find((candidate) => {
    if (candidate.status === "requested") return true;
    if (candidate.status === "quote_requested") return true;
    if (candidate.status === "approved") return true;
    if (candidate.status === "confirmed") return true;
    if (
      candidate.status === "quote_received" &&
      candidate.origin === "jourvis"
    ) {
      const item = state.inventory.find((entry) => entry.id === candidate.itemId);
      if (!item || item.automationMode !== "autobuy") return false;
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
      ? addActivity(state, "purchasing", message)
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
        setState(JSON.parse(stored) as CommandCenterRuntimeState);
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
              activity: addActivity(
                current,
                task.module,
                `${task.title}: owner approved. Jourvis continued the workflow.`,
              ),
            };
          }
          if (item) {
            const nextPurchase = createPurchase(current, item, "owner");
            return {
              ...current,
              purchases: [nextPurchase, ...current.purchases],
              pausedItemIds: current.pausedItemIds.filter((id) => id !== item.id),
              activity: addActivity(
                current,
                task.module,
                `${task.title}: owner approved. Jourvis started ${nextPurchase.id}.`,
              ),
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
            activity: addActivity(
              current,
              task.module,
              `${task.title}: owner rejected. Jourvis paused this item until its rule is updated or resumed.`,
            ),
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
            activity: addActivity(
              current,
              "inventory",
              `${purchase.id}: received ${remaining} ${item.unit} of ${item.name}.`,
            ),
          };
        }

        if (action === "resume" && item) {
          return {
            ...current,
            pausedItemIds: current.pausedItemIds.filter((id) => id !== item.id),
            activity: addActivity(
              current,
              task.module,
              `Jourvis resumed automation for ${item.name}.`,
            ),
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
        activity: addActivity(
          current,
          "inventory",
          `Jourvis rule updated for ${current.inventory.find((item) => item.id === itemId)?.name ?? itemId}.`,
        ),
      }));
    },
    [],
  );

  const setAutomationMasterOn = useCallback((enabled: boolean) => {
    setState((current) => ({
      ...current,
      automationMasterOn: enabled,
      activity: addActivity(
        current,
        "system",
        `Jourvis autonomous operations switched ${enabled ? "ON" : "OFF"}.`,
      ),
    }));
  }, []);

  const resumeItem = useCallback((itemId: string) => {
    setState((current) => ({
      ...current,
      pausedItemIds: current.pausedItemIds.filter((id) => id !== itemId),
      activity: addActivity(current, "inventory", `Jourvis resumed ${itemId}.`),
    }));
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
