"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CircleGauge,
  History,
  Lightbulb,
  Menu,
  RefreshCw,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import JourvisPresence from "@/components/jourvis/JourvisPresence";
import {
  listCommandCenterBusinesses,
  resolveCommandCenterBusiness,
} from "@/command-center/core/business-registry";
import { useCommandCenterRuntime } from "@/command-center/core/runtime-provider";
import type { CommandCenterInventoryItem } from "@/command-center/core/runtime";
import {
  commandCenterSections,
  type CommandCenterSectionId,
} from "@/command-center/core/types";
import styles from "./CommandCenter.module.css";

const icons: Record<CommandCenterSectionId, typeof CircleGauge> = {
  overview: CircleGauge,
  forecast: CalendarClock,
  performance: BarChart3,
  finance: WalletCards,
  operations: BriefcaseBusiness,
  activity: History,
  briefings: Bot,
  insights: Lightbulb,
  decisions: ShieldCheck,
};

function readPath() {
  if (typeof window === "undefined") {
    return { businessId: "marinara-ristorante", section: "overview" as CommandCenterSectionId };
  }
  const parts = window.location.pathname.split("/").filter(Boolean);
  const root = parts.indexOf("command-center");
  const businessId = root >= 0 ? parts[root + 1] || "marinara-ristorante" : "marinara-ristorante";
  const candidate = root >= 0 ? parts[root + 2] : undefined;
  const section = commandCenterSections.some((item) => item.id === candidate)
    ? candidate as CommandCenterSectionId
    : "overview";
  return { businessId, section };
}

function sectionHref(businessId: string, section: CommandCenterSectionId) {
  return section === "overview"
    ? `/command-center/${businessId}`
    : `/command-center/${businessId}/${section}`;
}

export default function CommandCenterShell({ children }: { children: ReactNode }) {
  const [businessId, setBusinessId] = useState("marinara-ristorante");
  const [activeSection, setActiveSection] = useState<CommandCenterSectionId>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [updateTaskId, setUpdateTaskId] = useState<string | null>(null);
  const [updateBaseline, setUpdateBaseline] = useState<CommandCenterInventoryItem | null>(null);
  const [updateDraft, setUpdateDraft] = useState<CommandCenterInventoryItem | null>(null);
  const [jourvisOpenKey, setJourvisOpenKey] = useState(0);
  const {
    state,
    tasks,
    actOnTask,
    applyInventoryConfiguration,
    setAutomationMasterOn,
    resetDemo,
  } = useCommandCenterRuntime();

  useEffect(() => {
    const sync = () => {
      const next = readPath();
      setBusinessId(next.businessId);
      setActiveSection(next.section);
      setMobileNavOpen(false);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const custom = event as CustomEvent<{ taskId?: string }>;
      if (!custom.detail?.taskId) return;
      const task = tasks.find((entry) => entry.id === custom.detail?.taskId);
      const item = task?.entityId
        ? state.inventory.find((entry) => entry.id === task.entityId)
        : undefined;
      if (!task || !item) return;
      setUpdateTaskId(task.id);
      setUpdateBaseline({ ...item });
      setUpdateDraft({ ...item });
      setJourvisOpenKey((value) => value + 1);
    };
    window.addEventListener("jourvis-command-center-update", handleUpdate);
    return () => window.removeEventListener("jourvis-command-center-update", handleUpdate);
  }, [state.inventory, tasks]);

  const business = useMemo(
    () => resolveCommandCenterBusiness(businessId),
    [businessId],
  );
  const businesses = listCommandCenterBusinesses();
  const topTask = tasks[0];
  const updateTask = updateTaskId
    ? tasks.find((task) => task.id === updateTaskId)
    : undefined;
  const updateItem = updateTask && updateDraft ? updateDraft : undefined;

  function switchBusiness(nextBusinessId: string) {
    window.location.href = sectionHref(nextBusinessId, activeSection);
  }

  function openTaskUpdate(taskId: string) {
    const task = tasks.find((entry) => entry.id === taskId);
    const item = task?.entityId
      ? state.inventory.find((entry) => entry.id === task.entityId)
      : undefined;
    if (!task || !item) return;
    setUpdateTaskId(taskId);
    setUpdateBaseline({ ...item });
    setUpdateDraft({ ...item });
    setJourvisOpenKey((value) => value + 1);
  }

  function updateDraftItem(patch: Partial<CommandCenterInventoryItem>) {
    setUpdateDraft((current) => current ? { ...current, ...patch } : current);
  }

  function finishTaskUpdate() {
    if (updateBaseline && updateDraft) {
      applyInventoryConfiguration(updateBaseline, updateDraft);
    }
    setUpdateTaskId(null);
    setUpdateBaseline(null);
    setUpdateDraft(null);
  }

  const jourvisActions = updateTask
    ? [
        {
          label: "Done updating",
          primary: true,
          keepOpen: true,
          onClick: finishTaskUpdate,
        },
      ]
    : topTask
      ? topTask.actions.map((action) => {
          if (action === "update") {
            return {
              label: "Update",
              keepOpen: true,
              onClick: () => openTaskUpdate(topTask.id),
            };
          }
          return {
            label:
              action === "approve"
                ? "Approve"
                : action === "reject"
                  ? "Reject"
                  : action === "receive"
                    ? "Receive"
                    : action === "resume"
                      ? "Resume"
                      : action === "retry"
                        ? "Retry"
                        : "Review",
            primary: action === "approve" || action === "receive",
            danger: action === "reject",
            onClick: () => actOnTask(topTask.id, action),
          };
        })
      : [
          { label: "Review activity", href: sectionHref(business.id, "activity"), primary: true },
          { label: "Latest briefing", href: sectionHref(business.id, "briefings") },
          { label: "Operations", href: sectionHref(business.id, "operations") },
        ];

  return (
    <div className={styles.commandCenter}>
      <aside className={styles.sidebar} data-open={mobileNavOpen}>
        <div className={styles.sidebarTop}>
          <div className={styles.productMark}>
            <span className={styles.productGlyph}><BrainCircuit size={18} aria-hidden /></span>
            <div>
              <span>JOURVIS</span>
              <strong>Command Center</strong>
            </div>
          </div>
          <button
            type="button"
            className={styles.mobileClose}
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close Command Center navigation"
          >
            <X size={17} aria-hidden />
          </button>
        </div>

        <label className={styles.businessPicker}>
          <span>BUSINESS</span>
          <div>
            <Building2 size={14} aria-hidden />
            <select value={business.id} onChange={(event) => switchBusiness(event.target.value)}>
              {businesses.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
              {!businesses.some((item) => item.id === business.id) ? (
                <option value={business.id}>{business.name}</option>
              ) : null}
            </select>
          </div>
        </label>

        <nav className={styles.mainNav} aria-label="Command Center">
          {commandCenterSections.map((section) => {
            const Icon = icons[section.id];
            const active = activeSection === section.id;
            return (
              <a
                key={section.id}
                href={sectionHref(business.id, section.id)}
                data-active={active}
                title={section.description}
              >
                <Icon size={16} aria-hidden />
                <span>{section.label}</span>
                {section.id === "decisions" && tasks.length ? <b>{tasks.length}</b> : null}
              </a>
            );
          })}
        </nav>

        <div className={styles.autonomyCard}>
          <div className={styles.autonomyStatus}>
            <i data-off={!state.automationMasterOn} />
            <span>AUTONOMY</span>
            <strong>{state.automationMasterOn ? "RUNNING" : "PAUSED"}</strong>
          </div>
          <p>
            Jourvis operates continuously and brings the owner only exceptions,
            approvals, ambiguity, or rules that require human authority.
          </p>
        </div>
      </aside>

      {mobileNavOpen ? (
        <button
          type="button"
          className={styles.navBackdrop}
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation"
        />
      ) : null}

      <section className={styles.workspace}>
        <header className={styles.workspaceHeader}>
          <button
            type="button"
            className={styles.mobileMenu}
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open Command Center navigation"
          >
            <Menu size={18} aria-hidden />
          </button>

          <div className={styles.businessIdentity}>
            <span>{business.industry.toUpperCase()} · {business.timezone}</span>
            <strong>{business.name}</strong>
          </div>

          <div className={styles.headerRuntimeActions}>
            <div className={styles.jourvisRunState}>
              <span><i data-off={!state.automationMasterOn} /> {state.automationMasterOn ? "JOURVIS OPERATING" : "JOURVIS PAUSED"}</span>
              <strong>{tasks.length ? `${tasks.length} exception${tasks.length === 1 ? "" : "s"} need you` : "Owner mode: supervise exceptions"}</strong>
            </div>
            <button type="button" className={styles.resetDemoButton} onClick={resetDemo}>
              <RefreshCw size={14} aria-hidden /> Reset demo
            </button>
          </div>
        </header>

        <div className={styles.content}>
          {children}
        </div>
      </section>

      <JourvisPresence
        eyebrow={updateTask ? "JOURVIS · UPDATE" : topTask ? `JOURVIS · ${topTask.module.toUpperCase()}` : "JOURVIS · COMMAND CENTER"}
        status={updateTask ? "Updating rule" : topTask ? "Needs you" : state.automationMasterOn ? "Autonomous · Running" : "Autonomous · Paused"}
        message={
          updateTask
            ? `Update the rule for ${updateItem?.name ?? "this item"} here.`
            : topTask
              ? topTask.whatHappened
              : `I’m supervising ${business.shortName}. Normal work keeps moving automatically.`
        }
        detail={
          updateTask
            ? "Changing a rule resumes this item and becomes the new instruction Jourvis follows."
            : topTask
              ? `${topTask.why} ${topTask.whatJourvisDid}${topTask.whyOwnerIsNeeded ? ` ${topTask.whyOwnerIsNeeded}` : ""}`
              : "I observe, forecast, decide, act, verify, explain, and escalate only when your authority or safeguards require it."
        }
        attention={!updateTask && Boolean(topTask)}
        actions={jourvisActions}
        wide={Boolean(updateTask)}
        openRequestKey={jourvisOpenKey}
      >
        {updateTask && updateItem ? (
          <div className={styles.jourvisRuleEditor}>
            <div className={styles.ruleEditorHeading}>
              <span>{updateItem.name.toUpperCase()}</span>
              <strong>{Math.round((updateItem.current / Math.max(updateItem.fullLevel, 0.01)) * 100)}% stock</strong>
            </div>

            <label className={styles.ruleToggle}>
              <span><strong>Jourvis manages this item</strong><small>Allow Jourvis to act automatically according to the rule below.</small></span>
              <input
                type="checkbox"
                checked={updateItem.automationEnabled}
                onChange={(event) => updateDraftItem({ automationEnabled: event.target.checked })}
              />
            </label>

            <label className={styles.ruleToggle}>
              <span><strong>Global autonomy</strong><small>Pause or resume autonomous work across this Command Center.</small></span>
              <input
                type="checkbox"
                checked={state.automationMasterOn}
                onChange={(event) => setAutomationMasterOn(event.target.checked)}
              />
            </label>

            <div className={styles.ruleEditorGrid}>
              <label>
                <span>Act at</span>
                <div><input type="number" min="0" max="100" value={updateItem.automationTriggerPercent} onChange={(event) => updateDraftItem({ automationTriggerPercent: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /><b>%</b></div>
              </label>
              <label>
                <span>Jourvis may</span>
                <select value={updateItem.automationMode} onChange={(event) => updateDraftItem({ automationMode: event.target.value as typeof updateItem.automationMode })}>
                  <option value="assist">Watch only</option>
                  <option value="auto_contact">Contact supplier</option>
                  <option value="autobuy">Buy within limits</option>
                </select>
              </label>
              <label>
                <span>Ask me above</span>
                <div><b>₱</b><input type="number" min="0" value={updateItem.maxAutoOrderSpend} onChange={(event) => updateDraftItem({ maxAutoOrderSpend: Math.max(0, Number(event.target.value) || 0) })} /></div>
              </label>
              <label>
                <span>Max pack price</span>
                <div><b>₱</b><input type="number" min="0" value={updateItem.autoAcceptPackPrice} onChange={(event) => updateDraftItem({ autoAcceptPackPrice: Math.max(0, Number(event.target.value) || 0) })} /></div>
              </label>
            </div>

            <p className={styles.ruleEditorNote}>
              Changes are staged until you choose Done updating. When saved, Jourvis records the manual configuration change with its exact timestamp and the rule snapshot used afterward.
            </p>
          </div>
        ) : null}
      </JourvisPresence>
    </div>
  );
}
