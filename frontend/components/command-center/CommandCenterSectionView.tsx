"use client";

import { type ReactNode, useMemo } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleAlert,
  Clock3,
  LineChart,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  operationCatalog,
  resolveCommandCenterBusiness,
} from "@/command-center/core/business-registry";
import { jourvisAutonomyLoop } from "@/command-center/core/autonomy";
import type { CommandCenterSectionId } from "@/command-center/core/types";
import styles from "./CommandCenter.module.css";

function businessIdFromPath() {
  if (typeof window === "undefined") return "marinara-ristorante";
  const parts = window.location.pathname.split("/").filter(Boolean);
  const index = parts.indexOf("command-center");
  return index >= 0 ? parts[index + 1] || "marinara-ristorante" : "marinara-ristorante";
}

export default function CommandCenterSectionView({
  section,
}: {
  section: CommandCenterSectionId;
}) {
  const business = useMemo(
    () => resolveCommandCenterBusiness(businessIdFromPath()),
    [],
  );

  if (section === "overview") {
    return (
      <SectionFrame
        eyebrow="OWNER OVERVIEW"
        title="Jourvis is operating the business."
        description="You supervise the business. Jourvis handles normal work automatically, explains what it is doing, and escalates only when a human decision is genuinely required."
      >
        <div className={styles.metricGrid}>
          {business.demoMetrics.map((metric) => (
            <article className={styles.metricCard} key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <div>
                {metric.change ? (
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
              title="Only exceptions reach the owner"
            />
            <div className={styles.decisionPreview}>
              <div data-priority="high">
                <CircleAlert size={16} />
                <span>
                  <strong>Supplier quote outside your automatic limit</strong>
                  <small>Jourvis stopped because the quote crossed a rule you set.</small>
                </span>
              </div>
              <div>
                <Clock3 size={16} />
                <span>
                  <strong>One operating rule needs confirmation</strong>
                  <small>Jourvis will explain the rule and why it cannot continue alone.</small>
                </span>
              </div>
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
    const forecasts = [
      ["Revenue", "Next 7 days", "Predict sales and expected collections."],
      ["Demand", "Next 7 days", "Predict customer volume and service demand."],
      ["Cash", "Next 30 days", "Predict inflows, outflows, and cash pressure."],
      ["Labor", "Next 14 days", "Predict staffing demand and labor cost."],
      ...(business.operations.includes("inventory")
        ? [["Inventory", "Next 7 days", "Predict usage, shortages, and recommended purchasing."]]
        : []),
    ];
    return (
      <SectionFrame
        eyebrow="FORECAST"
        title="What Jourvis expects next."
        description="Forecasts are not passive charts. Jourvis uses them to prepare actions before the business reaches a problem."
      >
        <div className={styles.cardGrid}>
          {forecasts.map(([title, horizon, description]) => (
            <article className={styles.moduleCard} key={title}>
              <LineChart size={19} />
              <span>{horizon}</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <small>Model inputs and confidence will be shown with every forecast.</small>
            </article>
          ))}
        </div>
      </SectionFrame>
    );
  }

  if (section === "performance") {
    return (
      <SectionFrame
        eyebrow="PERFORMANCE"
        title="Is the business actually improving?"
        description="Revenue is only one signal. Jourvis connects sales, profit, margin, costs, demand, and operating efficiency."
      >
        <div className={styles.metricGrid}>
          {[
            ["Revenue", "₱84,240", "+7.4%"],
            ["Gross margin", "57.1%", "+1.2 pts"],
            ["Net margin", "21.7%", "-0.8 pts"],
            ["Transactions", "126", "+9"],
          ].map(([label, value, change]) => (
            <article className={styles.metricCard} key={label}>
              <span>{label}</span><strong>{value}</strong><div><b>{change}</b><small>illustrative</small></div>
            </article>
          ))}
        </div>
        <article className={styles.panelCard}>
          <PanelHeading icon={<Sparkles size={17} />} eyebrow="JOURVIS EXPLAINS" title="Numbers need a reason" />
          <div className={styles.explainer}>
            <p>Revenue can increase while profit falls. Jourvis will trace the difference to the underlying costs, pricing, demand, labor, waste, or operational changes rather than leaving the owner to interpret the chart alone.</p>
          </div>
        </article>
      </SectionFrame>
    );
  }

  if (section === "finance") {
    return (
      <SectionFrame
        eyebrow="FINANCE"
        title="Where the money went."
        description="A shared finance layer for P&L, cash flow, expenses, receivables, payables, reconciliation, and financial explanations."
      >
        <div className={styles.cardGrid}>
          {[
            ["Profit & Loss", "Revenue, COGS, gross profit, operating expenses, net profit."],
            ["Cash Flow", "Money entering and leaving the business, plus projected cash."],
            ["Expenses", "Expense categories, anomalies, recurring costs, and trends."],
            ["Payables", "What is owed, when it is due, and which payments need attention."],
            ["Receivables", "Money expected from customers, channels, or counterparties."],
            ["Reconciliation", "Compare business records with payment and bank activity."],
          ].map(([title, description]) => (
            <article className={styles.moduleCard} key={title}>
              <WalletCards size={19} />
              <h3>{title}</h3>
              <p>{description}</p>
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
            const module = operationCatalog[moduleId] ?? {
              label: moduleId,
              description: "Business operation managed through Jourvis.",
            };
            return (
              <a
                className={styles.operationCard}
                href={`/command-center/${business.id}/operations/${moduleId}`}
                key={moduleId}
              >
                <span>OPERATION</span>
                <h3>{module.label}</h3>
                <p>{module.description}</p>
                <b>Jourvis managed <ArrowRight size={14} /></b>
              </a>
            );
          })}
        </div>
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
            ["Daily", "Today", "Revenue, operating changes, completed automation, risks, and owner decisions."],
            ["Weekly", "This week", "Trends, forecast accuracy, cost movement, operational performance, and recurring issues."],
            ["Monthly", "This month", "Financial and operating review with major changes, opportunities, and next-month priorities."],
          ].map(([label, period, body]) => (
            <article key={label}>
              <span>{period}</span><h3>{label} briefing</h3><p>{body}</p>
              <b><CheckCircle2 size={13} /> Generated by Jourvis</b>
            </article>
          ))}
        </div>
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
            ["Margin pressure", "Revenue is rising faster than profit. Jourvis would trace the change to the exact costs or operating behavior responsible."],
            ["Demand shift", "A recurring increase in demand can automatically feed Forecast, Purchasing, and Labor planning."],
            ["Supplier movement", "Jourvis can compare price history, lead time, reliability, and total landed cost across suppliers."],
            ["Operational drift", "Repeated waste, delays, overrides, or manual exceptions become insights instead of disappearing into activity logs."],
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
        <article>
          <div className={styles.decisionTop}><span data-priority="high">HIGH</span><small>Purchasing · demo</small></div>
          <h3>Supplier quote exceeds automatic buying authority</h3>
          <dl>
            <div><dt>What happened</dt><dd>A supplier returned a price above the configured automatic threshold.</dd></div>
            <div><dt>Why</dt><dd>The quoted total exceeds a rule set by the owner.</dd></div>
            <div><dt>What Jourvis did</dt><dd>Stopped the purchase instead of accepting terms outside its authority.</dd></div>
            <div><dt>Why you are needed</dt><dd>Only the owner can approve the exception or update the rule.</dd></div>
          </dl>
          <div className={styles.decisionActions}><button>Approve</button><button>Reject</button><button>Update</button></div>
        </article>
        <article>
          <div className={styles.decisionTop}><span>MEDIUM</span><small>Operations · demo</small></div>
          <h3>Forecast recommends an action outside current authority</h3>
          <dl>
            <div><dt>What happened</dt><dd>Jourvis forecasts higher demand than the current operating plan covers.</dd></div>
            <div><dt>Why you are needed</dt><dd>The relevant automation rule has not granted Jourvis authority to make the change automatically.</dd></div>
          </dl>
          <div className={styles.decisionActions}><button>Approve</button><button>Reject</button><button>Update</button></div>
        </article>
      </div>
      <p className={styles.demoNote}>Decision cards are structural demo surfaces on this branch; they are not connected to live business actions yet.</p>
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
