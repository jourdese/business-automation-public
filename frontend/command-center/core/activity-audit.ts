import type {
  CommandCenterActivity,
  CommandCenterActivityConfiguration,
  CommandCenterInventoryItem,
  CommandCenterRuntimeState,
} from "./runtime";

export type ActivityInput = {
  module: string;
  action: string;
  message: string;
  actor: CommandCenterActivity["actor"];
  executionMode: CommandCenterActivity["executionMode"];
  reason: string;
  configuration?: CommandCenterActivityConfiguration;
  relatedEntityId?: string;
  relatedRequestId?: string;
  at?: string;
};

export function inventoryRuleSnapshot(
  item: CommandCenterInventoryItem,
  automationMasterOn: boolean,
  capturedAt = new Date().toISOString(),
): CommandCenterActivityConfiguration {
  const mode =
    item.automationMode === "autobuy"
      ? "Buy within limits"
      : item.automationMode === "auto_contact"
        ? "Contact supplier"
        : "Watch only";

  return {
    capturedAt,
    summary:
      `Global autonomy ${automationMasterOn ? "ON" : "OFF"} · ` +
      `item automation ${item.automationEnabled ? "ON" : "OFF"} · ` +
      `${mode} · act at ${item.automationTriggerPercent}% · ` +
      `ask owner above ₱${Math.round(item.maxAutoOrderSpend).toLocaleString("en-PH")} · ` +
      `auto-accept pack ₱${Math.round(item.autoAcceptPackPrice).toLocaleString("en-PH")} · ` +
      `hard ceiling ₱${Math.round(item.hardMaxPackPrice).toLocaleString("en-PH")} · ` +
      `auto-negotiate ${item.autoNegotiate ? "ON" : "OFF"}`,
    values: {
      automationMasterOn,
      automationEnabled: item.automationEnabled,
      automationMode: item.automationMode,
      automationTriggerPercent: item.automationTriggerPercent,
      reorderAt: item.reorderAt,
      current: item.current,
      fullLevel: item.fullLevel,
      incoming: item.incoming,
      purchasingMode: item.purchasingMode,
      packSize: item.packSize,
      packPrice: item.packPrice,
      targetPackPrice: item.targetPackPrice,
      autoAcceptPackPrice: item.autoAcceptPackPrice,
      hardMaxPackPrice: item.hardMaxPackPrice,
      maxAutoOrderQty: item.maxAutoOrderQty,
      maxAutoOrderSpend: item.maxAutoOrderSpend,
      autoNegotiate: item.autoNegotiate,
      maxCounteroffers: item.maxCounteroffers,
      maxDeliveryFee: item.maxDeliveryFee,
      maxLeadDays: item.maxLeadDays,
      supplierId: item.supplierId,
      leadDays: item.leadDays,
    },
  };
}

export function createActivity(
  state: CommandCenterRuntimeState,
  input: ActivityInput,
): CommandCenterActivity {
  const at = input.at ?? new Date().toISOString();
  const randomId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  let id = `activity-${randomId}`;
  let suffix = 2;
  while (state.activity.some((entry) => entry.id === id)) {
    id = `activity-${randomId}-${suffix}`;
    suffix += 1;
  }
  return {
    id,
    at,
    module: input.module,
    action: input.action,
    message: input.message,
    actor: input.actor,
    executionMode: input.executionMode,
    reason: input.reason,
    configuration: input.configuration,
    relatedEntityId: input.relatedEntityId,
    relatedRequestId: input.relatedRequestId,
  };
}

export function prependActivity(
  state: CommandCenterRuntimeState,
  input: ActivityInput,
) {
  return [createActivity(state, input), ...state.activity].slice(0, 250);
}

export function normalizeActivity(
  activity: Partial<CommandCenterActivity> &
    Pick<CommandCenterActivity, "id" | "at" | "module" | "message">,
): CommandCenterActivity {
  return {
    id: activity.id,
    at: activity.at,
    module: activity.module,
    message: activity.message,
    action: activity.action ?? "legacy_event",
    actor: activity.actor ?? "system",
    executionMode: activity.executionMode ?? "system",
    reason:
      activity.reason ??
      "This activity was recorded before detailed execution reasoning was enabled.",
    configuration: activity.configuration,
    relatedEntityId: activity.relatedEntityId,
    relatedRequestId: activity.relatedRequestId,
  };
}
