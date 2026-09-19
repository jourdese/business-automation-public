import type {
  CommandCenterBusiness,
  BusinessMetricSeed,
  JourvisDecision,
} from "./types";
import type {
  CommandCenterActivity,
  CommandCenterHistorySnapshot,
} from "./runtime";

export type CommandCenterForecast = {
  id: string;
  label: string;
  horizon: string;
  value?: number;
  unit?: string;
  confidence?: "low" | "medium" | "high";
  explanation: string;
};

export type CommandCenterBriefing = {
  id: string;
  period: "daily" | "weekly" | "monthly" | "custom";
  title: string;
  summary: string;
  generatedAt: string;
};

export interface CommandCenterDataProvider {
  getBusiness(businessId: string): Promise<CommandCenterBusiness>;
  getOverviewMetrics(businessId: string): Promise<BusinessMetricSeed[]>;
  getForecasts(businessId: string): Promise<CommandCenterForecast[]>;
  getDecisions(businessId: string): Promise<JourvisDecision[]>;
  getActivity(businessId: string): Promise<CommandCenterActivity[]>;
  getHistory(businessId: string): Promise<CommandCenterHistorySnapshot[]>;
  getBriefings(businessId: string): Promise<CommandCenterBriefing[]>;
}

export interface CommandCenterActionProvider {
  execute(input: {
    businessId: string;
    module: string;
    action: string;
    payload?: Record<string, unknown>;
    idempotencyKey?: string;
  }): Promise<{
    ok: boolean;
    actionId: string;
    message: string;
  }>;

  verify(input: {
    businessId: string;
    actionId: string;
  }): Promise<{
    ok: boolean;
    status: "pending" | "completed" | "failed";
    explanation: string;
  }>;
}

/**
 * The UI should depend on these interfaces rather than localStorage, Supabase,
 * n8n, a POS, or any accounting provider directly. Demo providers can be
 * swapped for production providers without rewriting Command Center pages.
 *
 * Production action providers should honor idempotencyKey for external side
 * effects so retries cannot create duplicate supplier orders, payments, emails,
 * calendar actions, or other irreversible work.
 */
