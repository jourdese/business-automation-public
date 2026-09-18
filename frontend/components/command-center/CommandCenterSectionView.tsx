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
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import CompanionMark from "@/components/jourvis/CompanionMark";
import SupplyPhoto from "./SupplyPhoto";
import { operationCatalog } from "@/command-center/core/business-registry";
import { jourvisAutonomyLoop } from "@/command-center/core/autonomy";
import { buildCommandCenterFinance } from "@/command-center/core/finance-engine";
import { buildCommandCenterForecast } from "@/command-center/core/forecast-engine";
import { buildCommandCenterPerformance } from "@/command-center/core/performance-engine";
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

  if (section === "overview") {
    const financialSeeds = business.demoMetrics.slice(0, 2);
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
      ...financialSeeds,
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
                {"change" in metric && metric.change ? (
                  <b data-down={metric.change.startsWith("-")}>
                    {metric.change.startsWith("-") ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                    {metric.change}
                  </b>
                ) : null}
                <small>{metric.note}</small>
              </div>
            </article>
          ))}
        </div>

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
    return (
      <SectionFrame
        eyebrow="BRIEFINGS"
        title="The business, summarized by Jourvis."
        description="Daily, weekly, monthly, and custom reports explain what changed, why it matters, what Jourvis did, and what still needs the owner."
      >
        <div className={styles.briefingList}>
          {[
            ["Daily", "Today", `Jourvis is handling ${activePurchases.length} active workflows and ${tasks.length} owner exception${tasks.length === 1 ? "" : "s"}.`],
            ["Weekly", "This week", "Trends, forecast accuracy, cost movement, operational performance, and recurring issues."],
            ["Monthly", "This month", "Financial and operating review with major changes, opportunities, and next-month priorities."],
          ].map(([label, period, body]) => (
            <article key={label}>
              <span>{period}</span><h3>{label} briefing</h3><p>{body}</p>
              <b><CheckCircle2 size={13} /> Generated by Jourvis</b>
            </article>
          ))}
        </div>
        {state.activity.length ? (
          <article className={styles.panelCard}>
            <PanelHeading icon={<Bot size={17} />} eyebrow="LATEST ACTIVITY" title="What Jourvis has been doing" />
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
          </article>
        ) : null}
      </SectionFrame>
    );
  }

  if (section === "insights") {
    return (
      <SectionFrame
        eyebrow="INSIGHTS"
        title="What Jourvis noticed before you asked."
        description="Insights connect data across modules to surface patterns, causes, risks, and opportunities that may otherwise go unnoticed."
      >
        <div className={styles.insightList}>
          {[
            ["Operational pressure", lowStockCount ? `${lowStockCount} inventory item${lowStockCount === 1 ? " is" : "s are"} already below the configured low-stock level.` : "No inventory shortages are currently visible in the shared runtime."],
            ["Automation load", `Jourvis currently has ${activePurchases.length} active purchasing workflow${activePurchases.length === 1 ? "" : "s"}.`],
            ["Owner dependency", tasks.length ? `${tasks.length} exception${tasks.length === 1 ? " currently requires" : "s currently require"} human authority.` : "No current workflow requires owner authority."],
            ["Cross-module intelligence", "As Finance, Forecast, Labor, CRM, and other providers are connected, Jourvis will explain causes across modules instead of treating each dashboard separately."],
          ].map(([title, description]) => (
            <article key={title}><Sparkles size={16} /><div><strong>{title}</strong><p>{description}</p></div></article>
          ))}
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
