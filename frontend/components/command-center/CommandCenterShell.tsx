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
  Lightbulb,
  Menu,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import JourvisPresence from "@/components/jourvis/JourvisPresence";
import {
  listCommandCenterBusinesses,
  resolveCommandCenterBusiness,
} from "@/command-center/core/business-registry";
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
  const initial = readPath();
  const [businessId, setBusinessId] = useState(initial.businessId);
  const [activeSection, setActiveSection] = useState<CommandCenterSectionId>(initial.section);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const business = useMemo(
    () => resolveCommandCenterBusiness(businessId),
    [businessId],
  );
  const businesses = listCommandCenterBusinesses();

  function switchBusiness(nextBusinessId: string) {
    window.location.href = sectionHref(nextBusinessId, activeSection);
  }

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
                {section.id === "decisions" ? <b>2</b> : null}
              </a>
            );
          })}
        </nav>

        <div className={styles.autonomyCard}>
          <div className={styles.autonomyStatus}>
            <i />
            <span>AUTONOMY</span>
            <strong>RUNNING</strong>
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

          <div className={styles.jourvisRunState}>
            <span><i /> JOURVIS OPERATING</span>
            <strong>Owner mode: supervise exceptions</strong>
          </div>
        </header>

        <div className={styles.content}>
          {children}
        </div>
      </section>

      <JourvisPresence
        eyebrow="JOURVIS · COMMAND CENTER"
        status="Autonomous · Running"
        message={`I’m supervising ${business.shortName}. I’ll keep normal work moving and bring you only what truly needs you.`}
        detail="I observe, forecast, decide, act, verify, explain, and escalate when your authority or business rules require it."
        actions={[
          { label: "View decisions", href: sectionHref(business.id, "decisions"), primary: true },
          { label: "Latest briefing", href: sectionHref(business.id, "briefings") },
          { label: "Operations", href: sectionHref(business.id, "operations") },
        ]}
      />
    </div>
  );
}
