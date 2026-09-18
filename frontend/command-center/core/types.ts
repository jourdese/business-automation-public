export type CommandCenterSectionId =
  | "overview"
  | "forecast"
  | "performance"
  | "finance"
  | "operations"
  | "briefings"
  | "insights"
  | "decisions";

export type BusinessIndustry =
  | "restaurant"
  | "dental"
  | "salon"
  | "veterinary"
  | "law"
  | "generic";

export type BusinessMetricSeed = {
  label: string;
  value: string;
  change?: string;
  note?: string;
};

export type BusinessCapability = {
  id: string;
  label: string;
  description: string;
};

export type CommandCenterBusiness = {
  id: string;
  name: string;
  shortName: string;
  industry: BusinessIndustry;
  currency: string;
  timezone: string;
  operations: string[];
  capabilities: string[];
  demoMetrics: BusinessMetricSeed[];
};

export type JourvisAutonomyStage =
  | "observe"
  | "forecast"
  | "decide"
  | "act"
  | "verify"
  | "explain"
  | "escalate";

export type JourvisDecision = {
  id: string;
  module: string;
  priority: "high" | "medium" | "low";
  title: string;
  whatHappened: string;
  why: string;
  whatJourvisDid: string;
  whyOwnerIsNeeded: string;
  actions: string[];
};

export const commandCenterSections: ReadonlyArray<{
  id: CommandCenterSectionId;
  label: string;
  description: string;
}> = [
  { id: "overview", label: "Overview", description: "What is happening now and what Jourvis is running." },
  { id: "forecast", label: "Forecast", description: "What Jourvis expects next across demand, money, labor, and operations." },
  { id: "performance", label: "Performance", description: "Revenue, profit, costs, growth, and business KPIs." },
  { id: "finance", label: "Finance", description: "P&L, cash flow, expenses, payables, receivables, and reconciliation." },
  { id: "operations", label: "Operations", description: "Industry-specific operating modules managed by Jourvis." },
  { id: "briefings", label: "Briefings", description: "Daily, weekly, monthly, and custom operating summaries." },
  { id: "insights", label: "Insights", description: "Patterns and opportunities Jourvis finds proactively." },
  { id: "decisions", label: "Decisions", description: "Only the exceptions and approvals that truly need a human." },
];
