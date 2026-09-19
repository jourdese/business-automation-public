"use client";

import { type ReactNode, useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleAlert,
  CirclePause,
  LineChart,
  ShieldCheck,
  Sparkles,
  Zap,
  WalletCards,
} from "lucide-react";
import CompanionMark from "@/components/jourvis/CompanionMark";
import SupplyPhoto from "./SupplyPhoto";
import { operationCatalog } from "@/command-center/core/business-registry";
import { jourvisAutonomyLoop } from "@/command-center/core/autonomy";
import { buildCommandCenterOperatingHealth } from "@/command-center/core/business-health-engine";
import { buildCommandCenterFinance } from "@/command-center/core/finance-engine";
import { buildCommandCenterForecast } from "@/command-center/core/forecast-engine";
import {
  buildCommandCenterForecastAccuracy,
  buildCommandCenterHistoryTrend,
} from "@/command-center/core/history-engine";
import { buildCommandCenterPerformance } from "@/command-center/core/performance-engine";
import { buildCommandCenterSupplierPerformance } from "@/command-center/core/supplier-performance-engine";
import {
  estimatedPurchaseTotal,
  inventoryPercent,
  isPurchaseActive,
  suggestedPurchaseQuantity,
} from "@/command-center/core/runtime";
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
    setItemAutomationEnabled,
    resumeItem,
  } = useCommandCenterRuntime();
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const business = state.business;
  const activePurchases = state.purchases.filter((purchase) =>
    isPurchaseActive(purchase.status),
  );
  const lowStockCount = state.inventory.filter(
    (item) => item.current <= item.reorderAt,
  ).length;
  const historyTrend = buildCommandCenterHistoryTrend(state);
  const hasHistoricalComparison = historyTrend.snapshotCount >= 2;
  const operatingHealth = buildCommandCenterOperatingHealth(
    state,
    tasks,
  );

  if (section === "overview") {
    const overviewPerformance = buildCommandCenterPerformance(
      state,
      tasks.length,
    );
    const overviewFinance = buildCommandCenterFinance(state);
    const activePurchaseByItem = new Map(
      activePurchases.map((purchase) => [purchase.itemId, purchase]),
    );
    const workItems = state.inventory
      .filter(
        (item) =>
          item.current <= item.reorderAt ||
          inventoryPercent(item) <= item.automationTriggerPercent ||
          activePurchaseByItem.has(item.id),
      )
      .sort((a, b) => inventoryPercent(a) - inventoryPercent(b));
    const queuedWork = workItems.filter(
      (item) => !activePurchaseByItem.has(item.id),
    );
    const managedWork = workItems.filter(
      (item) => activePurchaseByItem.has(item.id),
    );
    const overviewMetrics = [
      {
        label: "Inventory readiness",
        value:
          overviewPerformance.inventoryReadinessPercent === null
            ? "—"
            : overviewPerformance.inventoryReadinessPercent + "%",
        note: "average stock vs configured full level",
      },
      {
        label: "Open commitments",
        value:
          "₱" +
          Math.round(
            overviewFinance.openPurchaseCommitments,
          ).toLocaleString("en-PH"),
        note: "active purchasing workflows",
      },
      {
        label: "Jourvis working",
        value: String(activePurchases.length),
        note: "active operating workflows",
      },
      {
        label: "Needs owner",
        value: String(tasks.length),
        note: "exceptions only",
      },
      {
        label: "Attention signals",
        value: String(operatingHealth.attentionCount),
        note:
          operatingHealth.attentionCount
            ? operatingHealth.highestSeverity + " priority operating signals"
            : "no critical/warning operating signal",
      },
      ...(state.inventory.length
        ? [
            {
              label: "Low stock",
              value: String(lowStockCount),
              note: "live Command Center demo state",
            },
          ]
        : []),
    ];

    return (
      <SectionFrame
        eyebrow="OWNER OVERVIEW"
        title={state.automationMasterOn ? "Jourvis is operating the business." : "Review the work before Jourvis starts."}
        description={
          state.automationMasterOn
            ? "You supervise the business while Jourvis works through approved automatic tasks and escalates only genuine exceptions."
            : "After a reset, Jourvis stays asleep. Review the queue, choose Manual or Jourvis per task, then switch automation on when you are ready."
        }
      >
        <section className={styles.jourvisAutomationBoard} data-running={state.automationMasterOn}>
          <div className={styles.jourvisAutomationCharacter} data-state={state.automationMasterOn ? "active" : "sleeping"}>
            <div className={styles.jourvisCharacterHalo} />
            <CompanionMark className={styles.jourvisAutomationMark} />
            {state.automationMasterOn ? (
              <span className={styles.jourvisActiveSpark}><Zap size={14} aria-hidden /></span>
            ) : (
              <span className={styles.jourvisSleepMarks} aria-hidden>
                <i>Z</i><i>Z</i><i>Z</i>
              </span>
            )}
          </div>

          <div className={styles.jourvisAutomationCopy}>
            <span>{state.automationMasterOn ? "JOURVIS IS AWAKE" : "JOURVIS IS SLEEPING"}</span>
            <h2>
              {state.automationMasterOn
                ? "Jourvis is working through the automatic queue."
                : "Review the work first. Start Jourvis when you are ready."}
            </h2>
            <p>
              {state.automationMasterOn
                ? "Automatic tasks are picked up one at a time. Manual tasks stay with the owner, and anything outside Jourvis' authority moves to Decisions."
                : "Nothing starts automatically after a demo reset. Choose which tasks Jourvis may handle, leave the rest Manual, then wake Jourvis with the main switch."}
            </p>
          </div>

          <label className={styles.masterAutomationSwitch}>
            <span>
              <strong>{state.automationMasterOn ? "Automation ON" : "Automation OFF"}</strong>
              <small>{state.automationMasterOn ? `${queuedWork.filter((item) => item.automationEnabled).length} automatic task${queuedWork.filter((item) => item.automationEnabled).length === 1 ? "" : "s"} waiting` : "Jourvis will not start new work"}</small>
            </span>
            <input
              type="checkbox"
              checked={state.automationMasterOn}
              onChange={(event) => setAutomationMasterOn(event.target.checked)}
              aria-label="Toggle Jourvis automation"
            />
            <i aria-hidden />
          </label>
        </section>

        <section className={styles.taskQueuePanel}>
          <header className={styles.taskQueueHeader}>
            <div>
              <span>WORK QUEUE</span>
              <h2>Choose what Jourvis should handle.</h2>
              <p>
                Each task can stay Manual or be assigned to Jourvis. When automation is on,
                Jourvis takes eligible tasks from this queue one by one.
              </p>
            </div>
            <div className={styles.taskQueueCounts}>
              <span><b>{queuedWork.length}</b> waiting</span>
              <span><b>{managedWork.length}</b> managed</span>
            </div>
          </header>

          <div className={styles.taskQueueList}>
            {queuedWork.map((item) => {
              const percent = inventoryPercent(item);
              const suggestedQty = suggestedPurchaseQuantity(item);
              const estimate = estimatedPurchaseTotal(item, suggestedQty);
              const automatic = item.automationEnabled;
              const paused = state.pausedItemIds.includes(item.id);
              const readyForJourvis =
                automatic && !paused && !state.automationMasterOn;

              return (
                <article
                  className={styles.taskQueueRow}
                  data-mode={automatic ? "automatic" : "manual"}
                  key={item.id}
                >
                  <div className={styles.taskQueueIdentity}>
                    <SupplyPhoto
                      supplyId={item.id}
                      className={styles.taskQueuePhoto}
                      size={48}
                    />
                    <span className={styles.taskQueueIcon} data-mode={automatic ? "automatic" : "manual"}>
                      {automatic ? <Sparkles size={15} aria-hidden /> : <CirclePause size={15} aria-hidden />}
                    </span>
                    <div>
                      <strong>Restock {item.name}</strong>
                      <small>
                        {percent}% stock · suggested {suggestedQty} {item.unit} · est. ₱{Math.round(estimate).toLocaleString("en-PH")}
                      </small>
                    </div>
                  </div>

                  <div className={styles.taskQueueStatus}>
                    <span
                      data-state={
                        paused
                          ? "paused"
                          : automatic
                            ? readyForJourvis
                              ? "ready"
                              : "queued"
                            : "manual"
                      }
                    >
                      {paused
                        ? "Paused by you"
                        : automatic
                          ? readyForJourvis
                            ? "Ready for Jourvis"
                            : "Queued"
                          : "Manual"}
                    </span>
                    <small>
                      {paused
                        ? "Jourvis will not retry until you resume this item."
                        : `Trigger ${item.automationTriggerPercent}% · current ${percent}%`}
                    </small>
                  </div>

                  {paused ? (
                    <button
                      type="button"
                      className={styles.taskResumeButton}
                      onClick={() => resumeItem(item.id)}
                    >
                      Resume Jourvis
                    </button>
                  ) : null}

                  <label className={styles.taskModeSwitch}>
                    <span>Manual</span>
                    <input
                      type="checkbox"
                      checked={automatic}
                      onChange={(event) =>
                        setItemAutomationEnabled(item.id, event.target.checked)
                      }
                      aria-label={`Set Restock ${item.name} to ${automatic ? "manual" : "automatic"}`}
                    />
                    <i aria-hidden />
                    <span>Jourvis</span>
                  </label>
                </article>
              );
            })}

            {!queuedWork.length ? (
              <div className={styles.taskQueueEmpty}>
                <CheckCircle2 size={18} aria-hidden />
                <div>
                  <strong>No waiting tasks.</strong>
                  <small>Everything in this queue has either been handled or moved into active work.</small>
                </div>
              </div>
            ) : null}
          </div>

          {managedWork.length ? (
            <div className={styles.jourvisManagingList}>
              <span className={styles.managingEyebrow}>JOURVIS MANAGING NOW</span>
              {managedWork.map((item) => {
                const purchase = activePurchaseByItem.get(item.id);
                return (
                  <article key={item.id}>
                    <div className={styles.managingCharacter}>
                      <CompanionMark className={styles.managingMark} />
                      <span />
                    </div>
                    <SupplyPhoto
                      supplyId={item.id}
                      className={styles.managingSupplyPhoto}
                      size={38}
                    />
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {purchase?.id} · {(purchase?.status ?? "working").replaceAll("_", " ")}
                      </small>
                    </div>
                    <b>Managed by Jourvis</b>
                  </article>
                );
              })}
            </div>
          ) : null}
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

        <article className={styles.panelCard}>
          <PanelHeading
            icon={<CircleAlert size={17} />}
            eyebrow="OPERATING SIGNALS"
            title={
              operatingHealth.attentionCount
                ? operatingHealth.attentionCount +
                  " item" +
                  (operatingHealth.attentionCount === 1 ? "" : "s") +
                  " need attention"
                : "Jourvis sees no immediate exception"
            }
          />
          <div className={styles.operatingSignalList}>
            {operatingHealth.signals.slice(0, 4).map((signal) => (
              <article
                key={signal.id}
                data-severity={signal.severity}
              >
                <div>
                  <span>{signal.severity.toUpperCase()}</span>
                  <small>{signal.module.toUpperCase()}</small>
                </div>
                <section>
                  <strong>{signal.title}</strong>
                  <p>{signal.summary}</p>
                  <small>{signal.nextAction}</small>
                </section>
              </article>
            ))}
          </div>
        </article>

        <div className={styles.overviewColumns}>
          <article className={styles.panelCard}>
            <PanelHeading
              icon={<Bot size={17} />}
              eyebrow="AUTONOMOUS OPERATING LOOP"
              title="What Jourvis is doing continuously"
            />
            <div className={styles.autonomyLoop}>
              {jourvisAutonomyLoop.map((step, index) => (
                <div key={step.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><strong>{step.label}</strong><small>{step.description}</small></div>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panelCard}>
            <PanelHeading
              icon={<ShieldCheck size={17} />}
              eyebrow="NEEDS YOU"
              title={tasks.length ? `${tasks.length} exception${tasks.length === 1 ? "" : "s"} need the owner` : "No owner decisions waiting"}
            />
            <div className={styles.decisionPreview}>
              {tasks.slice(0, 2).map((task) => (
                <div key={task.id} data-priority={task.priority === "high" ? "high" : undefined}>
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
                    <small>Normal work can continue automatically without owner intervention.</small>
                  </span>
                </div>
              ) : null}
            </div>
            <a className={styles.cardLink} href={`/command-center/${business.id}/decisions`}>
              Open decisions <ArrowRight size={14} />
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

        <div className={styles.cardGrid}>
          {[
            [
              "Revenue",
              "POS / accounting provider required",
              "Revenue forecasting will activate when real sales history is connected.",
            ],
            [
              "Customer demand",
              "POS / reservations provider required",
              "Covers and order demand will use real historical and forward demand signals.",
            ],
            [
              "Cash",
              "Finance provider required",
              "Cash forecasting will use actual receivables, payables, balances, and scheduled outflows.",
            ],
            [
              "Labor",
              "Scheduling / timeclock provider required",
              "Labor demand will connect forecasted workload to staffing and labor cost.",
            ],
          ].map(([title, source, description]) => (
            <article className={styles.moduleCard} key={title}>
              <LineChart size={19} />
              <span>DATA SOURCE PENDING</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <small>{source}</small>
            </article>
          ))}
        </div>
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
        `${performance.recipeMappedMenuCount}/${performance.activeMenuItemCount} active items mapped`,
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
      [
        "Waste records",
        String(performance.wasteEventCount),
        "manual waste/spoilage events recorded in Activity",
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

        <div className={styles.cardGrid}>
          {[
            [
              "Revenue",
              "POS / accounting provider required",
              "Real revenue performance needs verified sales history and a defined reporting period.",
            ],
            [
              "Operating profit",
              "Accounting provider required",
              "Profit will activate from actual revenue, COGS, labor, and operating expense data.",
            ],
            [
              "Gross margin",
              "Sales + accounting provider required",
              "Menu ingredient cost alone is not enough to represent business-wide gross margin.",
            ],
            [
              "Average order value",
              "POS provider required",
              "AOV will be calculated from real transactions rather than illustrative demo seeds.",
            ],
          ].map(([title, source, description]) => (
            <article className={styles.moduleCard} key={title}>
              <LineChart size={19} />
              <span>DATA SOURCE PENDING</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <small>{source}</small>
            </article>
          ))}
        </div>
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

        <div className={styles.cardGrid}>
          {[
            [
              "Profit & Loss",
              "Accounting + sales provider required",
              "Revenue, COGS, gross profit, operating expenses, and net profit need a verified accounting period.",
            ],
            [
              "Cash Flow",
              "Bank/accounting provider required",
              "Cash forecasting requires balances, inflows, scheduled outflows, and actual payment timing.",
            ],
            [
              "Expenses",
              "Accounting/expense provider required",
              "Expense categories, recurring costs, and anomalies will activate from real ledger/receipt data.",
            ],
            [
              "Payables",
              "Accounting/AP provider required",
              "Supplier obligations need invoice amount, due date, payment status, and counterparty records.",
            ],
            [
              "Receivables",
              "Sales/accounting provider required",
              "Expected collections require invoices, channels, counterparties, and payment status.",
            ],
            [
              "Reconciliation",
              "Bank + accounting provider required",
              "Jourvis will compare business records with actual payment and bank activity once both sources are connected.",
            ],
          ].map(([title, source, description]) => (
            <article className={styles.moduleCard} key={title}>
              <WalletCards size={19} />
              <span>DATA SOURCE PENDING</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <small>{source}</small>
            </article>
          ))}
        </div>
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
    const briefingPerformance = buildCommandCenterPerformance(
      state,
      tasks.length,
    );
    const briefingFinance = buildCommandCenterFinance(state);
    const formatMoney = (value: number) =>
      "₱" + Math.round(value).toLocaleString("en-PH");

    return (
      <SectionFrame
        eyebrow="BRIEFINGS"
        title="The business, summarized by Jourvis."
        description="Briefings now summarize the same live runtime used by Forecast, Performance, Finance, Decisions, and Activity. Historical weekly/monthly trend analysis will activate only after durable production history exists."
      >
        <div className={styles.briefingList}>
          <article>
            <span>CURRENT STATE</span>
            <h3>Owner briefing</h3>
            <p>
              Jourvis is handling {activePurchases.length} active workflow{activePurchases.length === 1 ? "" : "s"}, {tasks.length} owner exception{tasks.length === 1 ? "" : "s"} need authority, and {briefingForecast.horizonRiskCount} ingredient{briefingForecast.horizonRiskCount === 1 ? " is" : "s are"} forecast to enter a risk state within seven days.
            </p>
            <b><CheckCircle2 size={13} /> Generated from live runtime</b>
          </article>
          <article>
            <span>OPERATING HEALTH</span>
            <h3>Performance briefing</h3>
            <p>
              Inventory readiness is {briefingPerformance.inventoryReadinessPercent === null ? "not available" : briefingPerformance.inventoryReadinessPercent + "%"}, menu recipe coverage is {briefingPerformance.recipeCoveragePercent === null ? "not available" : briefingPerformance.recipeCoveragePercent + "%"}, automation accounts for {briefingPerformance.automationSharePercent === null ? "no recorded action mix yet" : briefingPerformance.automationSharePercent + "% of recorded automatic/manual actions"}, and {briefingPerformance.wasteEventCount} waste/spoilage event{briefingPerformance.wasteEventCount === 1 ? " has" : "s have"} been recorded in the current demo history.
            </p>
            <b><CheckCircle2 size={13} /> Performance engine</b>
          </article>
          <article>
            <span>FINANCIAL OPERATIONS</span>
            <h3>Commitment briefing</h3>
            <p>
              Open purchasing commitments total {formatMoney(briefingFinance.openPurchaseCommitments)}; received purchasing spend in the current runtime is {formatMoney(briefingFinance.receivedPurchaseSpend)}. Formal P&amp;L and cash reporting still require accounting providers.
            </p>
            <b><CheckCircle2 size={13} /> Finance engine</b>
          </article>
        </div>

        <article className={styles.panelCard}>
          <PanelHeading
            icon={<CircleAlert size={17} />}
            eyebrow="NEXT PRIORITIES"
            title="What Jourvis would focus on next"
          />
          <div className={styles.operatingSignalList}>
            {operatingHealth.signals.slice(0, 5).map((signal) => (
              <article
                key={signal.id}
                data-severity={signal.severity}
              >
                <div>
                  <span>{signal.severity.toUpperCase()}</span>
                  <small>{signal.module.toUpperCase()}</small>
                </div>
                <section>
                  <strong>{signal.title}</strong>
                  <p>{signal.summary}</p>
                  <small>{signal.nextAction}</small>
                </section>
              </article>
            ))}
          </div>
        </article>

        <article className={styles.panelCard}>
          <PanelHeading
            icon={<Bot size={17} />}
            eyebrow="RECENT EXECUTION"
            title="What Jourvis and the owner have been doing"
          />
          {state.activity.length ? (
            <div className={styles.autonomyLoop}>
              {state.activity.slice(0, 6).map((entry, index) => (
                <div key={entry.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{entry.executionMode.toUpperCase()} · {entry.module}</strong>
                    <small>{entry.message} Why: {entry.reason}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.demoNote}>
              No operating activity has been recorded yet.
            </p>
          )}
        </article>

        <article className={styles.panelCard}>
          <PanelHeading
            icon={<LineChart size={17} />}
            eyebrow="OBSERVED HISTORY"
            title={hasHistoricalComparison ? "Jourvis can now compare operating states" : "Building the first comparison"}
          />
          <div className={styles.explainer}>
            <p>
              {hasHistoricalComparison
                ? `Across ${historyTrend.snapshotCount} captured operating snapshots, inventory readiness changed ${formatSigned(historyTrend.inventoryReadinessDelta, " points")}, seven-day inventory risk changed ${formatSigned(historyTrend.inventoryRiskDelta)}, and open purchasing commitments changed ${formatSignedMoney(historyTrend.openCommitmentDelta)}.`
                : "Jourvis is now capturing deduplicated, timestamped business snapshots. A second meaningful state change will unlock observed-period trend comparisons."}
            </p>
          </div>
        </article>

        <p className={styles.demoNote}>
          Browser history now supports observed-state comparisons. True weekly/monthly business reporting still requires durable server-side history plus dated POS/accounting/provider records.
        </p>
      </SectionFrame>
    );
  }

  if (section === "insights") {
    const insightForecast = buildCommandCenterForecast(state, 7);
    const insightPerformance = buildCommandCenterPerformance(
      state,
      tasks.length,
    );
    const insightFinance = buildCommandCenterFinance(state);
    const highestRisks = insightForecast.inventoryRows
      .filter((row) => row.risk !== "covered")
      .slice(0, 3)
      .map((row) => row.name);
    const formatMoney = (value: number) =>
      "₱" + Math.round(value).toLocaleString("en-PH");

    return (
      <SectionFrame
        eyebrow="INSIGHTS"
        title="What Jourvis noticed before you asked."
        description="Insights now combine Forecast, Performance, Finance, Operations, Decisions, and Activity instead of treating each tab as an isolated dashboard."
      >
        <article className={styles.panelCard}>
          <PanelHeading
            icon={<Sparkles size={17} />}
            eyebrow="PRIORITIZED SIGNALS"
            title="The same operating picture, ranked by urgency"
          />
          <div className={styles.operatingSignalList}>
            {operatingHealth.signals.slice(0, 6).map((signal) => (
              <article
                key={signal.id}
                data-severity={signal.severity}
              >
                <div>
                  <span>{signal.severity.toUpperCase()}</span>
                  <small>{signal.module.toUpperCase()}</small>
                </div>
                <section>
                  <strong>{signal.title}</strong>
                  <p>{signal.summary}</p>
                  <small>{signal.nextAction}</small>
                </section>
              </article>
            ))}
          </div>
        </article>

        <div className={styles.insightList}>
          <article>
            <LineChart size={16} />
            <div>
              <strong>Forward inventory pressure</strong>
              <p>
                {highestRisks.length
                  ? `${insightForecast.horizonRiskCount} ingredient${insightForecast.horizonRiskCount === 1 ? " is" : "s are"} exposed within seven days. Highest current risks: ${highestRisks.join(", ")}.`
                  : "No configured ingredient is currently forecast to enter a stock-risk state within seven days."}
              </p>
            </div>
          </article>
          <article>
            <Sparkles size={16} />
            <div>
              <strong>Menu operating coverage</strong>
              <p>
                {insightPerformance.recipeCoveragePercent === null
                  ? "No active menu catalog is available yet."
                  : `${insightPerformance.recipeCoveragePercent}% of active menu items have active recipe mappings. ${insightPerformance.pricedMappedMenuCount} priced mapped item${insightPerformance.pricedMappedMenuCount === 1 ? " can" : "s can"} currently expose food-cost and margin estimates.`}
              </p>
            </div>
          </article>
          <article>
            <WalletCards size={16} />
            <div>
              <strong>Purchasing capital in motion</strong>
              <p>
                Active purchasing represents {formatMoney(insightFinance.openPurchaseCommitments)} in configured commitments, with {formatMoney(insightFinance.confirmedIncomingCommitments)} already at confirmed/in-transit/partial-receipt stages.
              </p>
            </div>
          </article>
          <article>
            <Bot size={16} />
            <div>
              <strong>Owner dependency</strong>
              <p>
                {tasks.length
                  ? `${tasks.length} exception${tasks.length === 1 ? " currently requires" : "s currently require"} human authority. Jourvis keeps those cases in Decisions instead of silently exceeding configured limits.`
                  : "No current workflow requires owner authority."}
              </p>
            </div>
          </article>
          <article>
            <LineChart size={16} />
            <div>
              <strong>Direction of travel</strong>
              <p>
                {hasHistoricalComparison
                  ? `Since the first captured snapshot, inventory readiness moved ${formatSigned(historyTrend.inventoryReadinessDelta, " points")}, inventory risk moved ${formatSigned(historyTrend.inventoryRiskDelta)}, owner exceptions moved ${formatSigned(historyTrend.ownerExceptionDelta)}, and purchasing commitments moved ${formatSignedMoney(historyTrend.openCommitmentDelta)}.`
                  : "Jourvis has begun capturing operating history. Direction-of-travel insights will appear after another meaningful business-state change."}
              </p>
            </div>
          </article>
          <article>
            <CircleAlert size={16} />
            <div>
              <strong>Still missing for full business intelligence</strong>
              <p>
                Revenue, profit, cash, customer-demand, labor, and period-over-period trends remain provider-gated. Jourvis will not infer those financial/business outcomes from inventory data alone.
              </p>
            </div>
          </article>
        </div>
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
