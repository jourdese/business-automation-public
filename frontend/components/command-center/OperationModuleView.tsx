"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  PackageCheck,
  Truck,
} from "lucide-react";
import { operationCatalog } from "@/command-center/core/business-registry";
import { inventoryPercent, isPurchaseActive } from "@/command-center/core/runtime";
import { useCommandCenterRuntime } from "@/command-center/core/runtime-provider";
import styles from "./CommandCenter.module.css";

function readRoute() {
  if (typeof window === "undefined") {
    return { businessId: "marinara-ristorante", moduleId: "inventory" };
  }
  const parts = window.location.pathname.split("/").filter(Boolean);
  const operations = parts.indexOf("operations");
  return {
    businessId: parts[parts.indexOf("command-center") + 1] || "marinara-ristorante",
    moduleId: operations >= 0 ? parts[operations + 1] || "workflows" : "workflows",
  };
}

export default function OperationModuleView() {
  const [route, setRoute] = useState({ businessId: "marinara-ristorante", moduleId: "inventory" });
  const { state, tasks, actOnTask } = useCommandCenterRuntime();

  useEffect(() => {
    setRoute(readRoute());
  }, []);

  const { moduleId } = route;
  const business = state.business;
  const module = operationCatalog[moduleId] ?? {
    label: moduleId,
    description: "Business operation managed by Jourvis.",
  };
  const moduleTasks = tasks.filter((task) => task.module === moduleId);
  const currentInventoryRoute =
    business.id === "marinara-ristorante" && moduleId === "inventory"
      ? "/restaurant/marinara-ristorante/Autoinventory-preview"
      : null;

  if (moduleId === "inventory" && state.inventory.length) {
    return (
      <section className={styles.sectionPage}>
        <OperationHeader businessId={business.id} moduleLabel={module.label} description={module.description} />

        <div className={styles.operationModuleHero}>
          <div>
            <span>JOURVIS OPERATING</span>
            <h2>{moduleTasks.length ? `${moduleTasks.length} inventory exception${moduleTasks.length === 1 ? "" : "s"} need you.` : "Inventory is operating inside its rules."}</h2>
            <p>
              Jourvis watches stock continuously, predicts shortages, starts allowed purchasing work,
              keeps confirmed incoming separate from on-hand stock, and escalates only when authority is missing.
            </p>
          </div>
          <Bot size={36} aria-hidden />
        </div>

        <div className={styles.runtimeList}>
          {state.inventory.map((item) => {
            const percent = inventoryPercent(item);
            const low = item.current <= item.reorderAt;
            const task = tasks.find((entry) => entry.entityId === item.id);
            return (
              <article className={styles.runtimeRow} key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.purchaseUnit} · supplier {state.suppliers.find((supplier) => supplier.id === item.supplierId)?.name ?? item.supplierId}</small>
                </div>
                <div><span>On hand</span><b>{item.current} / {item.fullLevel} {item.unit}</b></div>
                <div><span>Incoming</span><b>{item.incoming} {item.unit}</b></div>
                <div>
                  <span className={styles.runtimeStatus} data-alert={Boolean(task)}>
                    {task ? "Needs owner" : low ? "Low · Jourvis handling" : `${percent}% ready`}
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        {currentInventoryRoute ? (
          <article className={styles.migrationCard}>
            <div>
              <span>EXISTING INVENTORY WORKSPACE</span>
              <strong>Marinara Autoinventory remains available during migration</strong>
              <p>
                The Command Center now owns shared runtime state and decisions. The existing workspace
                remains accessible while detailed stock, receiving, recipes, and supplier tools are progressively migrated.
              </p>
            </div>
            <a href={currentInventoryRoute}>Open current inventory <ArrowRight size={14} /></a>
          </article>
        ) : null}
      </section>
    );
  }

  if (moduleId === "purchasing") {
    const purchases = state.purchases.filter((purchase) => isPurchaseActive(purchase.status));
    return (
      <section className={styles.sectionPage}>
        <OperationHeader businessId={business.id} moduleLabel={module.label} description={module.description} />

        <div className={styles.operationModuleHero}>
          <div>
            <span>AUTOMATED PURCHASING</span>
            <h2>Jourvis handles the supplier workflow until a real decision is needed.</h2>
            <p>
              Requests, quotes, approvals, supplier confirmation, incoming stock, transit, and receiving
              share one state machine. Quote exceptions flow into Decisions automatically.
            </p>
          </div>
          <Truck size={36} aria-hidden />
        </div>

        <div className={styles.runtimeList}>
          {purchases.map((purchase) => {
            const item = state.inventory.find((entry) => entry.id === purchase.itemId);
            const task = tasks.find((entry) => entry.requestId === purchase.id);
            return (
              <article className={styles.runtimeRow} key={purchase.id}>
                <div>
                  <strong>{purchase.id} · {item?.name ?? purchase.itemId}</strong>
                  <small>{purchase.origin === "jourvis" ? "Started automatically by Jourvis" : "Approved by owner"}</small>
                </div>
                <div><span>Quantity</span><b>{purchase.quantity} {item?.unit ?? ""}</b></div>
                <div><span>Value</span><b>₱{Math.round(purchase.quotedTotal ?? purchase.estimatedTotal).toLocaleString("en-PH")}</b></div>
                <div>
                  <span className={styles.runtimeStatus} data-alert={Boolean(task)}>{task ? "Needs owner" : purchase.status.replaceAll("_", " ")}</span>
                </div>
              </article>
            );
          })}
          {!purchases.length ? (
            <article className={styles.panelCard}>
              <PanelEmpty icon={<CheckCircle2 size={17} />} title="No active purchases" body="Jourvis will create purchasing work automatically when an authorized inventory rule triggers." />
            </article>
          ) : null}
        </div>
      </section>
    );
  }

  if (moduleId === "suppliers") {
    return (
      <section className={styles.sectionPage}>
        <OperationHeader businessId={business.id} moduleLabel={module.label} description={module.description} />

        <div className={styles.supplierRuntimeGrid}>
          {state.suppliers.map((supplier) => {
            const suppliedItems = state.inventory.filter((item) => supplier.itemIds.includes(item.id));
            return (
              <article key={supplier.id}>
                <h3>{supplier.name}</h3>
                <p>{suppliedItems.map((item) => item.name).join(", ") || "No mapped inventory items yet."}</p>
                <small>{supplier.contacts.length} contact{supplier.contacts.length === 1 ? "" : "s"} · {suppliedItems.length} supplied item{suppliedItems.length === 1 ? "" : "s"}</small>
              </article>
            );
          })}
          {!state.suppliers.length ? (
            <article>
              <h3>No supplier data connected</h3>
              <p>Connect a business data provider to let Jourvis compare pricing, lead times, reliability, and quote history.</p>
            </article>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.sectionPage}>
      <OperationHeader businessId={business.id} moduleLabel={module.label} description={module.description} />

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

      <article className={styles.migrationCard}>
        <div>
          <span>MODULE FOUNDATION</span>
          <strong>Ready for business-specific data and actions</strong>
          <p>
            This route is shared. Production data and actions will be injected through
            Command Center providers rather than copied business pages.
          </p>
        </div>
      </article>
    </section>
  );
}

function OperationHeader({
  businessId,
  moduleLabel,
  description,
}: {
  businessId: string;
  moduleLabel: string;
  description: string;
}) {
  return (
    <header className={styles.pageIntro}>
      <a className={styles.backLink} href={`/command-center/${businessId}/operations`}>
        <ArrowLeft size={14} /> Operations
      </a>
      <span>BUSINESS OPERATION</span>
      <h1>{moduleLabel}</h1>
      <p>{description}</p>
    </header>
  );
}

function PanelEmpty({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className={styles.panelHeading}>
      <span className={styles.panelIcon}>{icon}</span>
      <div><strong>{title}</strong><span>{body}</span></div>
    </div>
  );
}
