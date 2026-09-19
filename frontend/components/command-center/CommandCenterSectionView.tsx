"use client";

import { type ReactNode, useState } from "react";
import {
  ArrowRight,
  Bot,
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
    const highPriorityTaskCount = tasks.filter(
      (task) => task.priority === "high",
    ).length;

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

    const overviewMetrics = [
      {
        label: "Needs owner",
        value: String(tasks.length),
        note: highPriorityTaskCount
          ? highPriorityTaskCount +
            " high-priority exception" +
            (highPriorityTaskCount === 1 ? "" : "s")
          : "no high-priority exceptions",
      },
      {
        label: "Jourvis working",
        value: String(activePurchases.length),
        note: "active purchasing workflows",
      },
      {
        label: "7-day inventory risk",
        value: String(overviewPerformance.inventoryRiskCount),
        note: "configured usage plus incoming stock",
      },
      {
        label: "Inventory readiness",
        value:
          overviewPerformance.inventoryReadinessPercent === null
            ? "—"
            : overviewPerformance.inventoryReadinessPercent + "%",
        note: "average stock vs configured full level",
      },
    ];

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

        <div className={styles.metricGrid}>
          {overviewMetrics.map((metric) => (
            <article className={styles.metricCard} key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <div>
                <b>Runtime</b>
                <small>{metric.note}</small>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.overviewColumns}>
          <article className={styles.panelCard}>
            <PanelHeading
              icon={<ShieldCheck size={17} />}
              eyebrow="NEEDS YOU"
              title={
                tasks.length
                  ? tasks.length +
                    " exception" +
                    (tasks.length === 1 ? "" : "s") +
                    " need the owner"
                  : "No owner decisions waiting"
              }
            />
            <div className={styles.decisionPreview}>
              {tasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  data-priority={
                    task.priority === "high" ? "high" : undefined
                  }
                >
                  <CircleAlert size={16} />
                  <span>
                    <strong>{task.title}</strong>
                    <small>{task.why}</small>
                  </span>
                </div>
              ))}
              {!tasks.length ? (
                <div>
                  <CheckCircle2 size={16} />
                  <span>
                    <strong>Jourvis is inside its authority.</strong>
                    <small>
                      Normal work can continue without an owner decision.
                    </small>
                  </span>
                </div>
              ) : null}
            </div>
            <a
              className={styles.cardLink}
              href={"/command-center/" + business.id + "/decisions"}
            >
              Open decisions <ArrowRight size={14} />
            </a>
          </article>

          <article className={styles.panelCard}>
            <PanelHeading
              icon={<Bot size={17} />}
              eyebrow="JOURVIS NOW"
              title={
                activePurchases.length
                  ? activePurchases.length +
                    " active purchasing workflow" +
                    (activePurchases.length === 1 ? "" : "s")
                  : "No active purchasing workflow"
              }
            />
            <div className={styles.decisionPreview}>
              {activePurchases.slice(0, 3).map((purchase) => {
                const item = state.inventory.find(
                  (candidate) => candidate.id === purchase.itemId,
                );
                return (
                  <div key={purchase.id}>
                    <Sparkles size={16} />
                    <span>
                      <strong>{item?.name ?? purchase.itemId}</strong>
                      <small>
                        {humanizeAction(purchase.status)} · {purchase.id}
                      </small>
                    </span>
                  </div>
                );
              })}
              {!activePurchases.length ? (
                <div>
                  <CheckCircle2 size={16} />
                  <span>
                    <strong>No replenishment work is active.</strong>
                    <small>
                      Jourvis will start new work only when a configured trigger
                      is reached and its authority allows it.
                    </small>
                  </span>
                </div>
              ) : null}
            </div>
            <a
              className={styles.cardLink}
              href={
                "/command-center/" +
                business.id +
                "/operations/purchasing"
              }
            >
              Open purchasing <ArrowRight size={14} />
            </a>
          </article>
        </div>
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

    return (
      <SectionFrame
        eyebrow="FORECAST"
        title="What Jourvis expects next."
        description="Forecasts are operating inputs, not decoration. This first runtime-backed forecast uses live inventory, expected daily consumption, incoming stock, supplier lead time, recipes, purchasing rules, and active purchase workflows."
      >
        <div className={styles.metricGrid}>
          {[
            [
              "Lead-time risk",
              String(forecast.leadTimeRiskCount),
              "ingredients exposed before or near supplier arrival",
            ],
            [
              "7-day exposure",
              String(forecast.horizonRiskCount),
              "ingredients projected to reach a risk state",
            ],
            [
              "Restock pressure",
              String(forecast.purchasePressureCount),
              "ingredients with a calculated replenishment need",
            ],
            [
              "Demand inputs",
              `${forecast.configuredDemandInputs}/${state.inventory.length}`,
              "inventory items with configured daily usage",
            ],
          ].map(([label, value, note]) => (
            <article className={styles.metricCard} key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <div>
                <b>{forecast.horizonDays} days</b>
                <small>{note}</small>
              </div>
            </article>
          ))}
        </div>

        <article className={styles.panelCard}>
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
              ? `Observed from ${formatActivityTime(historyTrend.oldestAt ?? "", business.timezone)} to ${formatActivityTime(historyTrend.latestAt ?? "", business.timezone)}. This is runtime history, not yet POS-based forecast accuracy.`
              : "Jourvis has started capturing historical operating snapshots. Trend comparisons appear after the business state changes."}
          </p>
        </article>

        <article className={styles.panelCard}>
          <PanelHeading
            icon={<CheckCircle2 size={17} />}
            eyebrow="FORECAST ACCURACY"
            title={
              forecastAccuracy.matured
                ? "Compare earlier 7-day projections with later actual stock"
                : "Collecting a matured 7-day comparison"
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
              <span>MEAN NORMALIZED ERROR</span>
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
              <small>prediction window currently evaluated</small>
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
              ? `Baseline ${formatActivityTime(forecastAccuracy.baselineAt ?? "", business.timezone)} → actual ${formatActivityTime(forecastAccuracy.actualAt ?? "", business.timezone)}. This measures the configured inventory-demand baseline only; POS-driven demand-model accuracy comes later.`
              : "Jourvis will not label the forecast accurate or inaccurate until the configured horizon has actually elapsed and a later observation exists."}
          </p>
        </article>

        <article className={styles.panelCard}>
          <PanelHeading
            icon={<LineChart size={17} />}
            eyebrow="INVENTORY FORECAST"
            title="Projected stock, shortage pressure, and next action"
          />
          <div className={styles.forecastList}>
            {forecast.inventoryRows.map((row) => (
              <article
                className={styles.forecastRow}
                data-risk={row.risk}
                key={row.itemId}
              >
                <div className={styles.forecastIdentity}>
                  <SupplyPhoto
                    supplyId={row.itemId}
                    className={styles.forecastSupplyPhoto}
                    size={48}
                  />
                  <div>
                    <span>{row.risk.toUpperCase()}</span>
                    <strong>{row.name}</strong>
                    <small>
                      {row.daysCover !== null
                        ? `${row.daysCover} days cover`
                        : "No daily-use forecast configured"}
                      {" · "}
                      lead time {row.leadDays} day{row.leadDays === 1 ? "" : "s"}
                    </small>
                  </div>
                </div>

                <div className={styles.forecastFacts}>
                  <span>
                    <small>On hand</small>
                    <strong>{row.current} {row.unit}</strong>
                  </span>
                  <span>
                    <small>Incoming</small>
                    <strong>{row.incoming} {row.unit}</strong>
                  </span>
                  <span>
                    <small>At supplier arrival</small>
                    <strong>{row.projectedAtDelivery} {row.unit}</strong>
                  </span>
                  <span>
                    <small>After {forecast.horizonDays} days</small>
                    <strong>{row.projectedAtHorizon} {row.unit}</strong>
                  </span>
                  <span>
                    <small>Recommended order</small>
                    <strong>{row.recommendedQuantity} {row.unit}</strong>
                  </span>
                </div>

                <div className={styles.forecastReason}>
                  <span>NEXT JOURVIS ACTION</span>
                  <p>{row.nextAction}</p>
                  {row.affectedRecipes.length ? (
                    <small>
                      Menu/recipe impact: {row.affectedRecipes.join(", ")}
                    </small>
                  ) : null}
                </div>
              </article>
            ))}

            {!forecast.inventoryRows.length ? (
              <div className={styles.activityEmpty}>
                No inventory data is connected for this business yet.
              </div>
            ) : null}
          </div>
          <p className={styles.demoNote}>
            {connectedInventoryRows.length} ingredient{connectedInventoryRows.length === 1 ? "" : "s"} currently have demand inputs. Production forecasting will replace configured daily-use baselines with POS history, reservations/orders, seasonality, promotions, supplier history, and other verified providers.
          </p>
        </article>

        <PendingDataSources
          title="Production forecast inputs"
          description="The demo forecast is intentionally inventory-led. These expand only when real providers are connected."
          items={[
            ["Revenue", "POS / accounting", "Real sales history"],
            ["Customer demand", "POS / reservations", "Covers and forward demand"],
            ["Cash", "Finance", "Balances, payables and receivables"],
            ["Labor", "Scheduling / timeclock", "Staffing and labor cost"],
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
    const formatSupplierMinutes = (value: number | null) =>
      value === null
        ? "—"
        : value < 60
          ? `${value} min`
          : `${Math.round((value / 60) * 10) / 10} hr`;
    const metricRows = [
      [
        "Inventory readiness",
        performance.inventoryReadinessPercent === null
          ? "—"
          : performance.inventoryReadinessPercent + "%",
        "average on-hand stock vs configured full level",
      ],
      [
        "7-day inventory risk",
        String(performance.inventoryRiskCount),
        "Forecast",
      ],
      [
        "Menu recipe coverage",
        performance.recipeCoveragePercent === null
          ? "—"
          : performance.recipeCoveragePercent + "%",
        `${performance.recipeMappedMenuCount}/${performance.activeMenuItemCount} configured items mapped`,
      ],
      [
        "Average food cost",
        performance.averageFoodCostPercent === null
          ? "—"
          : performance.averageFoodCostPercent + "%",
        performance.pricedMappedMenuCount
          ? `${performance.pricedMappedMenuCount} priced recipe-mapped item${performance.pricedMappedMenuCount === 1 ? "" : "s"}`
          : "live selling prices required",
      ],
      [
        "Active workflows",
        String(performance.activeWorkflowCount),
        "live purchasing work",
      ],
      [
        "Owner exceptions",
        String(performance.ownerExceptionCount),
        "live Decisions queue",
      ],
      [
        "Automation share",
        performance.automationSharePercent === null
          ? "—"
          : performance.automationSharePercent + "%",
        `${performance.automaticActivityCount} automatic · ${performance.manualActivityCount} manual actions`,
      ],
      [
        "Purchase completion",
        performance.purchaseCompletionPercent === null
          ? "—"
          : performance.purchaseCompletionPercent + "%",
        `${performance.receivedPurchaseCount}/${performance.closedPurchaseCount} closed purchases received`,
      ],
      [
        "Supplier completion",
        supplierPerformance.completionRatePercent === null
          ? "—"
          : supplierPerformance.completionRatePercent + "%",
        `${supplierPerformance.receivedCount}/${supplierPerformance.closedCount} closed supplier requests received`,
      ],
      [
        "Supplier response",
        formatSupplierMinutes(supplierPerformance.averageViewMinutes),
        "average request creation → supplier viewed",
      ],
    ];

    return (
      <SectionFrame
        eyebrow="PERFORMANCE"
        title="Is the business actually improving?"
        description="Performance now uses live Command Center operating state where the data exists. Financial KPIs stay unavailable until verified sales/accounting providers are connected."
      >
        <div className={styles.metricGrid}>
          {metricRows.map(([label, value, note]) => (
            <article className={styles.metricCard} key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <div>
                <b>Runtime</b>
                <small>{note}</small>
              </div>
            </article>
          ))}
        </div>

        <article className={styles.panelCard}>
          <PanelHeading
            icon={<LineChart size={17} />}
            eyebrow="PERFORMANCE TREND"
            title="Observed KPI movement"
          />
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
              <small>active menu mapping change</small>
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
              ? `${historyTrend.snapshotCount} operating snapshots are available in the current business history.`
              : "A baseline snapshot exists; make operational changes to begin measuring performance movement."}
          </p>
        </article>

        <article className={styles.panelCard}>
          <PanelHeading
            icon={<Sparkles size={17} />}
            eyebrow="JOURVIS EXPLAINS"
            title="Operational causes behind the numbers"
          />
          <div className={styles.insightList}>
            <article>
              <LineChart size={16} />
              <div>
                <strong>Inventory health</strong>
                <p>
                  {performance.inventoryRiskCount
                    ? `${performance.inventoryRiskCount} ingredient${performance.inventoryRiskCount === 1 ? " is" : "s are"} forecast to enter a risk state within seven days. Forecast identifies the affected recipes and next purchasing action.`
                    : "No configured ingredient is currently forecast to enter a stock-risk state within seven days."}
                </p>
              </div>
            </article>
            <article>
              <CheckCircle2 size={16} />
              <div>
                <strong>Menu operating coverage</strong>
                <p>
                  {performance.recipeCoveragePercent === null
                    ? "No active menu items are configured yet."
                    : `${performance.recipeCoveragePercent}% of active menu items have an active recipe mapping. Items without recipes cannot yet drive ingredient cost or POS inventory deductions.`}
                </p>
              </div>
            </article>
            <article>
              <Bot size={16} />
              <div>
                <strong>Automation load</strong>
                <p>
                  {performance.automationSharePercent === null
                    ? "No automatic or manual operating actions have been recorded yet."
                    : `${performance.automationSharePercent}% of recorded owner/Jourvis operating actions are automatic in the current browser runtime. ${performance.ownerExceptionCount} exception${performance.ownerExceptionCount === 1 ? " is" : "s are"} waiting for human authority.`}
                </p>
              </div>
            </article>
            <article>
              <CheckCircle2 size={16} />
              <div>
                <strong>Purchasing outcomes</strong>
                <p>
                  {performance.closedPurchaseCount
                    ? `${performance.receivedPurchaseCount} of ${performance.closedPurchaseCount} closed purchase workflow${performance.closedPurchaseCount === 1 ? "" : "s"} finished as received. Rejected requests remain visible in Activity instead of being erased.`
                    : "No purchase workflow has reached a closed state yet."}
                </p>
              </div>
            </article>
            <article>
              <LineChart size={16} />
              <div>
                <strong>Supplier responsiveness</strong>
                <p>
                  {supplierPerformance.requestCount
                    ? `Across ${supplierPerformance.requestCount} observed supplier request${supplierPerformance.requestCount === 1 ? "" : "s"}, average supplier-view time is ${formatSupplierMinutes(supplierPerformance.averageViewMinutes)}, average quote response is ${formatSupplierMinutes(supplierPerformance.averageQuoteMinutes)}, and closed-request completion is ${supplierPerformance.completionRatePercent === null ? "not yet measurable" : supplierPerformance.completionRatePercent + "%"}.`
                    : "No supplier workflow history exists yet. Timing metrics will populate from recorded supplier-view, quote, confirmation, and receipt events."}
                </p>
              </div>
            </article>
          </div>
        </article>

        <PendingDataSources
          title="Production performance KPIs"
          description="These stay hidden in the demo because Jourvis does not invent sales or accounting results."
          items={[
            ["Revenue", "POS / accounting", "Verified sales by reporting period"],
            ["Operating profit", "Accounting", "Revenue, COGS, labor and expenses"],
            ["Gross margin", "Sales + accounting", "Business-wide margin"],
            ["Average order value", "POS", "Real transaction-level AOV"],
          ]}
        />
      </SectionFrame>
    );
  }

  if (section === "finance") {
    const finance = buildCommandCenterFinance(state);
    const formatMoney = (value: number) =>
      "₱" + Math.round(value).toLocaleString("en-PH");

    return (
      <SectionFrame
        eyebrow="FINANCE"
        title="Where the money went—and what is committed next."
        description="Finance now exposes the operating values Command Center can genuinely derive. Formal P&L, cash flow, expenses, receivables, payables, and reconciliation remain locked behind verified financial providers."
      >
        <div className={styles.metricGrid}>
          {[
            [
              "Open purchase commitments",
              formatMoney(finance.openPurchaseCommitments),
              "all active purchasing workflows",
            ],
            [
              "Confirmed incoming commitments",
              formatMoney(finance.confirmedIncomingCommitments),
              "confirmed / in-transit / partially received purchases",
            ],
            [
              "Received purchasing spend",
              formatMoney(finance.receivedPurchaseSpend),
              "closed received purchases in current runtime history",
            ],
            [
              "Configured inventory value",
              formatMoney(finance.configuredInventoryValue),
              "on-hand quantity × configured ingredient unit cost",
            ],
            [
              "Avg menu gross profit",
              finance.averageMenuGrossProfit === null
                ? "—"
                : formatMoney(finance.averageMenuGrossProfit),
              finance.pricedMappedMenuCount
                ? `${finance.pricedMappedMenuCount} priced recipe-mapped item${finance.pricedMappedMenuCount === 1 ? "" : "s"}`
                : "live selling prices required",
            ],
            [
              "Avg menu gross margin",
              finance.averageMenuGrossMarginPercent === null
                ? "—"
                : finance.averageMenuGrossMarginPercent + "%",
              "ingredient cost only; operating expenses not included",
            ],
          ].map(([label, value, note]) => (
            <article className={styles.metricCard} key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <div>
                <b>Runtime</b>
                <small>{note}</small>
              </div>
            </article>
          ))}
        </div>

        <article className={styles.panelCard}>
          <PanelHeading
            icon={<WalletCards size={17} />}
            eyebrow="FINANCIAL MOVEMENT"
            title="What changed in the observed runtime"
          />
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
              <span>MENU GROSS MARGIN</span>
              <strong>
                {hasHistoricalComparison
                  ? formatSigned(historyTrend.grossMarginDelta, " pts")
                  : "—"}
              </strong>
              <small>ingredient-only margin movement</small>
            </div>
          </div>
          <p className={styles.historyTrendNote}>
            These are changes in Command Center operating values only. They do not represent accounting-period cash flow or P&amp;L until verified financial providers are connected.
          </p>
        </article>

        <article className={styles.panelCard}>
          <PanelHeading
            icon={<WalletCards size={17} />}
            eyebrow="WHAT THESE NUMBERS MEAN"
            title="Operational finance, not accounting fiction"
          />
          <div className={styles.explainer}>
            <p>
              Purchase commitments and configured inventory value come from the current Command Center operating state. Menu gross profit/margin uses current selling price minus configured recipe ingredient cost only. It does not claim to include labor, rent, taxes, payment fees, utilities, or other operating expenses.
            </p>
          </div>
        </article>

        <PendingDataSources
          title="Production accounting views"
          description="Operational purchasing values are live in this demo. Formal accounting remains unavailable until verified financial providers are connected."
          items={[
            ["Profit & Loss", "Accounting + sales", "Revenue, COGS and operating expenses"],
            ["Cash Flow", "Bank / accounting", "Balances, inflows and scheduled outflows"],
            ["Expenses", "Accounting / expense", "Categories, recurring costs and anomalies"],
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
    const briefingFinance = buildCommandCenterFinance(state);
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
        description="One concise owner briefing from the live Command Center state. No invented daily, weekly, or monthly reporting."
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
              </p>
            </div>
            <div className={styles.executiveBriefingFacts}>
              <span><b>{activePurchases.length}</b> active workflows</span>
              <span><b>{tasks.length}</b> need owner</span>
              <span><b>{briefingForecast.horizonRiskCount}</b> 7-day risks</span>
              <span><b>{formatMoney(briefingFinance.openPurchaseCommitments)}</b> open commitments</span>
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
          <div
            className={styles.insightModalBackdrop}
            role="presentation"
            onMouseDown={() => setInsightModalId(null)}
          >
            <section
              className={styles.insightMathModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="insight-calculation-title"
              onMouseDown={(event) => event.stopPropagation()}
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
            </section>
          </div>
        ) : null}

        {insightMethodsOpen ? (
          <div
            className={styles.insightModalBackdrop}
            role="presentation"
            onMouseDown={() => setInsightMethodsOpen(false)}
          >
            <section
              className={styles.insightMathModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="insight-methods-title"
              onMouseDown={(event) => event.stopPropagation()}
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
            </section>
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
