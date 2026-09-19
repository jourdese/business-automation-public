"use client";

import { type ReactNode, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  HelpCircle,
  LineChart,
  ShieldCheck,
  Sparkles,
  Zap,
  WalletCards,
  X,
} from "lucide-react";
import CompanionMark from "@/components/jourvis/CompanionMark";
import SupplyPhoto from "./SupplyPhoto";
import SalesAnalyticsPanel from "./SalesAnalyticsPanel";
import OverviewSalesTrend from "./OverviewSalesTrend";
import { operationCatalog } from "@/command-center/core/business-registry";
import { buildCommandCenterFinance } from "@/command-center/core/finance-engine";
import { buildCommandCenterForecast } from "@/command-center/core/forecast-engine";
import {
  buildCommandCenterForecastAccuracy,
  buildCommandCenterHistoryTrend,
} from "@/command-center/core/history-engine";
import {
  buildCommandCenterInsights,
  commandCenterInsightMethods,
} from "@/command-center/core/insight-engine";
import { buildCommandCenterPerformance } from "@/command-center/core/performance-engine";
import { buildCommandCenterSupplierPerformance } from "@/command-center/core/supplier-performance-engine";
import { buildCommandCenterSalesAnalytics } from "@/command-center/core/sales-engine";
import { isPurchaseActive } from "@/command-center/core/runtime";
import { useCommandCenterRuntime } from "@/command-center/core/runtime-provider";
import type { CommandCenterSectionId } from "@/command-center/core/types";
import styles from "./CommandCenter.module.css";

type ActivityFilter = "all" | "automatic" | "manual";

function formatActivityTime(at: string, timezone: string) {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return at;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  }).format(date);
}

function humanizeAction(action: string) {
  return action
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatSigned(value: number | null, suffix = "") {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value}${suffix}`;
}

function formatSignedMoney(value: number) {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : rounded < 0 ? "-" : ""}₱${Math.abs(rounded).toLocaleString("en-PH")}`;
}

export default function CommandCenterSectionView({
  section,
}: {
  section: CommandCenterSectionId;
}) {
  const {
    state,
    tasks,
    actOnTask,
    setAutomationMasterOn,
  } = useCommandCenterRuntime();
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [insightModalId, setInsightModalId] = useState<string | null>(null);
  const [insightMethodsOpen, setInsightMethodsOpen] = useState(false);
  const business = state.business;
  const activePurchases = state.purchases.filter((purchase) =>
    isPurchaseActive(purchase.status),
  );
  const historyTrend = buildCommandCenterHistoryTrend(state);
  const hasHistoricalComparison = historyTrend.snapshotCount >= 2;

  if (section === "overview") {
    const overviewPerformance = buildCommandCenterPerformance(
      state,
      tasks.length,
    );
    const overviewForecast = buildCommandCenterForecast(state, 7);
    const overviewInsights = buildCommandCenterInsights(state, tasks);
    const overviewDailySales = buildCommandCenterSalesAnalytics(
      state.sales,
      business.timezone,
      "daily",
    );
    const overviewWeeklySales = buildCommandCenterSalesAnalytics(
      state.sales,
      business.timezone,
      "weekly",
    );
    const highPriorityTaskCount = tasks.filter(
      (task) => task.priority === "high",
    ).length;
    const formatMoney = (value: number) =>
      "₱" + Math.round(value).toLocaleString("en-PH");
    const todaySales = overviewDailySales.current;
    const yesterdaySales = overviewDailySales.previous;
    const todaySalesChange =
      yesterdaySales && yesterdaySales.revenue > 0
        ? Math.round(
            ((todaySales.revenue - yesterdaySales.revenue) /
              yesterdaySales.revenue) *
              1000,
          ) / 10
        : null;
    const topInsights = overviewInsights.slice(0, 3);
    const nextForecastMoves = overviewForecast.inventoryRows
      .filter(
        (row) =>
          row.risk !== "covered" ||
          row.activePurchaseId ||
          row.recommendedQuantity > 0,
      )
      .slice(0, 3);
    const nextUp = [
      ...activePurchases
        .filter((purchase) => (purchase.etaDays ?? 99) <= 2)
        .slice(0, 2)
        .map((purchase) => {
          const item = state.inventory.find(
            (candidate) => candidate.id === purchase.itemId,
          );
          return {
            id: `purchase-${purchase.id}`,
            label: item?.name ?? purchase.itemId,
            detail:
              purchase.etaDays === 0
                ? `${humanizeAction(purchase.status)} · due today`
                : purchase.etaDays === 1
                  ? `${humanizeAction(purchase.status)} · expected within 1 day`
                  : `${humanizeAction(purchase.status)} · expected within ${purchase.etaDays} days`,
            href: `/command-center/${business.id}/operations/purchasing`,
          };
        }),
      ...nextForecastMoves.map((row) => ({
        id: `forecast-${row.itemId}`,
        label: row.name,
        detail: row.nextAction,
        href: `/command-center/${business.id}/forecast`,
      })),
    ].filter(
      (item, index, items) =>
        items.findIndex((candidate) => candidate.label === item.label) ===
        index,
    ).slice(0, 4);

    const operatingCondition = highPriorityTaskCount
      ? {
          title: "Owner attention is required.",
          detail:
            highPriorityTaskCount +
            " high-priority exception" +
            (highPriorityTaskCount === 1 ? " is" : "s are") +
            " waiting. Jourvis has stopped only where owner authority is required.",
        }
      : !state.automationMasterOn
        ? {
            title: "Jourvis is paused.",
            detail:
              "Automatic work is off. Jourvis still reflects the current business state, but it will not start new automatic work.",
          }
        : overviewPerformance.inventoryRiskCount
          ? {
              title: "Inventory needs watching.",
              detail:
                overviewPerformance.inventoryRiskCount +
                " ingredient" +
                (overviewPerformance.inventoryRiskCount === 1 ? " has" : "s have") +
                " risk in the configured 7-day stock projection. Jourvis will act within the rules you set.",
            }
          : activePurchases.length
            ? {
                title: "Jourvis is managing replenishment.",
                detail:
                  activePurchases.length +
                  " purchasing workflow" +
                  (activePurchases.length === 1 ? " is" : "s are") +
                  " active, with no owner exception currently blocking normal work.",
              }
            : {
                title: "Operations are stable.",
                detail:
                  "No owner exceptions or projected 7-day inventory risks are currently active.",
              };

    return (
      <SectionFrame
        eyebrow="OWNER OVERVIEW"
        title={operatingCondition.title}
        description={operatingCondition.detail}
      >
        <section
          className={styles.jourvisAutomationBoard}
          data-running={state.automationMasterOn}
        >
          <div
            className={styles.jourvisAutomationCharacter}
            data-state={state.automationMasterOn ? "active" : "sleeping"}
          >
            <div className={styles.jourvisCharacterHalo} />
            <CompanionMark className={styles.jourvisAutomationMark} />
            {state.automationMasterOn ? (
              <span className={styles.jourvisActiveSpark}>
                <Zap size={14} aria-hidden />
              </span>
            ) : (
              <span className={styles.jourvisSleepMarks} aria-hidden>
                <i>Z</i>
                <i>Z</i>
                <i>Z</i>
              </span>
            )}
          </div>

          <div className={styles.jourvisAutomationCopy}>
            <span>CURRENT OPERATING CONDITION</span>
            <h2>{operatingCondition.title}</h2>
            <p>{operatingCondition.detail}</p>
            <div className={styles.overviewStatusLine}>
              <span>
                <b>{tasks.length}</b> need owner
              </span>
              <span>
                <b>{activePurchases.length}</b> Jourvis working
              </span>
              <span>
                <b>{overviewPerformance.inventoryRiskCount}</b> 7-day risks
              </span>
            </div>
          </div>

          <label className={styles.masterAutomationSwitch}>
            <span>
              <strong>
                {state.automationMasterOn ? "Automation ON" : "Automation OFF"}
              </strong>
              <small>
                {state.automationMasterOn
                  ? activePurchases.length +
                    " active workflow" +
                    (activePurchases.length === 1 ? "" : "s")
                  : "Jourvis will not start new automatic work"}
              </small>
            </span>
            <input
              type="checkbox"
              checked={state.automationMasterOn}
              onChange={(event) =>
                setAutomationMasterOn(event.target.checked)
              }
              aria-label="Toggle Jourvis automation"
            />
            <i aria-hidden />
          </label>
        </section>

        <div className={styles.overviewBusinessMetrics}>
          <article>
            <span>TODAY SALES</span>
            <strong>{formatMoney(todaySales.revenue)}</strong>
            <small>
              {todaySalesChange === null
                ? "no prior-day comparison"
                : `${todaySalesChange > 0 ? "+" : ""}${todaySalesChange}% vs yesterday`}
            </small>
          </article>
          <article>
            <span>THIS WEEK SALES</span>
            <strong>{formatMoney(overviewWeeklySales.current.revenue)}</strong>
            <small>
              {overviewWeeklySales.revenueChangePercent === null
                ? "no prior-week comparison"
                : `${overviewWeeklySales.revenueChangePercent > 0 ? "+" : ""}${overviewWeeklySales.revenueChangePercent}% vs previous week`}
            </small>
          </article>
          <article>
            <span>REMAINING AFTER FOOD COST</span>
            <strong>{formatMoney(todaySales.ingredientContribution)}</strong>
            <small>
              {todaySales.ingredientMarginPercent === null
                ? "margin unavailable"
                : `${todaySales.ingredientMarginPercent}% of today's demo sales`}
            </small>
          </article>
          <article>
            <span>INVENTORY READINESS</span>
            <strong>
              {overviewPerformance.inventoryReadinessPercent === null
                ? "—"
                : overviewPerformance.inventoryReadinessPercent + "%"}
            </strong>
            <small>
              {overviewPerformance.inventoryRiskCount} ingredient
              {overviewPerformance.inventoryRiskCount === 1 ? "" : "s"} in 7-day risk
            </small>
          </article>
        </div>

        <OverviewSalesTrend
          buckets={overviewDailySales.buckets}
          businessId={business.id}
        />

        <div className={styles.overviewCommandGrid}>
          <article className={styles.overviewCommandPanel}>
            <header>
              <div>
                <span>NEEDS YOU</span>
                <h2>
                  {tasks.length
                    ? `${tasks.length} decision${tasks.length === 1 ? "" : "s"} waiting`
                    : "Nothing needs your authority"}
                </h2>
              </div>
              <a href={`/command-center/${business.id}/decisions`}>
                Open decisions <ArrowRight size={13} />
              </a>
            </header>
            <div className={styles.overviewCommandRows}>
              {tasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  data-attention={task.priority === "high" ? "true" : undefined}
                >
                  <CircleAlert size={15} aria-hidden />
                  <span>
                    <strong>{task.title}</strong>
                    <small>{task.whyOwnerIsNeeded ?? task.why}</small>
                  </span>
                </div>
              ))}
              {!tasks.length ? (
                <div>
                  <CheckCircle2 size={15} aria-hidden />
                  <span>
                    <strong>Jourvis is operating inside its authority.</strong>
                    <small>No owner decision is currently blocking normal work.</small>
                  </span>
                </div>
              ) : null}
            </div>
          </article>

          <article className={styles.overviewCommandPanel}>
            <header>
              <div>
                <span>JOURVIS IS WORKING</span>
                <h2>
                  {activePurchases.length
                    ? `${activePurchases.length} live workflow${activePurchases.length === 1 ? "" : "s"}`
                    : "No active purchasing work"}
                </h2>
              </div>
              <a href={`/command-center/${business.id}/operations/purchasing`}>
                Open purchasing <ArrowRight size={13} />
              </a>
            </header>
            <div className={styles.overviewCommandRows}>
              {activePurchases.slice(0, 3).map((purchase) => {
                const item = state.inventory.find(
                  (candidate) => candidate.id === purchase.itemId,
                );
                return (
                  <div key={purchase.id}>
                    <Sparkles size={15} aria-hidden />
                    <span>
                      <strong>{item?.name ?? purchase.itemId}</strong>
                      <small>
                        {humanizeAction(purchase.status)}
                        {purchase.etaDays !== undefined
                          ? ` · ETA ${purchase.etaDays} day${purchase.etaDays === 1 ? "" : "s"}`
                          : ""}
                        {" · "}{purchase.id}
                      </small>
                    </span>
                  </div>
                );
              })}
              {!activePurchases.length ? (
                <div>
                  <CheckCircle2 size={15} aria-hidden />
                  <span>
                    <strong>No purchasing workflow is active.</strong>
                    <small>Jourvis will start work when a configured trigger is reached.</small>
                  </span>
                </div>
              ) : null}
            </div>
          </article>

          <article className={styles.overviewCommandPanel}>
            <header>
              <div>
                <span>WHAT JOURVIS NOTICED</span>
                <h2>
                  {topInsights.length
                    ? `${topInsights.length} useful signal${topInsights.length === 1 ? "" : "s"}`
                    : "No material insight right now"}
                </h2>
              </div>
              <a href={`/command-center/${business.id}/insights`}>
                Open insights <ArrowRight size={13} />
              </a>
            </header>
            <div className={styles.overviewCommandRows}>
              {topInsights.map((insight) => (
                <div key={insight.id} data-severity={insight.severity}>
                  <LineChart size={15} aria-hidden />
                  <span>
                    <strong>{insight.title}</strong>
                    <small>{insight.summary}</small>
                  </span>
                </div>
              ))}
              {!topInsights.length ? (
                <div>
                  <CheckCircle2 size={15} aria-hidden />
                  <span>
                    <strong>No material runtime insight needs surfacing.</strong>
                    <small>Jourvis will surface a signal when the current data supports one.</small>
                  </span>
                </div>
              ) : null}
            </div>
          </article>
        </div>

        <article className={styles.overviewNextPanel}>
          <header>
            <div>
              <span>NEXT UP</span>
              <h2>What is most likely to matter next</h2>
              <p>
                Upcoming supplier movement and forecast actions derived from the current runtime.
              </p>
            </div>
            <a href={`/command-center/${business.id}/forecast`}>
              Open forecast <ArrowRight size={13} />
            </a>
          </header>
          <div className={styles.overviewNextRows}>
            {nextUp.map((item) => (
              <a href={item.href} key={item.id}>
                <span>{item.label}</span>
                <p>{item.detail}</p>
                <ArrowRight size={12} aria-hidden />
              </a>
            ))}
            {!nextUp.length ? (
              <div>
                <CheckCircle2 size={15} aria-hidden />
                <span>
                  <strong>No immediate next move is currently required.</strong>
                  <small>Jourvis will update this when purchasing or forecast state changes.</small>
                </span>
              </div>
            ) : null}
          </div>
        </article>

        <p className={styles.overviewDemoDisclosure}>
          Sales figures on this demo Overview come from the synthetic dated POS ledger and are not verified production revenue.
        </p>
      </SectionFrame>
    );
  }

  if (section === "forecast") {
    const forecast = buildCommandCenterForecast(state, 7);
    const forecastAccuracy = buildCommandCenterForecastAccuracy(
      state,
      7,
    );
    const connectedInventoryRows = forecast.inventoryRows.filter(
      (row) => row.dailyUse > 0,
    );
    const riskRows = forecast.inventoryRows.filter(
      (row) => row.risk !== "covered",
    );
    const coveredRows = forecast.inventoryRows.filter(
      (row) => row.risk === "covered",
    );
    const activeReplenishmentCount = forecast.inventoryRows.filter(
      (row) => row.activePurchaseId,
    ).length;

    return (
      <SectionFrame
        eyebrow="FORECAST"
        title={
          riskRows.length
            ? `${riskRows.length} ingredient${riskRows.length === 1 ? " needs" : "s need"} attention over the next 7 days.`
            : "No configured ingredient is currently in a 7-day risk state."
        }
        description="Jourvis projects inventory from current stock, confirmed incoming quantities, configured average daily use, and supplier lead time. The daily-use value is a planning baseline—not a claim of POS-driven demand forecasting."
      >
        <div className={styles.forecastOwnerSummary}>
          <article data-state={forecast.leadTimeRiskCount ? "risk" : "clear"}>
            <span>BEFORE / NEAR ARRIVAL</span>
            <strong>{forecast.leadTimeRiskCount}</strong>
            <small>ingredients exposed around supplier lead time</small>
          </article>
          <article data-state={forecast.horizonRiskCount ? "risk" : "clear"}>
            <span>7-DAY RISK</span>
            <strong>{forecast.horizonRiskCount}</strong>
            <small>ingredients projected into a risk state</small>
          </article>
          <article data-state={activeReplenishmentCount ? "active" : "clear"}>
            <span>REPLENISHMENT ACTIVE</span>
            <strong>{activeReplenishmentCount}</strong>
            <small>ingredients already tied to an active purchase</small>
          </article>
          <article data-state={forecast.protectedByIncomingCount ? "protected" : "clear"}>
            <span>PROTECTED BY INCOMING</span>
            <strong>{forecast.protectedByIncomingCount}</strong>
            <small>ingredients with confirmed incoming quantity</small>
          </article>
        </div>

        <div className={styles.forecastBaselineNote}>
          <LineChart size={15} aria-hidden />
          <div>
            <strong>Current model: configured-use inventory projection</strong>
            <p>
              {connectedInventoryRows.length}/{state.inventory.length} inventory items have a configured daily-use input.
              Production demand forecasting will replace these baselines with dated POS/orders, seasonality, promotions, reservations, and observed forecast error when those providers exist.
            </p>
          </div>
        </div>

        <article className={styles.forecastRiskBoard}>
          <header className={styles.forecastRiskBoardHeader}>
            <div>
              <span>PRIORITY INVENTORY</span>
              <h2>Highest-risk ingredients first</h2>
              <p>
                Each row shows how long stock can cover configured use, what remains when the supplier could arrive, the seven-day position, current incoming protection, affected menu/recipes, and Jourvis’s next move.
              </p>
            </div>
            <b>{riskRows.length} open risk{riskRows.length === 1 ? "" : "s"}</b>
          </header>

          <div className={styles.forecastPriorityList}>
            {riskRows.map((row, index) => (
              <article
                className={styles.forecastPriorityRow}
                data-risk={row.risk}
                data-primary={index === 0 ? "true" : undefined}
                key={row.itemId}
              >
                <div className={styles.forecastPriorityIdentity}>
                  <SupplyPhoto
                    supplyId={row.itemId}
                    className={styles.forecastSupplyPhoto}
                    size={54}
                  />
                  <div>
                    <span>{row.risk.toUpperCase()}</span>
                    <strong>{row.name}</strong>
                    <small>
                      {row.daysCover === null
                        ? "Days of cover unavailable"
                        : `${row.daysCover} days of cover`}
                      {" · "}supplier lead time {row.leadDays} day{row.leadDays === 1 ? "" : "s"}
                    </small>
                  </div>
                  {row.activePurchaseId ? (
                    <b>{row.activePurchaseId}</b>
                  ) : null}
                </div>

                <div className={styles.forecastPriorityFacts}>
                  <div>
                    <span>ON HAND</span>
                    <strong>{row.current} {row.unit}</strong>
                  </div>
                  <div data-positive={row.incoming > 0 ? "true" : undefined}>
                    <span>INCOMING</span>
                    <strong>{row.incoming} {row.unit}</strong>
                  </div>
                  <div data-danger={row.projectedAtDelivery <= 0 ? "true" : undefined}>
                    <span>AT SUPPLIER ARRIVAL</span>
                    <strong>{row.projectedAtDelivery} {row.unit}</strong>
                  </div>
                  <div data-danger={row.projectedAtHorizon <= 0 ? "true" : undefined}>
                    <span>AFTER {forecast.horizonDays} DAYS</span>
                    <strong>{row.projectedAtHorizon} {row.unit}</strong>
                  </div>
                  <div>
                    <span>RECOMMENDED ORDER</span>
                    <strong>{row.recommendedQuantity} {row.unit}</strong>
                  </div>
                </div>

                <div className={styles.forecastPriorityImpact}>
                  <div>
                    <span>AFFECTED RECIPES</span>
                    <p>
                      {row.affectedRecipes.length
                        ? row.affectedRecipes.join(", ")
                        : "No active recipe currently uses this ingredient."}
                    </p>
                  </div>
                  <div>
                    <span>AFFECTED MENU</span>
                    <p>
                      {row.affectedMenuItems.length
                        ? row.affectedMenuItems.join(", ")
                        : "No configured active menu item is linked through an affected recipe."}
                    </p>
                  </div>
                </div>

                <div className={styles.forecastNextMove}>
                  <div>
                    <span>NEXT JOURVIS ACTION</span>
                    <p>{row.nextAction}</p>
                  </div>
                  <a
                    href={`/command-center/${business.id}/operations/${row.activePurchaseId ? "purchasing" : "inventory"}`}
                  >
                    {row.activePurchaseId ? "Open purchasing" : "Open inventory"}
                    <ArrowRight size={13} />
                  </a>
                </div>
              </article>
            ))}

            {!riskRows.length ? (
              <div className={styles.forecastClearState}>
                <CheckCircle2 size={18} aria-hidden />
                <div>
                  <strong>No ingredient is currently in a configured forecast risk state.</strong>
                  <small>
                    Jourvis will surface a priority row when lead-time or seven-day stock projections cross the current risk rules.
                  </small>
                </div>
              </div>
            ) : null}
          </div>
        </article>

        {coveredRows.length ? (
          <details className={styles.forecastSecondaryDisclosure}>
            <summary>
              <span>
                <ShieldCheck size={15} aria-hidden />
                Covered inventory
              </span>
              <b>{coveredRows.length}</b>
            </summary>
            <div className={styles.forecastCoveredGrid}>
              {coveredRows.map((row) => (
                <article key={row.itemId}>
                  <SupplyPhoto
                    supplyId={row.itemId}
                    className={styles.forecastCoveredPhoto}
                    size={38}
                  />
                  <div>
                    <strong>{row.name}</strong>
                    <small>
                      {row.daysCover === null
                        ? "No configured daily use"
                        : `${row.daysCover} days cover`}
                      {" · "}{row.projectedAtHorizon} {row.unit} after {forecast.horizonDays} days
                    </small>
                  </div>
                  {row.incoming > 0 ? <b>+{row.incoming} {row.unit} incoming</b> : null}
                </article>
              ))}
            </div>
          </details>
        ) : null}

        <details className={styles.forecastSecondaryDisclosure}>
          <summary>
            <span>
              <LineChart size={15} aria-hidden />
              Forecast evaluation &amp; observed history
            </span>
            <b>{forecastAccuracy.matured ? "Matured" : "Secondary"}</b>
          </summary>
          <div className={styles.forecastEvaluationGrid}>
            <article>
              <PanelHeading
                icon={<LineChart size={17} />}
                eyebrow="OBSERVED MOVEMENT"
                title="How the operating state has changed"
              />
              <div className={styles.historyTrendGrid}>
                <div>
                  <span>7-DAY RISK</span>
                  <strong>
                    {hasHistoricalComparison
                      ? formatSigned(historyTrend.inventoryRiskDelta)
                      : "—"}
                  </strong>
                  <small>lower is better</small>
                </div>
                <div>
                  <span>INVENTORY READINESS</span>
                  <strong>
                    {hasHistoricalComparison
                      ? formatSigned(historyTrend.inventoryReadinessDelta, " pts")
                      : "—"}
                  </strong>
                  <small>change since first snapshot</small>
                </div>
                <div>
                  <span>ACTIVE WORKFLOWS</span>
                  <strong>
                    {hasHistoricalComparison
                      ? formatSigned(historyTrend.activeWorkflowDelta)
                      : "—"}
                  </strong>
                  <small>purchasing workload movement</small>
                </div>
                <div>
                  <span>HISTORY</span>
                  <strong>{historyTrend.snapshotCount}</strong>
                  <small>deduplicated operating snapshots</small>
                </div>
              </div>
              <p className={styles.historyTrendNote}>
                {hasHistoricalComparison
                  ? `Observed from ${formatActivityTime(historyTrend.oldestAt ?? "", business.timezone)} to ${formatActivityTime(historyTrend.latestAt ?? "", business.timezone)}. This is runtime history, not POS-based forecast accuracy.`
                  : "Jourvis has started capturing historical operating snapshots. Trend comparisons appear after the business state changes."}
              </p>
            </article>

            <article>
              <PanelHeading
                icon={<CheckCircle2 size={17} />}
                eyebrow="FORECAST ACCURACY"
                title={
                  forecastAccuracy.matured
                    ? "Earlier 7-day projections vs later observed stock"
                    : "Waiting for a matured 7-day comparison"
                }
              />
              <div className={styles.historyTrendGrid}>
                <div>
                  <span>STATUS</span>
                  <strong>{forecastAccuracy.matured ? "Matured" : "Collecting"}</strong>
                  <small>requires observations at least 7 days apart</small>
                </div>
                <div>
                  <span>COMPARED ITEMS</span>
                  <strong>{forecastAccuracy.itemCount}</strong>
                  <small>items with configured daily-use inputs</small>
                </div>
                <div>
                  <span>NORMALIZED ERROR</span>
                  <strong>
                    {forecastAccuracy.meanNormalizedErrorPercent === null
                      ? "—"
                      : forecastAccuracy.meanNormalizedErrorPercent + "%"}
                  </strong>
                  <small>absolute error as % of configured full stock</small>
                </div>
                <div>
                  <span>HORIZON</span>
                  <strong>{forecastAccuracy.horizonDays} days</strong>
                  <small>current evaluation window</small>
                </div>
              </div>

              {forecastAccuracy.rows.length ? (
                <div className={styles.forecastAccuracyList}>
                  {forecastAccuracy.rows
                    .slice()
                    .sort(
                      (left, right) =>
                        right.errorPercentOfFullLevel -
                        left.errorPercentOfFullLevel,
                    )
                    .slice(0, 6)
                    .map((row) => {
                      const item = state.inventory.find(
                        (entry) => entry.id === row.itemId,
                      );
                      return (
                        <div key={row.itemId}>
                          <strong>{item?.name ?? row.itemId}</strong>
                          <span>
                            predicted {row.predicted} {row.unit} · actual {row.actual} {row.unit}
                          </span>
                          <b>
                            {row.absoluteError} {row.unit} error · {row.errorPercentOfFullLevel}%
                          </b>
                        </div>
                      );
                    })}
                </div>
              ) : null}

              <p className={styles.historyTrendNote}>
                {forecastAccuracy.matured
                  ? `Baseline ${formatActivityTime(forecastAccuracy.baselineAt ?? "", business.timezone)} → actual ${formatActivityTime(forecastAccuracy.actualAt ?? "", business.timezone)}. This measures the configured inventory-use baseline only; POS-driven forecast accuracy comes later.`
                  : "Jourvis will not label the baseline accurate or inaccurate until the configured horizon has elapsed and a later observation exists."}
              </p>
            </article>
          </div>
        </details>

        <PendingDataSources
          title="Production demand inputs"
          description="The demo projection is intentionally inventory-led. These inputs stay provider-gated until real sources are connected."
          items={[
            ["POS demand", "POS / orders", "Dated item-level demand history"],
            ["Reservations", "Reservations / bookings", "Forward covers and expected demand"],
            ["Promotions", "POS / campaign data", "Demand lifts and campaign effects"],
            ["Seasonality", "Historical operations", "Observed weekly/monthly demand patterns"],
          ]}
        />
      </SectionFrame>
    );
  }

  if (section === "performance") {
    const performance = buildCommandCenterPerformance(
      state,
      tasks.length,
    );
    const supplierPerformance =
      buildCommandCenterSupplierPerformance(state);
    const activeSupplierRows = supplierPerformance.suppliers.filter(
      (supplier) => supplier.requestCount > 0,
    );
    const dailySales = buildCommandCenterSalesAnalytics(
      state.sales,
      business.timezone,
      "daily",
    );
    const weeklySales = buildCommandCenterSalesAnalytics(
      state.sales,
      business.timezone,
      "weekly",
    );
    const monthlySales = buildCommandCenterSalesAnalytics(
      state.sales,
      business.timezone,
      "monthly",
    );
    const formatSupplierMinutes = (value: number | null) =>
      value === null
        ? "—"
        : value < 60
          ? `${value} min`
          : `${Math.round((value / 60) * 10) / 10} hr`;

    const performanceHeadline = performance.ownerExceptionCount
      ? `${performance.ownerExceptionCount} owner exception${performance.ownerExceptionCount === 1 ? " is" : "s are"} the clearest operating constraint right now.`
      : performance.inventoryRiskCount
        ? `${performance.inventoryRiskCount} ingredient${performance.inventoryRiskCount === 1 ? " is" : "s are"} carrying 7-day inventory risk.`
        : performance.activeWorkflowCount
          ? `Jourvis is managing ${performance.activeWorkflowCount} active purchasing workflow${performance.activeWorkflowCount === 1 ? "" : "s"}.`
          : "The current operational performance state is stable.";

    const primaryMetrics = [
      {
        label: "Inventory readiness",
        value:
          performance.inventoryReadinessPercent === null
            ? "—"
            : performance.inventoryReadinessPercent + "%",
        note: "average on-hand stock vs configured full level",
      },
      {
        label: "7-day inventory risk",
        value: String(performance.inventoryRiskCount),
        note: "ingredients in a Forecast risk state",
      },
      {
        label: "Menu → Recipe coverage",
        value:
          performance.recipeCoveragePercent === null
            ? "—"
            : performance.recipeCoveragePercent + "%",
        note: `${performance.recipeMappedMenuCount}/${performance.activeMenuItemCount} configured active menu items mapped`,
      },
      {
        label: "Average food cost",
        value:
          performance.averageFoodCostPercent === null
            ? "—"
            : performance.averageFoodCostPercent + "%",
        note: performance.pricedMappedMenuCount
          ? `${performance.pricedMappedMenuCount} priced recipe-mapped item${performance.pricedMappedMenuCount === 1 ? "" : "s"}`
          : "current selling prices required",
      },
    ];

    return (
      <SectionFrame
        eyebrow="PERFORMANCE"
        title={performanceHeadline}
        description="Performance uses operating KPIs the current runtime can support. The synthetic demo POS ledger adds dated sales-volume analysis; verified production revenue, AOV, operating profit, and business-wide margins remain provider-gated."
      >
        <div className={styles.performancePrimaryGrid}>
          {primaryMetrics.map((metric) => (
            <article key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.note}</small>
            </article>
          ))}
        </div>

        <article className={styles.performanceSalesPulse}>
          <header>
            <div>
              <span>DEMO SALES PULSE</span>
              <h2>Today, this week, and this month</h2>
            </div>
            <a href={`/command-center/${business.id}/finance`}>
              Open sales analysis <ArrowRight size={13} />
            </a>
          </header>
          <div>
            {[
              ["TODAY", dailySales.current],
              ["THIS WEEK", weeklySales.current],
              ["THIS MONTH", monthlySales.current],
            ].map(([label, bucket]) => (
              <section key={label as string}>
                <span>{label as string}</span>
                <strong>
                  ₱{Math.round(
                    (bucket as typeof dailySales.current).revenue,
                  ).toLocaleString("en-PH")}
                </strong>
                <small>
                  ₱{Math.round(
                    (bucket as typeof dailySales.current)
                      .ingredientContribution,
                  ).toLocaleString("en-PH")} remaining after food cost
                </small>
              </section>
            ))}
          </div>
          <p>
            Synthetic demo POS history only. Simulated sales update these
            periods immediately; production sales remain provider-gated.
          </p>
        </article>

        <article className={styles.performanceExecutionPanel}>
          <header>
            <div>
              <span>EXECUTION HEALTH</span>
              <h2>How much work is moving—and how much still needs you</h2>
            </div>
            <a href={`/command-center/${business.id}/activity`}>
              Open activity <ArrowRight size={13} />
            </a>
          </header>

          <div className={styles.performanceExecutionGrid}>
            <div>
              <span>ACTIVE WORKFLOWS</span>
              <strong>{performance.activeWorkflowCount}</strong>
              <small>live purchasing workflows</small>
            </div>
            <div data-attention={performance.ownerExceptionCount ? "true" : undefined}>
              <span>OWNER EXCEPTIONS</span>
              <strong>{performance.ownerExceptionCount}</strong>
              <small>current Decisions queue</small>
            </div>
            <div>
              <span>AUTOMATION SHARE</span>
              <strong>
                {performance.automationSharePercent === null
                  ? "—"
                  : performance.automationSharePercent + "%"}
              </strong>
              <small>
                {performance.automaticActivityCount} automatic · {performance.manualActivityCount} manual recorded actions
              </small>
            </div>
            <div>
              <span>PURCHASE COMPLETION</span>
              <strong>
                {performance.purchaseCompletionPercent === null
                  ? "—"
                  : performance.purchaseCompletionPercent + "%"}
              </strong>
              <small>
                {performance.closedPurchaseCount
                  ? `${performance.receivedPurchaseCount}/${performance.closedPurchaseCount} closed purchases received`
                  : "no closed purchase outcome yet"}
              </small>
            </div>
          </div>
        </article>

        <article className={styles.performanceSupplierPanel}>
          <header>
            <div>
              <span>SUPPLIER PERFORMANCE</span>
              <h2>Observed supplier workflow outcomes</h2>
              <p>
                These metrics come only from request, supplier-view, quote, confirmation, rejection, and receipt events captured in the current runtime.
              </p>
            </div>
            <a href={`/command-center/${business.id}/operations/suppliers`}>
              Open suppliers <ArrowRight size={13} />
            </a>
          </header>

          <div className={styles.performanceSupplierSummary}>
            <div>
              <span>REQUESTS</span>
              <strong>{supplierPerformance.requestCount}</strong>
              <small>observed supplier workflows</small>
            </div>
            <div>
              <span>COMPLETION</span>
              <strong>
                {supplierPerformance.completionRatePercent === null
                  ? "—"
                  : supplierPerformance.completionRatePercent + "%"}
              </strong>
              <small>
                {supplierPerformance.closedCount
                  ? `${supplierPerformance.receivedCount}/${supplierPerformance.closedCount} closed requests received`
                  : "requires closed requests"}
              </small>
            </div>
            <div>
              <span>REQUEST → VIEW</span>
              <strong>{formatSupplierMinutes(supplierPerformance.averageViewMinutes)}</strong>
              <small>average when supplier-view events exist</small>
            </div>
            <div>
              <span>REQUEST → QUOTE</span>
              <strong>{formatSupplierMinutes(supplierPerformance.averageQuoteMinutes)}</strong>
              <small>average observed quote response</small>
            </div>
          </div>

          {activeSupplierRows.length ? (
            <div className={styles.performanceSupplierRows}>
              {activeSupplierRows
                .slice()
                .sort((left, right) => right.requestCount - left.requestCount)
                .map((supplier) => (
                  <div key={supplier.supplierId}>
                    <div>
                      <strong>{supplier.supplierName}</strong>
                      <small>
                        {supplier.requestCount} request{supplier.requestCount === 1 ? "" : "s"} · {supplier.activeCount} active
                      </small>
                    </div>
                    <span>
                      <small>Completion</small>
                      <strong>
                        {supplier.completionRatePercent === null
                          ? "—"
                          : supplier.completionRatePercent + "%"}
                      </strong>
                    </span>
                    <span>
                      <small>Viewed</small>
                      <strong>{formatSupplierMinutes(supplier.averageViewMinutes)}</strong>
                    </span>
                    <span>
                      <small>Quote</small>
                      <strong>{formatSupplierMinutes(supplier.averageQuoteMinutes)}</strong>
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className={styles.performanceEmptyNote}>
              No supplier workflow history is available yet.
            </p>
          )}
        </article>

        <details className={styles.performanceTrendDisclosure}>
          <summary>
            <span>
              <LineChart size={15} aria-hidden />
              Observed KPI movement
            </span>
            <b>
              {hasHistoricalComparison
                ? `${historyTrend.snapshotCount} snapshots`
                : "Collecting"}
            </b>
          </summary>
          <div className={styles.performanceTrendBody}>
            <div className={styles.historyTrendGrid}>
              <div>
                <span>INVENTORY READINESS</span>
                <strong>
                  {hasHistoricalComparison
                    ? formatSigned(historyTrend.inventoryReadinessDelta, " pts")
                    : "—"}
                </strong>
                <small>stock readiness change</small>
              </div>
              <div>
                <span>RECIPE COVERAGE</span>
                <strong>
                  {hasHistoricalComparison
                    ? formatSigned(historyTrend.recipeCoverageDelta, " pts")
                    : "—"}
                </strong>
                <small>configured menu mapping change</small>
              </div>
              <div>
                <span>FOOD COST</span>
                <strong>
                  {hasHistoricalComparison
                    ? formatSigned(historyTrend.foodCostDelta, " pts")
                    : "—"}
                </strong>
                <small>ingredient-cost ratio movement</small>
              </div>
              <div>
                <span>OWNER EXCEPTIONS</span>
                <strong>
                  {hasHistoricalComparison
                    ? formatSigned(historyTrend.ownerExceptionDelta)
                    : "—"}
                </strong>
                <small>human-dependency movement</small>
              </div>
            </div>
            <p className={styles.historyTrendNote}>
              {hasHistoricalComparison
                ? `Observed across ${historyTrend.snapshotCount} captured operating states. This is runtime history, not a claimed weekly/monthly business-performance period.`
                : "A baseline snapshot exists. Additional meaningful operating-state changes are required before Jourvis reports movement."}
            </p>
          </div>
        </details>

        <PendingDataSources
          title="Production performance KPIs"
          description="These remain unavailable until verified sales and financial providers exist. Jourvis will not estimate them from inventory activity."
          items={[
            ["Revenue", "POS / accounting", "Verified sales by reporting period"],
            ["Operating profit", "Accounting", "Revenue, COGS, labor and expenses"],
            ["Business-wide gross margin", "Sales + accounting", "Actual sales and COGS"],
            ["Average order value", "POS", "Transaction-level sales"],
          ]}
        />
      </SectionFrame>
    );
  }

  if (section === "finance") {
    const finance = buildCommandCenterFinance(state);
    const formatMoney = (value: number) =>
      "₱" + Math.round(value).toLocaleString("en-PH");
    const confirmedCommitmentStatuses = new Set([
      "confirmed",
      "in_transit",
      "partial_received",
    ]);
    const purchaseValue = (
      purchase: typeof state.purchases[number],
    ) =>
      Math.max(
        0,
        purchase.quotedTotal ?? purchase.estimatedTotal ?? 0,
      );
    const commitmentRows = activePurchases
      .slice()
      .sort(
        (left, right) =>
          purchaseValue(right) - purchaseValue(left),
      );
    const awaitingCommitmentValue = Math.max(
      0,
      finance.openPurchaseCommitments -
        finance.confirmedIncomingCommitments,
    );

    const financeHeadline = finance.openPurchaseCommitments
      ? `${formatMoney(finance.openPurchaseCommitments)} is currently committed to active purchasing.`
      : finance.receivedPurchaseSpend
        ? `${formatMoney(finance.receivedPurchaseSpend)} of purchasing spend has been received in the current runtime.`
        : "No purchasing money is currently committed.";

    return (
      <SectionFrame
        eyebrow="FINANCE"
        title={financeHeadline}
        description="This is operational finance from the Command Center runtime: purchasing exposure, received purchasing spend, configured on-hand inventory value, and ingredient-only menu economics. It is not a P&L or cash-accounting view."
      >
        <div className={styles.financePrimaryGrid}>
          <article data-state={finance.openPurchaseCommitments ? "active" : "clear"}>
            <span>OPEN COMMITMENTS</span>
            <strong>{formatMoney(finance.openPurchaseCommitments)}</strong>
            <small>all active purchasing workflows</small>
          </article>
          <article data-state={finance.confirmedIncomingCommitments ? "confirmed" : "clear"}>
            <span>CONFIRMED INCOMING</span>
            <strong>{formatMoney(finance.confirmedIncomingCommitments)}</strong>
            <small>confirmed, in-transit, or partially received purchases</small>
          </article>
          <article>
            <span>RECEIVED PURCHASING SPEND</span>
            <strong>{formatMoney(finance.receivedPurchaseSpend)}</strong>
            <small>received purchases captured in current runtime history</small>
          </article>
          <article>
            <span>ON-HAND INVENTORY VALUE</span>
            <strong>{formatMoney(finance.configuredInventoryValue)}</strong>
            <small>configured on-hand quantity × ingredient unit cost</small>
          </article>
        </div>

        <SalesAnalyticsPanel
          sales={state.sales}
          timeZone={business.timezone}
        />

        <article className={styles.financeCommitmentPanel}>
          <header>
            <div>
              <span>PURCHASING EXPOSURE</span>
              <h2>What is committed next</h2>
              <p>
                Active requests remain commitments until they are rejected or fully received.
                Confirmed incoming is tracked separately from stock already on hand.
              </p>
            </div>
            <a href={`/command-center/${business.id}/operations/purchasing`}>
              Open purchasing <ArrowRight size={13} />
            </a>
          </header>

          <div className={styles.financeCommitmentSummary}>
            <div>
              <span>ACTIVE REQUESTS</span>
              <strong>{commitmentRows.length}</strong>
              <small>current purchasing workflows</small>
            </div>
            <div>
              <span>AWAITING CONFIRMATION / DELIVERY</span>
              <strong>{formatMoney(awaitingCommitmentValue)}</strong>
              <small>open commitments not yet counted as confirmed incoming</small>
            </div>
            <div>
              <span>CONFIRMED INCOMING</span>
              <strong>{formatMoney(finance.confirmedIncomingCommitments)}</strong>
              <small>financial exposure already tied to confirmed incoming stock</small>
            </div>
          </div>

          {commitmentRows.length ? (
            <div className={styles.financeCommitmentRows}>
              {commitmentRows.map((purchase) => {
                const item = state.inventory.find(
                  (entry) => entry.id === purchase.itemId,
                );
                const confirmed = confirmedCommitmentStatuses.has(
                  purchase.status,
                );
                return (
                  <div key={purchase.id}>
                    <div>
                      <strong>{item?.name ?? purchase.itemId}</strong>
                      <small>
                        {purchase.id} · {humanizeAction(purchase.status)}
                      </small>
                    </div>
                    <span>
                      <small>Quantity</small>
                      <strong>
                        {purchase.quantity} {item?.unit ?? ""}
                      </strong>
                    </span>
                    <span>
                      <small>{purchase.quotedTotal !== undefined ? "Quoted" : "Estimated"}</small>
                      <strong>{formatMoney(purchaseValue(purchase))}</strong>
                    </span>
                    <b data-confirmed={confirmed ? "true" : undefined}>
                      {confirmed ? "CONFIRMED INCOMING" : "OPEN COMMITMENT"}
                    </b>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.financeEmptyNote}>
              No active purchasing commitment is currently open.
            </p>
          )}
        </article>

        <article className={styles.financeMenuEconomics}>
          <header>
            <div>
              <span>MENU UNIT ECONOMICS</span>
              <h2>What is left from each sale after food cost</h2>
              <p>
                This subtracts the estimated recipe food cost from the selling price.
                What remains is not profit: labor, rent, utilities, taxes, payment fees, waste, discounts, and other operating expenses still need to be paid.
              </p>
            </div>
            <a href={`/command-center/${business.id}/operations/menu`}>
              Open menu <ArrowRight size={13} />
            </a>
          </header>

          <div className={styles.financeMenuEconomicsGrid}>
            <div>
              <span>PRICED + RECIPE-MAPPED ITEMS</span>
              <strong>{finance.pricedMappedMenuCount}</strong>
              <small>items eligible for configured unit economics</small>
            </div>
            <div>
              <span>AVG REMAINING AFTER FOOD COST</span>
              <strong>
                {finance.averageMenuGrossProfit === null
                  ? "—"
                  : formatMoney(finance.averageMenuGrossProfit)}
              </strong>
              <small>selling price − estimated recipe food cost</small>
            </div>
            <div>
              <span>AVG MARGIN AFTER FOOD COST</span>
              <strong>
                {finance.averageMenuGrossMarginPercent === null
                  ? "—"
                  : finance.averageMenuGrossMarginPercent + "%"}
              </strong>
              <small>remaining after food cost ÷ selling price</small>
            </div>
          </div>
        </article>

        <details className={styles.financeTrendDisclosure}>
          <summary>
            <span>
              <WalletCards size={15} aria-hidden />
              Observed financial movement
            </span>
            <b>
              {hasHistoricalComparison
                ? `${historyTrend.snapshotCount} snapshots`
                : "Collecting"}
            </b>
          </summary>
          <div className={styles.financeTrendBody}>
            <div className={styles.historyTrendGrid}>
              <div>
                <span>OPEN COMMITMENTS</span>
                <strong>
                  {hasHistoricalComparison
                    ? formatSignedMoney(historyTrend.openCommitmentDelta)
                    : "—"}
                </strong>
                <small>active purchasing movement</small>
              </div>
              <div>
                <span>RECEIVED SPEND</span>
                <strong>
                  {hasHistoricalComparison
                    ? formatSignedMoney(historyTrend.receivedSpendDelta)
                    : "—"}
                </strong>
                <small>received purchasing movement</small>
              </div>
              <div>
                <span>INVENTORY VALUE</span>
                <strong>
                  {hasHistoricalComparison
                    ? formatSignedMoney(historyTrend.inventoryValueDelta)
                    : "—"}
                </strong>
                <small>configured on-hand value movement</small>
              </div>
              <div>
                <span>MENU MARGIN</span>
                <strong>
                  {hasHistoricalComparison
                    ? formatSigned(historyTrend.grossMarginDelta, " pts")
                    : "—"}
                </strong>
                <small>ingredient-only margin movement</small>
              </div>
            </div>
            <p className={styles.historyTrendNote}>
              {hasHistoricalComparison
                ? `Observed across ${historyTrend.snapshotCount} captured operating states. These are runtime value changes, not an accounting-period cash flow or P&L.`
                : "Jourvis needs another meaningful captured operating state before reporting movement."}
            </p>
          </div>
        </details>

        <PendingDataSources
          title="Formal accounting"
          description="Operational purchasing values are available now. These remain unavailable until verified financial providers are connected."
          items={[
            ["Profit & Loss", "Accounting + sales", "Revenue, COGS and operating expenses"],
            ["Cash Flow", "Bank / accounting", "Balances, inflows and scheduled outflows"],
            ["Payables", "Accounting / AP", "Invoices, due dates and payment status"],
            ["Receivables", "Sales / accounting", "Expected collections and payment status"],
            ["Reconciliation", "Bank + accounting", "Business records vs actual payments"],
          ]}
        />
      </SectionFrame>
    );
  }

  if (section === "operations") {
    return (
      <SectionFrame
        eyebrow="OPERATIONS"
        title="Industry-specific work, operated by Jourvis."
        description="The Command Center stays shared. Operations changes by business type and only loads modules that the business actually uses."
      >
        <div className={styles.cardGrid}>
          {business.operations.map((moduleId) => {
            const operationModule = operationCatalog[moduleId] ?? {
              label: moduleId,
              description: "Business operation managed through Jourvis.",
            };
            const moduleTaskCount = tasks.filter((task) => task.module === moduleId || (moduleId === "inventory" && task.module === "inventory") || (moduleId === "purchasing" && task.module === "purchasing")).length;
            return (
              <a
                className={styles.operationCard}
                href={`/command-center/${business.id}/operations/${moduleId}`}
                key={moduleId}
              >
                <span>{moduleTaskCount ? `${moduleTaskCount} NEED${moduleTaskCount === 1 ? "S" : ""} YOU` : "JOURVIS MANAGED"}</span>
                <h3>{operationModule.label}</h3>
                <p>{operationModule.description}</p>
                <b>{moduleTaskCount ? "Review exception" : "Open operation"} <ArrowRight size={14} /></b>
              </a>
            );
          })}
        </div>
      </SectionFrame>
    );
  }

  if (section === "activity") {
    const automaticCount = state.activity.filter(
      (entry) => entry.executionMode === "automatic",
    ).length;
    const manualCount = state.activity.filter(
      (entry) => entry.executionMode === "manual",
    ).length;
    const visibleActivity = state.activity.filter((entry) =>
      activityFilter === "all" ? true : entry.executionMode === activityFilter,
    );

    return (
      <SectionFrame
        eyebrow="ACTIVITY AUDIT"
        title="Every action should be explainable later."
        description="Review what Jourvis did automatically, what people did manually, why it happened, and the exact operating configuration captured when the action occurred."
      >
        <div className={styles.activitySummary}>
          <article>
            <span>AUTOMATIC</span>
            <strong>{automaticCount}</strong>
            <small>Jourvis and connected-system actions</small>
          </article>
          <article>
            <span>MANUAL</span>
            <strong>{manualCount}</strong>
            <small>Owner-confirmed actions and configuration changes</small>
          </article>
          <article>
            <span>TOTAL RECORDED</span>
            <strong>{state.activity.length}</strong>
            <small>Business-scoped audit entries</small>
          </article>
        </div>

        <div className={styles.activityToolbar}>
          <div>
            {(["all", "automatic", "manual"] as ActivityFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                data-active={activityFilter === filter}
                onClick={() => setActivityFilter(filter)}
              >
                {filter === "all" ? "All activity" : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
          <span>{business.timezone}</span>
        </div>

        <div className={styles.activityList}>
          {visibleActivity.map((entry) => (
            <article
              className={styles.activityEntry}
              data-mode={entry.executionMode}
              key={entry.id}
            >
              <header>
                <div>
                  <span className={styles.activityMode}>
                    {entry.executionMode === "automatic"
                      ? "AUTOMATIC"
                      : entry.executionMode === "manual"
                        ? "MANUAL"
                        : "SYSTEM"}
                  </span>
                  <small>{entry.actor.toUpperCase()} · {entry.module.toUpperCase()}</small>
                </div>
                <time dateTime={entry.at}>
                  {formatActivityTime(entry.at, business.timezone)}
                </time>
              </header>

              <h3>{entry.message}</h3>

              <div className={styles.activityReason}>
                <span>
                  {entry.actor === "jourvis" && entry.executionMode === "automatic"
                    ? "WHY JOURVIS DID THIS"
                    : "WHY THIS HAPPENED"}
                </span>
                <p>{entry.reason}</p>
              </div>

              {entry.configuration ? (
                <details className={styles.activityConfig}>
                  <summary>
                    Configuration used at {formatActivityTime(entry.configuration.capturedAt, business.timezone)}
                  </summary>
                  <p>{entry.configuration.summary}</p>
                  <div>
                    {Object.entries(entry.configuration.values).map(([key, value]) => (
                      <span key={key}>
                        <small>{humanizeAction(key)}</small>
                        <strong>{String(value)}</strong>
                      </span>
                    ))}
                  </div>
                </details>
              ) : null}

              <footer>
                <span>{humanizeAction(entry.action)}</span>
                {entry.relatedRequestId ? <small>Request {entry.relatedRequestId}</small> : null}
                {entry.relatedEntityId ? <small>Entity {entry.relatedEntityId}</small> : null}
              </footer>
            </article>
          ))}

          {!visibleActivity.length ? (
            <article className={styles.activityEmpty}>
              No {activityFilter === "all" ? "" : activityFilter} activity has been recorded yet.
            </article>
          ) : null}
        </div>

        <p className={styles.demoNote}>
          This branch stores the audit trail in business-scoped demo storage. The same activity schema is designed to move to persistent production storage so historical reasoning and configuration snapshots are not lost.
        </p>
      </SectionFrame>
    );
  }

  if (section === "briefings") {
    const briefingForecast = buildCommandCenterForecast(state, 7);
    const briefingDailySales = buildCommandCenterSalesAnalytics(
      state.sales,
      business.timezone,
      "daily",
    );
    const briefingWeeklySales = buildCommandCenterSalesAnalytics(
      state.sales,
      business.timezone,
      "weekly",
    );
    const recentActivity = state.activity.slice(0, 4);
    const incomingItems = state.inventory
      .filter((item) => item.incoming > 0)
      .sort((a, b) => b.incoming - a.incoming)
      .slice(0, 3);
    const nextMoves = briefingForecast.inventoryRows
      .filter(
        (row) =>
          row.activePurchaseId ||
          row.risk !== "covered" ||
          row.recommendedQuantity > 0,
      )
      .slice(0, 3);
    const formatMoney = (value: number) =>
      "₱" + Math.round(value).toLocaleString("en-PH");

    const briefingHeadline = tasks.length
      ? `${tasks.length} owner decision${tasks.length === 1 ? "" : "s"} currently shape what happens next.`
      : activePurchases.length
        ? `Jourvis is managing ${activePurchases.length} active workflow${activePurchases.length === 1 ? "" : "s"} without an owner blocker.`
        : briefingForecast.horizonRiskCount
          ? `${briefingForecast.horizonRiskCount} ingredient${briefingForecast.horizonRiskCount === 1 ? " needs" : "s need"} watching over the next seven days.`
          : "The current operating state is stable.";

    return (
      <SectionFrame
        eyebrow="BRIEFINGS"
        title="Your current business briefing."
        description="One concise owner briefing from live Command Center state. Dated demo POS figures are explicitly labeled synthetic; verified production reporting still requires real sales providers."
      >
        <article className={styles.executiveBriefing}>
          <header className={styles.executiveBriefingHeader}>
            <div>
              <span>JOURVIS · CURRENT BRIEFING</span>
              <h2>{briefingHeadline}</h2>
              <p>
                Jourvis is {state.automationMasterOn ? "running" : "paused"}.
                {" "}{activePurchases.length} purchasing workflow{activePurchases.length === 1 ? "" : "s"} are active,
                {" "}{tasks.length} exception{tasks.length === 1 ? "" : "s"} require owner authority,
                and {briefingForecast.horizonRiskCount} ingredient{briefingForecast.horizonRiskCount === 1 ? " is" : "s are"} in a configured seven-day risk state.
                {" "}The synthetic demo POS ledger records {formatMoney(briefingDailySales.current.revenue)} today and {formatMoney(briefingWeeklySales.current.revenue)} this week.
              </p>
            </div>
            <div className={styles.executiveBriefingFacts}>
              <span><b>{activePurchases.length}</b> active workflows</span>
              <span><b>{tasks.length}</b> need owner</span>
              <span><b>{briefingForecast.horizonRiskCount}</b> 7-day risks</span>
              <span><b>{formatMoney(briefingDailySales.current.revenue)}</b> demo sales today</span>
            </div>
          </header>

          <div className={styles.executiveBriefingSections}>
            <section>
              <div className={styles.executiveBriefingSectionHeading}>
                <span>01</span>
                <div>
                  <strong>What happened</strong>
                  <small>The latest recorded operating events</small>
                </div>
              </div>
              <div className={styles.executiveBriefingRows}>
                {recentActivity.length ? (
                  recentActivity.map((entry) => (
                    <div key={entry.id}>
                      <span>{humanizeAction(entry.action)}</span>
                      <p>{entry.message}</p>
                    </div>
                  ))
                ) : (
                  <p className={styles.executiveBriefingEmpty}>
                    No operating activity has been recorded yet.
                  </p>
                )}
              </div>
            </section>

            <section>
              <div className={styles.executiveBriefingSectionHeading}>
                <span>02</span>
                <div>
                  <strong>What Jourvis did</strong>
                  <small>Work already handled or currently in motion</small>
                </div>
              </div>
              <div className={styles.executiveBriefingRows}>
                {activePurchases.length ? (
                  activePurchases.slice(0, 4).map((purchase) => {
                    const item = state.inventory.find(
                      (candidate) => candidate.id === purchase.itemId,
                    );
                    return (
                      <div key={purchase.id}>
                        <span>{item?.name ?? purchase.itemId}</span>
                        <p>
                          {purchase.origin === "jourvis"
                            ? "Jourvis"
                            : "Owner"} started {purchase.id}; it is now {humanizeAction(purchase.status).toLowerCase()}.
                          {" "}{purchase.explanation}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className={styles.executiveBriefingEmpty}>
                    No purchasing workflow is active right now.
                  </p>
                )}
              </div>
            </section>

            <section>
              <div className={styles.executiveBriefingSectionHeading}>
                <span>03</span>
                <div>
                  <strong>What changed</strong>
                  <small>Only changes the current runtime can support</small>
                </div>
              </div>
              <div className={styles.executiveBriefingRows}>
                {hasHistoricalComparison ? (
                  <>
                    <div>
                      <span>Inventory readiness</span>
                      <p>
                        Changed {formatSigned(historyTrend.inventoryReadinessDelta, " points")} across {historyTrend.snapshotCount} captured operating states.
                      </p>
                    </div>
                    <div>
                      <span>7-day risk</span>
                      <p>
                        Changed {formatSigned(historyTrend.inventoryRiskDelta)} ingredient{Math.abs(historyTrend.inventoryRiskDelta ?? 0) === 1 ? "" : "s"} across the observed states.
                      </p>
                    </div>
                    <div>
                      <span>Open commitments</span>
                      <p>
                        Changed {formatSignedMoney(historyTrend.openCommitmentDelta)} across the observed states.
                      </p>
                    </div>
                  </>
                ) : incomingItems.length ? (
                  incomingItems.map((item) => (
                    <div key={item.id}>
                      <span>{item.name}</span>
                      <p>
                        {item.incoming} {item.unit} is confirmed incoming and remains separate from on-hand stock until receiving.
                      </p>
                    </div>
                  ))
                ) : (
                  <p className={styles.executiveBriefingEmpty}>
                    There is not enough captured history yet to claim a trend or period-over-period change.
                  </p>
                )}
              </div>
            </section>

            <section data-attention={tasks.length ? "true" : undefined}>
              <div className={styles.executiveBriefingSectionHeading}>
                <span>04</span>
                <div>
                  <strong>What needs attention</strong>
                  <small>Only exceptions requiring human authority</small>
                </div>
              </div>
              <div className={styles.executiveBriefingRows}>
                {tasks.length ? (
                  tasks.slice(0, 3).map((task) => (
                    <div key={task.id}>
                      <span>{task.title}</span>
                      <p>{task.whyOwnerIsNeeded ?? task.why}</p>
                    </div>
                  ))
                ) : (
                  <div>
                    <span>No owner decision waiting</span>
                    <p>Jourvis is operating inside the configured authority and safeguards.</p>
                  </div>
                )}
              </div>
              {tasks.length ? (
                <a
                  className={styles.cardLink}
                  href={`/command-center/${business.id}/decisions`}
                >
                  Open decisions <ArrowRight size={14} />
                </a>
              ) : null}
            </section>

            <section>
              <div className={styles.executiveBriefingSectionHeading}>
                <span>05</span>
                <div>
                  <strong>What happens next</strong>
                  <small>The next expected operating moves</small>
                </div>
              </div>
              <div className={styles.executiveBriefingRows}>
                {nextMoves.length ? (
                  nextMoves.map((row) => (
                    <div key={row.itemId}>
                      <span>{row.name}</span>
                      <p>{row.nextAction}</p>
                    </div>
                  ))
                ) : (
                  <p className={styles.executiveBriefingEmpty}>
                    No immediate replenishment move is currently required.
                  </p>
                )}
              </div>
            </section>
          </div>

          <footer className={styles.executiveBriefingFooter}>
            <CheckCircle2 size={14} aria-hidden />
            <span>
              Generated from current Inventory, Purchasing, Forecast, Decisions, Finance, and Activity runtime state.
              Formal accounting and true weekly/monthly reporting remain provider-gated.
            </span>
          </footer>
        </article>
      </SectionFrame>
    );
  }

  if (section === "insights") {
    const insights = buildCommandCenterInsights(state, tasks);
    const selectedInsight = insightModalId
      ? insights.find((insight) => insight.id === insightModalId)
      : undefined;
    const activeMethods = commandCenterInsightMethods.filter(
      (method) => method.status === "active",
    );
    const waitingMethods = commandCenterInsightMethods.filter(
      (method) => method.status === "waiting_for_data",
    );

    return (
      <SectionFrame
        eyebrow="INSIGHTS"
        title="Only what is worth noticing."
        description="Jourvis uses auditable business math and runtime rules. Every surfaced insight can show exactly how it was calculated, and advanced formulas remain visible even when the required data is not connected yet."
      >
        <div className={styles.insightSummary}>
          <span>SELECTIVE SIGNALS</span>
          <strong>{insights.length}</strong>
          <small>
            runtime-supported insight{insights.length === 1 ? "" : "s"} right now
          </small>
          <button
            type="button"
            className={styles.insightMethodsButton}
            onClick={() => {
              setInsightModalId(null);
              setInsightMethodsOpen(true);
            }}
          >
            <HelpCircle size={14} aria-hidden />
            Methods &amp; equations
          </button>
        </div>

        <div className={styles.insightList}>
          {insights.map((insight) => {
            const InsightIcon =
              insight.severity === "protected"
                ? ShieldCheck
                : insight.severity === "trend"
                  ? LineChart
                  : insight.tag === "MENU ECONOMICS"
                    ? WalletCards
                    : insight.tag.includes("PRICE")
                      ? Sparkles
                      : CircleAlert;

            return (
              <article
                key={insight.id}
                data-severity={insight.severity}
              >
                <InsightIcon size={16} />
                <div>
                  <strong>{insight.title}</strong>
                  <p>{insight.summary}</p>
                  <div className={styles.insightMeta}>
                    <span>{insight.tag}</span>
                    <div>
                      <button
                        type="button"
                        className={styles.insightExplainButton}
                        onClick={() => {
                          setInsightMethodsOpen(false);
                          setInsightModalId(insight.id);
                        }}
                        aria-label={`Show how Jourvis calculated ${insight.title}`}
                      >
                        <HelpCircle size={12} aria-hidden />
                        How?
                      </button>
                      {insight.href ? (
                        <a href={insight.href}>
                          Open details <ArrowRight size={12} />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {!insights.length ? (
            <article data-severity="clear">
              <CheckCircle2 size={16} />
              <div>
                <strong>No material runtime insight needs surfacing right now</strong>
                <p>
                  Jourvis found no supported stock-risk, price-variance,
                  incoming-protection, menu-economics, or observed-trend signal
                  strong enough to call out.
                </p>
                <div className={styles.insightMeta}>
                  <span>CLEAR</span>
                  <div>
                    <button
                      type="button"
                      className={styles.insightExplainButton}
                      onClick={() => setInsightMethodsOpen(true)}
                    >
                      <HelpCircle size={12} aria-hidden />
                      See the math
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ) : null}
        </div>

        {selectedInsight ? (
          <div className={styles.insightModalBackdrop}>
            <dialog
              open
              className={styles.insightMathModal}
              aria-labelledby="insight-calculation-title"
            >
              <header className={styles.insightMathModalHeader}>
                <div>
                  <span>HOW JOURVIS SOLVED IT</span>
                  <h2 id="insight-calculation-title">{selectedInsight.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setInsightModalId(null)}
                  aria-label="Close calculation"
                >
                  <X size={16} aria-hidden />
                </button>
              </header>

              <div className={styles.insightMathModalBody}>
                <p className={styles.insightMathIntro}>
                  These are the deterministic equations and runtime inputs behind
                  this insight. Jourvis explains the result; the displayed
                  numbers come from the formulas below.
                </p>

                <div className={styles.insightEquationList}>
                  {selectedInsight.calculations.map((calculation, index) => (
                    <article key={calculation.label}>
                      <div className={styles.insightEquationNumber}>
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div>
                        <strong>{calculation.label}</strong>
                        <dl>
                          <div>
                            <dt>Equation</dt>
                            <dd><code>{calculation.formula}</code></dd>
                          </div>
                          <div>
                            <dt>Inputs</dt>
                            <dd><code>{calculation.substitution}</code></dd>
                          </div>
                          <div>
                            <dt>Result</dt>
                            <dd><b>{calculation.result}</b></dd>
                          </div>
                        </dl>
                        <p>{calculation.meaning}</p>
                      </div>
                    </article>
                  ))}
                </div>

                {selectedInsight.dataLimit ? (
                  <div className={styles.insightDataLimit}>
                    <CircleAlert size={15} aria-hidden />
                    <div>
                      <strong>Data limit</strong>
                      <p>{selectedInsight.dataLimit}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </dialog>
          </div>
        ) : null}

        {insightMethodsOpen ? (
          <div className={styles.insightModalBackdrop}>
            <dialog
              open
              className={styles.insightMathModal}
              aria-labelledby="insight-methods-title"
            >
              <header className={styles.insightMathModalHeader}>
                <div>
                  <span>TRANSPARENT ANALYTICS</span>
                  <h2 id="insight-methods-title">Jourvis methods &amp; equations</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setInsightMethodsOpen(false)}
                  aria-label="Close methodology"
                >
                  <X size={16} aria-hidden />
                </button>
              </header>

              <div className={styles.insightMathModalBody}>
                <p className={styles.insightMathIntro}>
                  Jourvis does not hide unavailable mathematics. Methods that
                  have enough data are active; methods that need more history or
                  providers stay visible and explicitly say what is missing.
                </p>

                <section className={styles.insightMethodGroup}>
                  <div className={styles.insightMethodGroupHeading}>
                    <span>ACTIVE NOW</span>
                    <b>{activeMethods.length}</b>
                  </div>
                  <div className={styles.insightMethodList}>
                    {activeMethods.map((method) => (
                      <article key={method.id}>
                        <strong>{method.label}</strong>
                        <code>{method.formula}</code>
                        <p>{method.purpose}</p>
                        <small>Uses: {method.requires.join(" · ")}</small>
                      </article>
                    ))}
                  </div>
                </section>

                <section className={styles.insightMethodGroup}>
                  <div className={styles.insightMethodGroupHeading}>
                    <span>WAITING FOR DATA</span>
                    <b>{waitingMethods.length}</b>
                  </div>
                  <div className={styles.insightMethodList}>
                    {waitingMethods.map((method) => (
                      <article key={method.id} data-waiting>
                        <strong>{method.label}</strong>
                        <code>{method.formula}</code>
                        <p>{method.purpose}</p>
                        <small>Needs: {method.requires.join(" · ")}</small>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </dialog>
          </div>
        ) : null}
      </SectionFrame>
    );
  }

  return (
    <SectionFrame
      eyebrow="DECISIONS"
      title="Only what Jourvis cannot safely decide alone."
      description="Every escalation explains what happened, the rule involved, what Jourvis already did, and exactly why human authority is required."
    >
      <div className={styles.decisionsList}>
        {tasks.map((task) => (
          <article key={task.id}>
            <div className={styles.decisionTop}>
              <span data-priority={task.priority === "high" ? "high" : undefined}>{task.priority.toUpperCase()}</span>
              <small>{task.module} · live demo runtime</small>
            </div>
            <h3>{task.title}</h3>
            <dl className={styles.taskExplanation}>
              <div><dt>What happened</dt><dd>{task.whatHappened}</dd></div>
              <div><dt>Why</dt><dd>{task.why}</dd></div>
              <div><dt>What Jourvis did</dt><dd>{task.whatJourvisDid}</dd></div>
              {task.whyOwnerIsNeeded ? <div><dt>Why you are needed</dt><dd>{task.whyOwnerIsNeeded}</dd></div> : null}
            </dl>
            <div className={styles.decisionActions}>
              {task.actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => {
                    if (action === "update") {
                      window.dispatchEvent(
                        new CustomEvent("jourvis-command-center-update", {
                          detail: { taskId: task.id },
                        }),
                      );
                      return;
                    }
                    actOnTask(task.id, action);
                  }}
                >
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </button>
              ))}
            </div>
          </article>
        ))}
        {!tasks.length ? (
          <article>
            <div className={styles.decisionTop}><span>READY</span><small>Jourvis</small></div>
            <h3>No owner decisions are waiting.</h3>
            <p className={styles.demoNote}>Jourvis is currently operating inside the authority and safeguards configured for this business.</p>
          </article>
        ) : null}
      </div>
    </SectionFrame>
  );
}

function PendingDataSources({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: Array<[string, string, string]>;
}) {
  return (
    <details className={styles.pendingDataSources}>
      <summary>
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <b>{items.length} later</b>
      </summary>
      <div>
        {items.map(([label, source, note]) => (
          <article key={label}>
            <strong>{label}</strong>
            <span>{source}</span>
            <small>{note}</small>
          </article>
        ))}
      </div>
    </details>
  );
}

function SectionFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.sectionPage}>
      <header className={styles.pageIntro}>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      {children}
    </section>
  );
}

function PanelHeading({
  icon,
  eyebrow,
  title,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className={styles.panelHeading}>
      <span className={styles.panelIcon}>{icon}</span>
      <div><span>{eyebrow}</span><strong>{title}</strong></div>
    </div>
  );
}
