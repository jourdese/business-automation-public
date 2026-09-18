import type { JourvisAutonomyStage } from "./types";

export const jourvisAutonomyLoop: ReadonlyArray<{
  id: JourvisAutonomyStage;
  label: string;
  description: string;
}> = [
  { id: "observe", label: "Observe", description: "Continuously watch business data, conversations, schedules, inventory, money, and operations." },
  { id: "forecast", label: "Forecast", description: "Estimate what is likely to happen before it becomes a problem." },
  { id: "decide", label: "Decide", description: "Choose the next action using business rules, limits, context, and confidence." },
  { id: "act", label: "Act", description: "Carry out approved work automatically through Jourvis and connected automation tools." },
  { id: "verify", label: "Verify", description: "Confirm that the action completed and that the business state changed as expected." },
  { id: "explain", label: "Explain", description: "Keep an understandable record of what happened, why, and what Jourvis did." },
  { id: "escalate", label: "Escalate", description: "Bring the owner in only when authority, confidence, risk, or policy requires it." },
];

export const ownerInterventionPrinciple =
  "Jourvis should operate the business by default and escalate only exceptions, approvals, ambiguity, risk, or rules the owner has reserved for themselves.";
