import type {
  CommandCenterActivity,
  CommandCenterPurchase,
  CommandCenterRuntimeState,
} from "./runtime.ts";

export type CommandCenterSupplierPerformanceRow = {
  supplierId: string;
  supplierName: string;
  requestCount: number;
  activeCount: number;
  receivedCount: number;
  rejectedCount: number;
  closedCount: number;
  completionRatePercent: number | null;
  receivedSpend: number;
  averageViewMinutes: number | null;
  averageQuoteMinutes: number | null;
  averageConfirmationMinutes: number | null;
  averageReceiptHours: number | null;
};

export type CommandCenterSupplierPerformance = {
  suppliers: CommandCenterSupplierPerformanceRow[];
  requestCount: number;
  closedCount: number;
  receivedCount: number;
  completionRatePercent: number | null;
  averageViewMinutes: number | null;
  averageQuoteMinutes: number | null;
  averageConfirmationMinutes: number | null;
  averageReceiptHours: number | null;
};

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]) {
  if (!values.length) return null;
  return round(
    values.reduce((sum, value) => sum + value, 0) /
      values.length,
  );
}

function purchaseValue(purchase: CommandCenterPurchase) {
  return Math.max(
    0,
    purchase.quotedTotal ?? purchase.estimatedTotal ?? 0,
  );
}

function eventDurationMinutes(
  purchase: CommandCenterPurchase,
  activity: CommandCenterActivity[],
  actions: string[],
) {
  const createdAt = Date.parse(purchase.createdAt);
  if (!Number.isFinite(createdAt)) return null;

  const event = activity
    .filter(
      (entry) =>
        entry.relatedRequestId === purchase.id &&
        actions.includes(entry.action),
    )
    .sort(
      (left, right) =>
        Date.parse(left.at) - Date.parse(right.at),
    )[0];
  if (!event) return null;

  const at = Date.parse(event.at);
  if (!Number.isFinite(at) || at < createdAt) return null;
  return (at - createdAt) / 60_000;
}

export function buildCommandCenterSupplierPerformance(
  state: CommandCenterRuntimeState,
): CommandCenterSupplierPerformance {
  const rows = state.suppliers.map(
    (supplier): CommandCenterSupplierPerformanceRow => {
      const purchases = state.purchases.filter(
        (purchase) => purchase.supplierId === supplier.id,
      );
      const active = purchases.filter(
        (purchase) =>
          purchase.status !== "received" &&
          purchase.status !== "rejected",
      );
      const received = purchases.filter(
        (purchase) => purchase.status === "received",
      );
      const rejected = purchases.filter(
        (purchase) => purchase.status === "rejected",
      );
      const closedCount = received.length + rejected.length;

      const viewMinutes = purchases.flatMap((purchase) => {
        const value = eventDurationMinutes(
          purchase,
          state.activity,
          ["supplier_viewed"],
        );
        return value === null ? [] : [value];
      });
      const quoteMinutes = purchases.flatMap((purchase) => {
        const value = eventDurationMinutes(
          purchase,
          state.activity,
          ["quote_received"],
        );
        return value === null ? [] : [value];
      });
      const confirmationMinutes = purchases.flatMap(
        (purchase) => {
          const value = eventDurationMinutes(
            purchase,
            state.activity,
            ["supplier_confirmed"],
          );
          return value === null ? [] : [value];
        },
      );
      const receiptHours = received.flatMap((purchase) => {
        const value = eventDurationMinutes(
          purchase,
          state.activity,
          ["delivery_received"],
        );
        return value === null ? [] : [value / 60];
      });

      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        requestCount: purchases.length,
        activeCount: active.length,
        receivedCount: received.length,
        rejectedCount: rejected.length,
        closedCount,
        completionRatePercent: closedCount
          ? Math.round((received.length / closedCount) * 100)
          : null,
        receivedSpend: round(
          received.reduce(
            (sum, purchase) => sum + purchaseValue(purchase),
            0,
          ),
          2,
        ),
        averageViewMinutes: average(viewMinutes),
        averageQuoteMinutes: average(quoteMinutes),
        averageConfirmationMinutes: average(
          confirmationMinutes,
        ),
        averageReceiptHours: average(receiptHours),
      };
    },
  );

  const supplierIds = new Set(
    state.suppliers.map((supplier) => supplier.id),
  );
  const purchases = state.purchases.filter((purchase) =>
    supplierIds.has(purchase.supplierId),
  );
  const received = purchases.filter(
    (purchase) => purchase.status === "received",
  );
  const rejected = purchases.filter(
    (purchase) => purchase.status === "rejected",
  );
  const closedCount = received.length + rejected.length;

  const allDurations = (
    actions: string[],
    source = purchases,
  ) =>
    source.flatMap((purchase) => {
      const value = eventDurationMinutes(
        purchase,
        state.activity,
        actions,
      );
      return value === null ? [] : [value];
    });

  return {
    suppliers: rows,
    requestCount: purchases.length,
    closedCount,
    receivedCount: received.length,
    completionRatePercent: closedCount
      ? Math.round((received.length / closedCount) * 100)
      : null,
    averageViewMinutes: average(
      allDurations(["supplier_viewed"]),
    ),
    averageQuoteMinutes: average(
      allDurations(["quote_received"]),
    ),
    averageConfirmationMinutes: average(
      allDurations(["supplier_confirmed"]),
    ),
    averageReceiptHours: average(
      allDurations(["delivery_received"], received).map(
        (minutes) => minutes / 60,
      ),
    ),
  };
}
