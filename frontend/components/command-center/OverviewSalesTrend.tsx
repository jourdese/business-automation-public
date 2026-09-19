"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import type { CommandCenterSalesBucket } from "@/command-center/core/sales-engine";
import styles from "./CommandCenter.module.css";

function formatMoney(value: number) {
  return "₱" + Math.round(value).toLocaleString("en-PH");
}

export default function OverviewSalesTrend({
  buckets,
  businessId,
}: {
  buckets: CommandCenterSalesBucket[];
  businessId: string;
}) {
  return (
    <article className={styles.overviewSalesPanel}>
      <header>
        <div>
          <span>SALES · LAST 7 DAYS</span>
          <h2>Daily demo sales trend</h2>
          <p>
            Food cost plus the amount remaining after food cost equals total
            demo sales for each day.
          </p>
        </div>
        <a href={`/command-center/${businessId}/finance`}>
          Open full analysis
        </a>
      </header>
      <div className={styles.overviewSalesChart}>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart
            data={buckets}
            margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
          >
            <CartesianGrid
              stroke="rgba(144, 160, 168, 0.1)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "#90a0a8", fontSize: 9 }}
              axisLine={{ stroke: "#273a44" }}
              tickLine={false}
              interval={0}
            />
            <Tooltip
              formatter={(value) => formatMoney(Number(value))}
              cursor={{ fill: "rgba(167, 227, 197, 0.04)" }}
              contentStyle={{
                background: "#08161e",
                border: "1px solid #314750",
                color: "#f7f4ee",
                fontSize: "0.64rem",
              }}
              labelStyle={{ color: "#a7e3c5" }}
            />
            <Bar
              dataKey="ingredientCost"
              name="Food cost"
              stackId="sales"
              fill="var(--gold)"
              maxBarSize={38}
            />
            <Bar
              dataKey="ingredientContribution"
              name="Remaining after food cost"
              stackId="sales"
              fill="var(--mint)"
              maxBarSize={38}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
