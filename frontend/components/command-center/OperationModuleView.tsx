"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Bot, CheckCircle2 } from "lucide-react";
import {
  operationCatalog,
  resolveCommandCenterBusiness,
} from "@/command-center/core/business-registry";
import styles from "./CommandCenter.module.css";

function readRoute() {
  if (typeof window === "undefined") {
    return { businessId: "marinara-ristorante", moduleId: "inventory" };
  }
  const parts = window.location.pathname.split("/").filter(Boolean);
  const cc = parts.indexOf("command-center");
  const operations = parts.indexOf("operations");
  return {
    businessId: cc >= 0 ? parts[cc + 1] || "marinara-ristorante" : "marinara-ristorante",
    moduleId: operations >= 0 ? parts[operations + 1] || "workflows" : "workflows",
  };
}

export default function OperationModuleView() {
  const [route, setRoute] = useState({ businessId: "marinara-ristorante", moduleId: "inventory" });

  useEffect(() => {
    setRoute(readRoute());
  }, []);

  const { businessId, moduleId } = route;
  const business = resolveCommandCenterBusiness(businessId);
  const module = operationCatalog[moduleId] ?? {
    label: moduleId,
    description: "Business operation managed by Jourvis.",
  };
  const currentInventoryRoute =
    business.id === "marinara-ristorante" && moduleId === "inventory"
      ? "/restaurant/marinara-ristorante/Autoinventory-preview"
      : null;

  return (
    <section className={styles.sectionPage}>
      <header className={styles.pageIntro}>
        <a className={styles.backLink} href={`/command-center/${business.id}/operations`}>
          <ArrowLeft size={14} /> Operations
        </a>
        <span>{business.industry.toUpperCase()} OPERATION</span>
        <h1>{module.label}</h1>
        <p>{module.description}</p>
      </header>

      <div className={styles.operationModuleHero}>
        <div>
          <span>JOURVIS OPERATING MODEL</span>
          <h2>Automatic by default. Human by exception.</h2>
          <p>
            This module will expose business state and explanations, while Jourvis
            performs normal operating work automatically within the authority and
            safeguards configured for this business.
          </p>
        </div>
        <Bot size={36} aria-hidden />
      </div>

      <div className={styles.operationStageGrid}>
        {[
          ["Monitor", "Watch the live business state and detect meaningful changes."],
          ["Plan", "Use rules and forecasts to prepare the next action."],
          ["Act", "Execute routine work automatically within authority."],
          ["Verify", "Confirm that the expected result actually occurred."],
          ["Escalate", "Ask the owner only when a rule, risk, or ambiguity requires it."],
        ].map(([title, description]) => (
          <article key={title}>
            <CheckCircle2 size={15} />
            <strong>{title}</strong>
            <p>{description}</p>
          </article>
        ))}
      </div>

      {currentInventoryRoute ? (
        <article className={styles.migrationCard}>
          <div>
            <span>EXISTING WORKSPACE</span>
            <strong>Marinara Autoinventory</strong>
            <p>
              The current inventory demo remains available while its stock,
              purchasing, supplier, and decision logic are progressively moved into
              the shared Command Center architecture.
            </p>
          </div>
          <a href={currentInventoryRoute}>Open current inventory <ArrowRight size={14} /></a>
        </article>
      ) : (
        <article className={styles.migrationCard}>
          <div>
            <span>MODULE FOUNDATION</span>
            <strong>Ready for business-specific data adapters</strong>
            <p>This route is shared. Business data and actions will be injected through capability and data providers rather than copied pages.</p>
          </div>
        </article>
      )}
    </section>
  );
}
