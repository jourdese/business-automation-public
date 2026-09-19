"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, RotateCcw } from "lucide-react";
import { DayPicker } from "react-day-picker";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildCommandCenterSalesAnalytics,
  type CommandCenterSalesPeriod,
} from "@/command-center/core/sales-engine";
import type { CommandCenterSaleRecord } from "@/command-center/core/runtime";
import styles from "./CommandCenter.module.css";

const periods: Array<{
  id: CommandCenterSalesPeriod;
  label: string;
}> = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

function formatMoney(value: number) {
  return "₱" + Math.round(value).toLocaleString("en-PH");
}

function formatAxisMoney(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `₱${Math.round(value / 100_000) / 10}m`;
  }
  if (Math.abs(value) >= 1_000) {
    return `₱${Math.round(value / 100) / 10}k`;
  }
  return `₱${Math.round(value)}`;
}

export default function SalesAnalyticsPanel({
  sales,
  timeZone,
}: {
  sales: CommandCenterSaleRecord[];
  timeZone: string;
}) {
  const [period, setPeriod] =
    useState<CommandCenterSalesPeriod>("daily");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(true);
  const analytics = useMemo(
    () =>
      buildCommandCenterSalesAnalytics(
        sales,
        timeZone,
        period,
        selectedDate,
      ),
    [period, sales, selectedDate, timeZone],
  );
  const current = analytics.current;
  const change = analytics.revenueChangePercent;

  return (
    <article className={styles.salesAnalyticsPanel}>
      <header className={styles.salesAnalyticsHeader}>
        <div>
          <span>DEMO POS SALES ANALYSIS</span>
          <h2>See where your sales money goes</h2>
          <p>
            Sales are split into the estimated food cost of the dishes sold
            and the amount left after food cost. New simulated POS sales update
            the current day, week, and month immediately.
          </p>
        </div>
        <div className={styles.salesAnalyticsControls}>
          <div
            className={styles.salesPeriodToggle}
            aria-label="Sales analysis period"
          >
            {periods.map((option) => (
              <button
                type="button"
                key={option.id}
                data-active={period === option.id}
                onClick={() => setPeriod(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.salesCalendarButton}
            data-open={calendarOpen}
            onClick={() => setCalendarOpen((open) => !open)}
          >
            <CalendarDays size={14} aria-hidden />
            Calendar
          </button>
        </div>
      </header>

      <div className={styles.salesDateContext}>
        <div>
          <span>VIEWING DATE</span>
          <strong>{format(selectedDate, "EEEE, MMMM d, yyyy")}</strong>
          <small>
            {period === "daily"
              ? "The chart ends on this business day."
              : period === "weekly"
                ? "The chart ends on the Monday-start week containing this date."
                : "The chart ends on the month containing this date."}
          </small>
        </div>
        <button
          type="button"
          onClick={() => setSelectedDate(new Date())}
        >
          <RotateCcw size={13} aria-hidden />
          Back to today
        </button>
      </div>

      {calendarOpen ? (
        <div className={styles.salesCalendarPanel}>
          <div>
            <span>SELECT A DATE</span>
            <strong>Choose what period you want to analyze</strong>
            <small>
              Then switch between Daily, Weekly, or Monthly. Jourvis will
              recalculate the chart around the selected date.
            </small>
          </div>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) setSelectedDate(date);
            }}
            disabled={{ after: new Date() }}
            weekStartsOn={1}
            showOutsideDays
            classNames={{
              root: styles.salesDayPicker,
              months: styles.salesDayPickerMonths,
              month: styles.salesDayPickerMonth,
              month_caption: styles.salesDayPickerCaption,
              caption_label: styles.salesDayPickerCaptionLabel,
              nav: styles.salesDayPickerNav,
              button_previous: styles.salesDayPickerNavButton,
              button_next: styles.salesDayPickerNavButton,
              month_grid: styles.salesDayPickerGrid,
              weekdays: styles.salesDayPickerWeekdays,
              weekday: styles.salesDayPickerWeekday,
              weeks: styles.salesDayPickerWeeks,
              week: styles.salesDayPickerWeek,
              day: styles.salesDayPickerDay,
              day_button: styles.salesDayPickerDayButton,
              selected: styles.salesDayPickerSelected,
              today: styles.salesDayPickerToday,
              outside: styles.salesDayPickerOutside,
              disabled: styles.salesDayPickerDisabled,
            }}
          />
        </div>
      ) : null}

      <div className={styles.salesAnalyticsSummary}>
        <div>
          <span>{analytics.currentLabel.toUpperCase()} SALES</span>
          <strong>{formatMoney(current.revenue)}</strong>
          <small>
            {current.pricedUnits} priced unit
            {current.pricedUnits === 1 ? "" : "s"} · {current.units} total unit
            {current.units === 1 ? "" : "s"}
          </small>
        </div>
        <div>
          <span>FOOD COST</span>
          <strong>{formatMoney(current.ingredientCost)}</strong>
          <small>estimated cost of the ingredients used in the dishes sold</small>
        </div>
        <div>
          <span>REMAINING AFTER FOOD COST</span>
          <strong>{formatMoney(current.ingredientContribution)}</strong>
          <small>sales left after food cost, before all other business expenses</small>
        </div>
        <div>
          <span>MARGIN AFTER FOOD COST</span>
          <strong>
            {current.ingredientMarginPercent === null
              ? "—"
              : current.ingredientMarginPercent + "%"}
          </strong>
          <small>
            {change === null
              ? "no comparable prior period"
              : `${change > 0 ? "+" : ""}${change}% sales vs previous period`}
          </small>
        </div>
      </div>

      <div className={styles.salesMoneyEquation} aria-label="Sales breakdown">
        <div>
          <span>SALES</span>
          <strong>{formatMoney(current.revenue)}</strong>
          <small>money from the dishes sold</small>
        </div>
        <b>=</b>
        <div>
          <span>FOOD COST</span>
          <strong>{formatMoney(current.ingredientCost)}</strong>
          <small>estimated ingredient cost</small>
        </div>
        <b>+</b>
        <div>
          <span>REMAINING AFTER FOOD COST</span>
          <strong>{formatMoney(current.ingredientContribution)}</strong>
          <small>still needs to cover labor, rent, utilities, taxes, fees, and other expenses</small>
        </div>
      </div>

      <div className={styles.salesProfitWarning}>
        <strong>Not profit</strong>
        <span>
          “Remaining after food cost” is not earnings or net profit. It only
          subtracts the estimated ingredients used in the dishes sold.
        </span>
      </div>

      <div className={styles.salesAnalyticsChart}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={analytics.buckets}
            margin={{ top: 12, right: 10, left: 4, bottom: 4 }}
          >
            <CartesianGrid
              stroke="rgba(144, 160, 168, 0.12)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "#90a0a8", fontSize: 10 }}
              axisLine={{ stroke: "#273a44" }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tickFormatter={(value) => formatAxisMoney(Number(value))}
              tick={{ fill: "#90a0a8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={58}
            />
            <Tooltip
              formatter={(value) => formatMoney(Number(value))}
              cursor={{ fill: "rgba(167, 227, 197, 0.04)" }}
              contentStyle={{
                background: "#08161e",
                border: "1px solid #314750",
                color: "#f7f4ee",
                fontSize: "0.68rem",
              }}
              labelStyle={{ color: "#a7e3c5" }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: "10px",
                color: "#90a0a8",
                fontSize: "0.65rem",
              }}
            />
            <Bar
              dataKey="ingredientCost"
              name="Food cost"
              stackId="sales"
              fill="var(--gold)"
              maxBarSize={44}
            />
            <Bar
              dataKey="ingredientContribution"
              name="Remaining after food cost"
              stackId="sales"
              fill="var(--mint)"
              maxBarSize={44}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <footer className={styles.salesAnalyticsFooter}>
        <span>
          {analytics.seededRecordCount} seeded demo record
          {analytics.seededRecordCount === 1 ? "" : "s"} ·{" "}
          {analytics.simulatedRecordCount} simulated POS record
          {analytics.simulatedRecordCount === 1 ? "" : "s"}
        </span>
        <small>
          Each stacked bar equals total demo sales: food cost plus the
          amount remaining after food cost. This is not verified production
          revenue or net profit.
        </small>
      </footer>
    </article>
  );
}
