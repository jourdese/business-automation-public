"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, RotateCcw, Save, Search, Settings2, Sparkles } from "lucide-react";
import CompanionMark from "@/components/jourvis/CompanionMark";
import {
  type Ingredient,
  automationModeLabel,
  getContact,
  getSupplier,
  initialIngredients,
  loadConfiguredIngredients,
  saveConfiguredIngredients,
  suppliers,
} from "../inventory-config";
import StockIcon from "../StockIcon";
import JourvisPresence from "@/components/jourvis/JourvisPresence";
import styles from "./configure.module.css";

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export default function AutoinventoryConfigurePage() {
  const [items, setItems] = useState(initialIngredients);
  const [selectedId, setSelectedId] = useState("shrimp");
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const [guideStep, setGuideStep] = useState<number | null>(null);

  useEffect(() => {
    const refresh = () => {
      const configured = loadConfiguredIngredients();
      setItems(configured);
      const requested = new URLSearchParams(window.location.search).get("stock");
      if (requested && configured.some((item) => item.id === requested)) setSelectedId(requested);
    };

    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const supplier = getSupplier(selected);
  const contact = getContact(selected);
  const guideFocusLabels = [
    "Choose when I act",
    "Choose what I may do",
    "Set the limits",
    "Review and enable",
  ];
  const jourvisConfigureFocusTarget =
    guideStep !== null
      ? `#jourvis-guide-step-${guideStep}`
      : !selected.automationEnabled
        ? "#jourvis-guide-start"
        : undefined;
  const jourvisConfigureFocusLabel =
    guideStep !== null
      ? guideFocusLabels[guideStep]
      : !selected.automationEnabled
        ? "Start with me"
        : undefined;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => {
      const itemSupplier = getSupplier(item);
      const itemContact = getContact(item);
      return `${item.name} ${item.zone} ${itemSupplier.name} ${itemContact.name}`.toLowerCase().includes(query);
    });
  }, [items, search]);

  function updateSelected(patch: Partial<Ingredient>) {
    setSaved(false);
    setItems((current) => current.map((item) => item.id === selected.id ? { ...item, ...patch } : item));
  }

  function changeSupplier(supplierId: string) {
    const nextSupplier = suppliers.find((candidate) => candidate.id === supplierId) ?? suppliers[0];
    updateSelected({ supplierId: nextSupplier.id, contactId: nextSupplier.contacts[0].id });
  }

  function save() {
    saveConfiguredIngredients(items);
    setSaved(true);
  }

  function enableAutomationFromGuide() {
    setItems((current) => {
      const next = current.map((item) =>
        item.id === selected.id ? { ...item, automationEnabled: true } : item,
      );
      saveConfiguredIngredients(next);
      return next;
    });
    setSaved(true);
    setGuideStep(null);
  }

  function resetAll() {
    setItems(initialIngredients);
    saveConfiguredIngredients(initialIngredients);
    setSaved(true);
  }

  const fullPercent = Math.max(0, Math.min(100, Math.round((selected.current / Math.max(selected.fullLevel, 0.01)) * 100)));
  const reorderPercent = Math.max(0, Math.min(100, Math.round((selected.reorderAt / Math.max(selected.fullLevel, 0.01)) * 100)));
  const automationTriggerQuantity = round(
    selected.fullLevel * Math.max(0, Math.min(100, selected.automationTriggerPercent)) / 100,
  );

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}><Settings2 size={14} aria-hidden /> Autoinventory configuration</p>
            <h1>Configure each stock.</h1>
            <p>Choose stock targets, supplier rules, price limits and exactly how much purchasing authority Jourvis is allowed to use.</p>
          </div>
          <div className={styles.headerActions}>
            <a href="/restaurant/marinara-ristorante/Autoinventory-preview"><ArrowLeft size={15} aria-hidden /> Back to Autoinventory</a>
            <button type="button" className={styles.resetButton} onClick={resetAll}><RotateCcw size={15} aria-hidden /> Reset demo config</button>
            <button type="button" className={styles.saveButton} onClick={save}>{saved ? <Check size={15} aria-hidden /> : <Save size={15} aria-hidden />}{saved ? "Saved" : "Save configuration"}</button>
          </div>
        </header>

        <div className={styles.workspace}>
          <aside className={styles.stockList}>
            <label className={styles.search}><Search size={14} aria-hidden /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search stock" /></label>
            <div className={styles.listScroller}>
              {filtered.map((item) => {
                const itemSupplier = getSupplier(item);
                const itemContact = getContact(item);
                return (
                  <button key={item.id} type="button" className={item.id === selected.id ? styles.activeItem : ""} onClick={() => { setSelectedId(item.id); setSaved(false); }}>
                    <span className={styles.itemIdentity}><StockIcon stockId={item.id} className={styles.stockIcon} /><span><strong>{item.name}</strong><small>{item.zone}</small></span></span>
                    <span><small>{itemSupplier.name}</small><b>{itemContact.name}</b></span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className={styles.editor}>
            <div className={styles.editorHeading}>
              <div className={styles.editorIdentity}><StockIcon stockId={selected.id} className={styles.editorStockIcon} size={30} /><div><span>STOCK CONFIGURATION</span><h2>{selected.name}</h2><p>{selected.zone} · currently {selected.current} {selected.unit}</p></div></div>
              <CompanionMark className={styles.companion} />
            </div>

            <section className={styles.section}>
              <div className={styles.sectionHeading}><div><span>01</span><h3>Stock levels</h3></div><p>Set the physical stock scale and the warning level. Jourvis automation uses its own action trigger in section 04.</p></div>
              <div className={styles.batteryCard}>
                <div className={styles.battery}><span style={{ width: `${fullPercent}%` }} /></div>
                <div className={styles.batteryLegend}><span>{selected.current} {selected.unit} current</span><strong>{fullPercent}%</strong><span>{selected.fullLevel} {selected.unit} = 100%</span></div>
                <div className={styles.threshold}><span style={{ left: `${reorderPercent}%` }} /><small>Low-stock warning at {selected.reorderAt} {selected.unit} · {reorderPercent}%</small></div>
              </div>
              <div className={styles.fieldsTwo}>
                <label><span>Full level / 100%</span><div><input type="number" min="0.01" step="0.1" value={selected.fullLevel} onChange={(event) => { const value = Math.max(0.01, Number(event.target.value) || 0.01); updateSelected({ fullLevel: value, reorderAt: Math.min(selected.reorderAt, value) }); }} /><b>{selected.unit}</b></div><small>The quantity represented by a full battery.</small></label>
                <label><span>Low-stock warning</span><div><input type="number" min="0" max={selected.fullLevel} step="0.1" value={selected.reorderAt} onChange={(event) => updateSelected({ reorderAt: Math.max(0, Math.min(selected.fullLevel, Number(event.target.value) || 0)) })} /><b>{selected.unit}</b></div><small>This changes the warning color only. Jourvis automation acts from its own percentage trigger below.</small></label>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeading}><div><span>02</span><h3>Supplier & contact</h3></div><p>The preferred contact is used by default, but you can still change the person when sending a request.</p></div>
              <div className={styles.fieldsTwo}>
                <label><span>Supplier</span><select value={selected.supplierId} onChange={(event) => changeSupplier(event.target.value)}>{suppliers.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select><small>Choose the normal supplier for this stock item.</small></label>
                <label><span>Preferred contact person</span><select value={selected.contactId} onChange={(event) => updateSelected({ contactId: event.target.value })}>{supplier.contacts.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.role}</option>)}</select><small>{contact.channel} · {contact.email} · {contact.phone}</small></label>
              </div>
              <div className={styles.contactPreview}>
                <div><span>DEFAULT CONTACT</span><strong>{contact.name}</strong><small>{contact.role}</small></div>
                <div><span>{supplier.name}</span><small>{contact.channel}</small><small>{contact.email}</small><small>{contact.phone}</small></div>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeading}><div><span>03</span><h3>Purchasing rules</h3></div><p>Choose whether this supply uses a fixed-price purchase order or requires a supplier quote before both sides confirm.</p></div>
              <div className={styles.fieldsGrid}>
                <label><span>Purchasing mode</span><select value={selected.purchasingMode} onChange={(event) => updateSelected({ purchasingMode: event.target.value as Ingredient["purchasingMode"] })}><option value="fixed">Fixed / contracted price</option><option value="quote">Quote required first</option></select><small>{selected.purchasingMode === "quote" ? "Jourvis requests a quote, then waits for buyer and supplier confirmation." : "Jourvis sends the known price as a PO and waits for supplier acknowledgment."}</small></label>
                <label><span>Purchase quantity</span><div><input type="number" min="0.01" step="0.1" value={selected.packSize} onChange={(event) => updateSelected({ packSize: Math.max(0.01, Number(event.target.value) || 0.01) })} /><b>{selected.unit}</b></div><small>How much one supplier pack contains.</small></label>
                <label><span>Purchase unit label</span><input type="text" value={selected.purchaseUnit} onChange={(event) => updateSelected({ purchaseUnit: event.target.value })} /><small>Example: 5 kg pack or 12-bottle case.</small></label>
                <label><span>Pack price</span><div><b>₱</b><input type="number" min="0" step="1" value={selected.packPrice} onChange={(event) => updateSelected({ packPrice: Math.max(0, Number(event.target.value) || 0) })} /></div><small>Demo estimated cost for one purchase unit.</small></label>
                <label><span>Lead time</span><div><input type="number" min="0" step="0.5" value={selected.leadDays} onChange={(event) => updateSelected({ leadDays: Math.max(0, Number(event.target.value) || 0) })} /><b>days</b></div><small>Used to estimate stock remaining when supply arrives.</small></label>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div><span>04</span><h3>Jourvis Automation</h3></div>
                <p>Keep the everyday setup simple: when I should act, what I may do, and the limits I must never cross without asking you.</p>
              </div>

              <div className={styles.automationHero} data-enabled={selected.automationEnabled}>
                <CompanionMark className={styles.automationCompanion} />
                <div>
                  <span>JOURVIS ASKS</span>
                  <h4>{selected.automationEnabled ? "I know when to act and when to ask you." : "Want me to help manage this supply?"}</h4>
                  <p>
                    {selected.automationEnabled
                      ? `I act at ${selected.automationTriggerPercent}% or lower in ${selected.automationMode === "assist" ? "watch only" : selected.automationMode === "auto_contact" ? "contact supplier" : "buy within limits"} mode.`
                      : "Tell me when to act, what I may do, and the maximum amount I can approve without you."}
                  </p>
                </div>
                <div className={styles.automationHeroActions}>
                  <button
                    type="button"
                    className={styles.automationToggle}
                    data-on={selected.automationEnabled}
                    role="switch"
                    aria-checked={selected.automationEnabled}
                    onClick={() => updateSelected({ automationEnabled: !selected.automationEnabled })}
                  >
                    <i><b /></i><strong>{selected.automationEnabled ? "ON" : "OFF"}</strong>
                  </button>
                  <button id="jourvis-guide-start" type="button" className={styles.guideButton} onClick={() => setGuideStep(0)}>
                    <Sparkles size={14} aria-hidden /> Let Jourvis guide me
                  </button>
                </div>
              </div>

              {guideStep !== null ? (
                <div className={styles.guidePanel}>
                  <div className={styles.guideProgress}>
                    {Array.from({ length: 4 }).map((_, index) => <i key={index} data-active={index <= guideStep} />)}
                  </div>

                  {guideStep === 0 ? (
                    <div id="jourvis-guide-step-0" className={styles.guideQuestion}>
                      <span>1 / WHEN SHOULD I ACT?</span>
                      <h4>Choose the stock percentage that should wake me up.</h4>
                      <p>
                        {selected.name} is currently {fullPercent}%. I&apos;ll act at
                        {" "}{selected.automationTriggerPercent}% or lower, about {automationTriggerQuantity} {selected.unit}.
                      </p>
                      <div className={styles.triggerControl}>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={selected.automationTriggerPercent}
                          onChange={(event) => updateSelected({ automationTriggerPercent: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })}
                          aria-label={`Jourvis automation trigger for ${selected.name}`}
                        />
                        <label>
                          <span>Jourvis action trigger</span>
                          <div>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={selected.automationTriggerPercent}
                              onChange={(event) => updateSelected({ automationTriggerPercent: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })}
                            />
                            <b>%</b>
                          </div>
                          <small>About {automationTriggerQuantity} {selected.unit} of your {selected.fullLevel} {selected.unit} full level.</small>
                        </label>
                      </div>
                    </div>
                  ) : null}

                  {guideStep === 1 ? (
                    <div id="jourvis-guide-step-1" className={styles.guideQuestion}>
                      <span>2 / WHAT MAY I DO?</span>
                      <h4>Choose one level of authority.</h4>
                      <div className={styles.modeChoices}>
                        {([
                          ["assist", "Watch only", "Tell you when action is needed. I never contact a supplier by myself."],
                          ["auto_contact", "Contact supplier", "Ask the supplier automatically, then bring decisions back to you."],
                          ["autobuy", "Buy within limits", "Handle the normal purchase flow myself and ask you only when a limit is exceeded."],
                        ] as const).map(([value, label, description]) => (
                          <button key={value} type="button" data-active={selected.automationMode === value} onClick={() => updateSelected({ automationMode: value })}>
                            <strong>{label}</strong><small>{description}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {guideStep === 2 ? (
                    <div id="jourvis-guide-step-2" className={styles.guideQuestion}>
                      <span>3 / WHAT ARE MY LIMITS?</span>
                      <h4>Set the two numbers I must not exceed automatically.</h4>
                      <div className={styles.guideFields}>
                        <label>
                          <span>Maximum automatic order</span>
                          <div><b>₱</b><input type="number" min="0" value={selected.maxAutoOrderSpend} onChange={(event) => updateSelected({ maxAutoOrderSpend: Math.max(0, Number(event.target.value) || 0) })} /></div>
                          <small>If an actual order or quote is above this, I ask you.</small>
                        </label>
                        <label>
                          <span>Maximum automatic pack price</span>
                          <div><b>₱</b><input type="number" min="0" value={selected.autoAcceptPackPrice} onChange={(event) => updateSelected({ autoAcceptPackPrice: Math.max(0, Number(event.target.value) || 0), hardMaxPackPrice: Math.max(selected.hardMaxPackPrice, Number(event.target.value) || 0) })} /></div>
                          <small>For quote suppliers, I compare the supplier&apos;s actual quote to this price.</small>
                        </label>
                      </div>
                      <p className={styles.guideHint}>Anything outside these limits becomes a simple Approve once / Reject decision. Advanced rules are optional.</p>
                    </div>
                  ) : null}

                  {guideStep === 3 ? (
                    <div id="jourvis-guide-step-3" className={styles.guideQuestion}>
                      <span>4 / READY</span>
                      <h4>This is the rule I&apos;ll follow for {selected.name}.</h4>
                      <div className={styles.ruleSummary}>
                        <div><span>Act at</span><strong>≤ {selected.automationTriggerPercent}%</strong></div>
                        <div><span>Authority</span><strong>{selected.automationMode === "assist" ? "Watch only" : selected.automationMode === "auto_contact" ? "Contact supplier" : "Buy within limits"}</strong></div>
                        <div><span>Max order</span><strong>₱{selected.maxAutoOrderSpend}</strong></div>
                        <div><span>Max pack price</span><strong>₱{selected.autoAcceptPackPrice}</strong></div>
                      </div>
                      <label className={styles.previewRule}>
                        <input type="checkbox" checked={selected.automationPreview} onChange={(event) => updateSelected({ automationPreview: event.target.checked })} />
                        <span><strong>Preview mode</strong><small>Keep this on while testing. Jourvis will simulate supplier actions instead of sending anything real.</small></span>
                      </label>
                    </div>
                  ) : null}

                  <div className={styles.guideNav}>
                    <button type="button" className={styles.resetButton} onClick={() => guideStep === 0 ? setGuideStep(null) : setGuideStep((guideStep ?? 1) - 1)}><ChevronLeft size={14} aria-hidden /> {guideStep === 0 ? "Close" : "Back"}</button>
                    {guideStep < 3 ? (
                      <button type="button" className={styles.saveButton} onClick={() => setGuideStep((guideStep ?? 0) + 1)}>Continue <ChevronRight size={14} aria-hidden /></button>
                    ) : (
                      <button type="button" className={styles.saveButton} onClick={enableAutomationFromGuide}><Check size={14} aria-hidden /> Enable & save {selected.name}</button>
                    )}
                  </div>
                </div>
              ) : null}

              <div className={styles.automationRules}>
                <label><span>Jourvis action trigger</span><div><input type="number" min="0" max="100" step="1" value={selected.automationTriggerPercent} onChange={(event) => updateSelected({ automationTriggerPercent: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /><b>%</b></div><small>When stock reaches this percentage, Jourvis acts according to the authority below.</small></label>
                <label><span>What Jourvis may do</span><select value={selected.automationMode} onChange={(event) => updateSelected({ automationMode: event.target.value as Ingredient["automationMode"] })}><option value="assist">Watch only</option><option value="auto_contact">Contact supplier</option><option value="autobuy">Buy within limits</option></select><small>Buy within limits means Jourvis handles normal cases and asks you only for exceptions.</small></label>
                <label><span>Maximum automatic order</span><div><b>₱</b><input type="number" min="0" value={selected.maxAutoOrderSpend} onChange={(event) => updateSelected({ maxAutoOrderSpend: Math.max(0, Number(event.target.value) || 0) })} /></div><small>Above this total, Jourvis asks for a one-time approval.</small></label>
                <label><span>Maximum automatic pack price</span><div><b>₱</b><input type="number" min="0" value={selected.autoAcceptPackPrice} onChange={(event) => { const value = Math.max(0, Number(event.target.value) || 0); updateSelected({ autoAcceptPackPrice: value, hardMaxPackPrice: Math.max(selected.hardMaxPackPrice, value) }); }} /></div><small>For quote suppliers, this is checked against the actual supplier quote.</small></label>
              </div>

              <details className={styles.advancedRules}>
                <summary>Advanced rules</summary>
                <p>Only change these if your supplier relationship needs more control.</p>
                <div className={styles.automationRules}>
                  <label><span>Negotiation target price</span><div><b>₱</b><input type="number" min="0" value={selected.targetPackPrice} onChange={(event) => updateSelected({ targetPackPrice: Math.max(0, Number(event.target.value) || 0) })} /></div><small>Jourvis aims for this price when countering.</small></label>
                  <label><span>Absolute price ceiling</span><div><b>₱</b><input type="number" min="0" value={selected.hardMaxPackPrice} onChange={(event) => updateSelected({ hardMaxPackPrice: Math.max(selected.autoAcceptPackPrice, Number(event.target.value) || 0) })} /></div><small>Jourvis never negotiates above this private ceiling without owner approval.</small></label>
                  <label><span>Maximum automatic quantity</span><div><input type="number" min="0" step="0.1" value={selected.maxAutoOrderQty} onChange={(event) => updateSelected({ maxAutoOrderQty: Math.max(0, Number(event.target.value) || 0) })} /><b>{selected.unit}</b></div><small>Large quantity exceptions come back to you.</small></label>
                  <label><span>Auto-negotiate</span><select value={selected.autoNegotiate ? "yes" : "no"} onChange={(event) => updateSelected({ autoNegotiate: event.target.value === "yes" })}><option value="yes">Yes — counter within limits</option><option value="no">No — ask me instead</option></select><small>Used only when a quote is above the normal auto-accept price.</small></label>
                  <label><span>Maximum counteroffers</span><input type="number" min="0" max="5" value={selected.maxCounteroffers} onChange={(event) => updateSelected({ maxCounteroffers: Math.max(0, Math.min(5, Number(event.target.value) || 0)) })} /><small>After this many counters, Jourvis asks you.</small></label>
                  <label><span>Maximum delivery fee</span><div><b>₱</b><input type="number" min="0" value={selected.maxDeliveryFee} onChange={(event) => updateSelected({ maxDeliveryFee: Math.max(0, Number(event.target.value) || 0) })} /></div><small>Higher fees require approval.</small></label>
                  <label><span>Maximum lead time</span><div><input type="number" min="0" step="0.5" value={selected.maxLeadDays} onChange={(event) => updateSelected({ maxLeadDays: Math.max(0, Number(event.target.value) || 0) })} /><b>days</b></div><small>Longer delivery times require approval.</small></label>
                  <label><span>Demo behavior</span><select value={selected.automationPreview ? "preview" : "active"} onChange={(event) => updateSelected({ automationPreview: event.target.value === "preview" })}><option value="preview">Preview what Jourvis would do</option><option value="active">Run the simulated flow automatically</option></select><small>Both options are demo-only here. No real supplier message is sent.</small></label>
                </div>
              </details>
            </section>

            <div className={styles.saveBar}>
              <div><strong>{saved ? "Configuration saved locally." : "You have preview configuration changes."}</strong><small>No database changes are made. This preview stores configuration in this browser only.</small></div>
              <button type="button" className={styles.saveButton} onClick={save}>{saved ? <Check size={15} aria-hidden /> : <Save size={15} aria-hidden />}{saved ? "Saved" : "Save configuration"}</button>
            </div>
          </main>
        </div>
      </div>

      <JourvisPresence
        status={guideStep !== null ? `Guiding setup · ${guideStep + 1}/4` : selected.automationEnabled ? "Automation configured" : "Ready to help"}
        message={
          guideStep !== null
            ? guideStep === 0
              ? `I’m checking when to act on ${selected.name}.`
              : guideStep === 1
                ? "Choose how much purchasing authority you want me to have."
                : guideStep === 2
                  ? "Set the order and price limits I must not cross without you."
                  : "Review the simple rule I’ll follow."
            : selected.automationEnabled
              ? `I’m configured for ${selected.name} in ${automationModeLabel(selected.automationMode)} mode.`
              : `Want me to learn how to manage ${selected.name}?`
        }
        detail={
          guideStep !== null
            ? "You can keep working on the page while I stay here. I’ll remember where you drag me."
            : selected.automationEnabled
              ? `Trigger ≤ ${selected.automationTriggerPercent}% · target ₱${selected.targetPackPrice} · auto-accept ≤ ₱${selected.autoAcceptPackPrice} · hard stop ₱${selected.hardMaxPackPrice}.`
              : "I can walk you through the trigger, authority, price range, spend limits and negotiation rules."
        }
        attention={guideStep !== null || !selected.automationEnabled}
        focusTarget={jourvisConfigureFocusTarget}
        focusLabel={jourvisConfigureFocusLabel}
        actions={
          guideStep === null
            ? [
                { label: "Let Jourvis guide me", onClick: () => setGuideStep(0), primary: true },
                { label: "Save configuration", onClick: save },
                { label: "Back to Autoinventory", href: "/restaurant/marinara-ristorante/Autoinventory-preview" },
              ]
            : guideStep < 3
              ? [
                  { label: "Continue setup", onClick: () => setGuideStep((guideStep ?? 0) + 1), primary: true },
                  { label: "Close guide", onClick: () => setGuideStep(null) },
                ]
              : [
                  { label: `Enable & save ${selected.name}`, onClick: enableAutomationFromGuide, primary: true },
                  { label: "Review previous step", onClick: () => setGuideStep(2) },
                ]
        }
      />
    </div>
  );
}
