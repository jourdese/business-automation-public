import {
  addDays,
  addMonths,
  addWeeks,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import type { CommandCenterSaleRecord } from "./runtime.ts";

export type CommandCenterSalesPeriod = "daily" | "weekly" | "monthly";

export type CommandCenterSalesBucket = {
  key: string;
  label: string;
  revenue: number;
  ingredientCost: number;
  ingredientContribution: number;
  units: number;
  pricedUnits: number;
  ingredientMarginPercent: number | null;
};

export type CommandCenterSalesAnalytics = {
  period: CommandCenterSalesPeriod;
  currentLabel: string;
  buckets: CommandCenterSalesBucket[];
  current: CommandCenterSalesBucket;
  previous: CommandCenterSalesBucket | null;
  revenueChangePercent: number | null;
  seededRecordCount: number;
  simulatedRecordCount: number;
};

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function dateKeyInTimeZone(at: string | Date, timeZone: string) {
  const date = at instanceof Date ? at : new Date(at);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function periodKey(
  dayKey: string,
  period: CommandCenterSalesPeriod,
) {
  const day = parseISO(dayKey);
  if (period === "weekly") {
    return format(startOfWeek(day, { weekStartsOn: 1 }), "yyyy-MM-dd");
  }
  if (period === "monthly") {
    return format(startOfMonth(day), "yyyy-MM-dd");
  }
  return format(day, "yyyy-MM-dd");
}

function shiftPeriod(
  key: string,
  period: CommandCenterSalesPeriod,
  amount: number,
) {
  const date = parseISO(key);
  if (period === "weekly") return format(addWeeks(date, amount), "yyyy-MM-dd");
  if (period === "monthly") return format(addMonths(date, amount), "yyyy-MM-dd");
  return format(addDays(date, amount), "yyyy-MM-dd");
}

function bucketLabel(key: string, period: CommandCenterSalesPeriod) {
  const date = parseISO(key);
  if (period === "weekly") return `Week of ${format(date, "MMM d")}`;
  if (period === "monthly") return format(date, "MMM yyyy");
  return format(date, "EEE · MMM d");
}

function emptyBucket(
  key: string,
  period: CommandCenterSalesPeriod,
): CommandCenterSalesBucket {
  return {
    key,
    label: bucketLabel(key, period),
    revenue: 0,
    ingredientCost: 0,
    ingredientContribution: 0,
    units: 0,
    pricedUnits: 0,
    ingredientMarginPercent: null,
  };
}

export function buildCommandCenterSalesAnalytics(
  sales: CommandCenterSaleRecord[],
  timeZone: string,
  period: CommandCenterSalesPeriod,
  now = new Date(),
): CommandCenterSalesAnalytics {
  const currentDayKey = dateKeyInTimeZone(now, timeZone);
  const currentPeriodKey = periodKey(currentDayKey, period);
  const bucketCount = period === "daily" ? 7 : period === "weekly" ? 8 : 6;
  const firstKey =
    period === "daily"
      ? periodKey(
          dateKeyInTimeZone(subDays(now, bucketCount - 1), timeZone),
          period,
        )
      : period === "weekly"
        ? format(
            subWeeks(parseISO(currentPeriodKey), bucketCount - 1),
            "yyyy-MM-dd",
          )
        : format(
            subMonths(parseISO(currentPeriodKey), bucketCount - 1),
            "yyyy-MM-dd",
          );

  const buckets = Array.from({ length: bucketCount }, (_, index) =>
    emptyBucket(shiftPeriod(firstKey, period, index), period),
  );
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const sale of sales) {
    const dayKey = dateKeyInTimeZone(sale.at, timeZone);
    const key = periodKey(dayKey, period);
    const bucket = byKey.get(key);
    if (!bucket) continue;

    bucket.units += sale.quantity;
    bucket.ingredientCost = round(
      bucket.ingredientCost + sale.ingredientCost,
    );
    if (sale.revenue !== null && sale.ingredientContribution !== null) {
      bucket.revenue = round(bucket.revenue + sale.revenue);
      bucket.ingredientContribution = round(
        bucket.ingredientContribution + sale.ingredientContribution,
      );
      bucket.pricedUnits += sale.quantity;
    }
  }

  for (const bucket of buckets) {
    bucket.ingredientMarginPercent =
      bucket.revenue > 0
        ? round(
            (bucket.ingredientContribution / bucket.revenue) * 100,
            1,
          )
        : null;
  }

  const current = buckets[buckets.length - 1]!;
  const previous = buckets.length > 1 ? buckets[buckets.length - 2]! : null;
  const revenueChangePercent =
    previous && previous.revenue > 0
      ? round(
          ((current.revenue - previous.revenue) / previous.revenue) * 100,
          1,
        )
      : null;

  return {
    period,
    currentLabel:
      period === "daily"
        ? "Today"
        : period === "weekly"
          ? "This week"
          : "This month",
    buckets,
    current,
    previous,
    revenueChangePercent,
    seededRecordCount: sales.filter((sale) => sale.origin === "seeded_demo").length,
    simulatedRecordCount: sales.filter((sale) => sale.origin === "simulated_pos").length,
  };
}
