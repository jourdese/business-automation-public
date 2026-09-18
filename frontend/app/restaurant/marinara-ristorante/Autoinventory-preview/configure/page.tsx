"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, RotateCcw, Save, Search, Settings2, Sparkles } from "lucide-react";
import CompanionMark from "@/components/jourvis/CompanionMark";
import {
  type Ingredient,
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
    const configured = loadConfiguredIngredients();
    setItems(configured);
    const requested = new URLSearchParams(window.location.search).get("stock");
    if (requested && configured.some((item) => item.id === requested)) setSelectedId(requested);
  }, []);

  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const supplier = getSupplier(selected);
  const contact = getContact(selected);

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
              <div className={styles.sectionHeading}><div><span>01</span><h3>Stock levels</h3></div><p>These values control the battery and when Jourvis starts recommending a restock.</p></div>
              <div className={styles.batteryCard}>
                <div className={styles.battery}><span style={{ width: `${fullPercent}%` }} /></div>
                <div className={styles.batteryLegend}><span>{selected.current} {selected.unit} current</span><strong>{fullPercent}%</strong><span>{selected.fullLevel} {selected.unit} = 100%</span></div>
                <div className={styles.threshold}><span style={{ left: `${reorderPercent}%` }} /><small>Reorder at {selected.reorderAt} {selected.unit} · {reorderPercent}%</small></div>
              </div>
              <div className={styles.fieldsTwo}>
                <label><span>Full level / 100%</span><div><input type="number" min="0.01" step="0.1" value={selected.fullLevel} onChange={(event) => { const value = Math.max(0.01, Number(event.target.value) || 0.01); updateSelected({ fullLevel: value, reorderAt: Math.min(selected.reorderAt, value) }); }} /><b>{selected.unit}</b></div><small>The quantity represented by a full battery.</small></label>
                <label><span>Reorder at</span><div><input type="number" min="0" max={selected.fullLevel} step="0.1" value={selected.reorderAt} onChange={(event) => updateSelected({ reorderAt: Math.max(0, Math.min(selected.fullLevel, Number(event.target.value) || 0)) })} /><b>{selected.unit}</b></div><small>Jourvis starts suggesting supplier contact here.</small></label>
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
                <p>Give Jourvis explicit permission and limits. Anything outside these rules stops and comes back to the owner.</p>
              </div>

              <div className={styles.automationHero} data-enabled={selected.automationEnabled}>
                <CompanionMark className={styles.automationCompanion} />
                <div>
                  <span>JOURVIS ASKS</span>
                  <h4>{selected.automationEnabled ? "I know the rules for this supply." : "Want me to manage this supply when it gets low?"}</h4>
                  <p>
                    {selected.automationEnabled
                      ? `Mode: ${selected.automationMode.replace("_", " ")} · target ${new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(selected.targetPackPrice)} · hard stop ${new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(selected.hardMaxPackPrice)}.`
                      : "I can watch the reorder point, contact the supplier, negotiate inside your price range, and stop whenever a limit is exceeded."}
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
                  <button type="button" className={styles.guideButton} onClick={() => setGuideStep(0)}>
                    <Sparkles size={14} aria-hidden /> Let Jourvis guide me
                  </button>
                </div>
              </div>

              {guideStep !== null ? (
                <div className={styles.guidePanel}>
                  <div className={styles.guideProgress}>
                    {Array.from({ length: 6 }).map((_, index) => <i key={index} data-active={index <= guideStep} />)}
                  </div>

                  {guideStep === 0 ? (
                    <div className={styles.guideQuestion}>
                      <span>1 / WHEN SHOULD I ACT?</span>
                      <h4>I&apos;ll watch the reorder point you already configured.</h4>
                      <p>For {selected.name}, I&apos;ll start when stock reaches {selected.reorderAt} {selected.unit} or lower. You can change that in Stock levels above.</p>
                    </div>
                  ) : null}

                  {guideStep === 1 ? (
                    <div className={styles.guideQuestion}>
                      <span>2 / WHAT MAY I DO?</span>
                      <h4>How much control do you want me to have?</h4>
                      <div className={styles.modeChoices}>
                        {([
                          ["assist", "Assist", "Tell me what to do, but never contact a supplier automatically."],
                          ["auto_contact", "Auto-contact", "Contact the supplier when stock is low, then wait for owner approval."],
                          ["autobuy", "Autobuy", "Contact, negotiate and accept only inside the limits below."],
                        ] as const).map(([value, label, description]) => (
                          <button key={value} type="button" data-active={selected.automationMode === value} onClick={() => updateSelected({ automationMode: value })}>
                            <strong>{label}</strong><small>{description}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {guideStep === 2 ? (
                    <div className={styles.guideQuestion}>
                      <span>3 / WHAT PRICE IS SAFE?</span>
                      <h4>Give me a target, an auto-accept ceiling, and a hard stop.</h4>
                      <div className={styles.guideFields}>
                        <label><span>Target / pack</span><div><b>₱</b><input type="number" min="0" value={selected.targetPackPrice} onChange={(event) => updateSelected({ targetPackPrice: Math.max(0, Number(event.target.value) || 0) })} /></div></label>
                        <label><span>Auto-accept up to</span><div><b>₱</b><input type="number" min={selected.targetPackPrice} value={selected.autoAcceptPackPrice} onChange={(event) => updateSelected({ autoAcceptPackPrice: Math.max(selected.targetPackPrice, Number(event.target.value) || 0) })} /></div></label>
                        <label><span>Never exceed</span><div><b>₱</b><input type="number" min={selected.autoAcceptPackPrice} value={selected.hardMaxPackPrice} onChange={(event) => updateSelected({ hardMaxPackPrice: Math.max(selected.autoAcceptPackPrice, Number(event.target.value) || 0) })} /></div></label>
                      </div>
                      <p className={styles.guideHint}>The hard maximum stays private. Jourvis does not tell the supplier your ceiling.</p>
                    </div>
                  ) : null}

                  {guideStep === 3 ? (
                    <div className={styles.guideQuestion}>
                      <span>4 / HOW MUCH MAY I SPEND?</span>
                      <h4>Set quantity and spend guardrails.</h4>
                      <div className={styles.guideFields}>
                        <label><span>Max automatic quantity</span><div><input type="number" min="0" step="0.1" value={selected.maxAutoOrderQty} onChange={(event) => updateSelected({ maxAutoOrderQty: Math.max(0, Number(event.target.value) || 0) })} /><b>{selected.unit}</b></div></label>
                        <label><span>Max automatic order</span><div><b>₱</b><input type="number" min="0" value={selected.maxAutoOrderSpend} onChange={(event) => updateSelected({ maxAutoOrderSpend: Math.max(0, Number(event.target.value) || 0) })} /></div></label>
                        <label><span>Max delivery fee</span><div><b>₱</b><input type="number" min="0" value={selected.maxDeliveryFee} onChange={(event) => updateSelected({ maxDeliveryFee: Math.max(0, Number(event.target.value) || 0) })} /></div></label>
                        <label><span>Max lead time</span><div><input type="number" min="0" step="0.5" value={selected.maxLeadDays} onChange={(event) => updateSelected({ maxLeadDays: Math.max(0, Number(event.target.value) || 0) })} /><b>days</b></div></label>
                      </div>
                    </div>
                  ) : null}

                  {guideStep === 4 ? (
                    <div className={styles.guideQuestion}>
                      <span>5 / MAY I NEGOTIATE?</span>
                      <h4>Tell me what to do when a quote is above the auto-accept price.</h4>
                      <div className={styles.negotiationRow}>
                        <button type="button" data-active={selected.autoNegotiate} onClick={() => updateSelected({ autoNegotiate: !selected.autoNegotiate })}>
                          <strong>{selected.autoNegotiate ? "Auto-negotiate ON" : "Auto-negotiate OFF"}</strong>
                          <small>{selected.autoNegotiate ? "I may counter up to the limit below." : "I will stop and ask you instead."}</small>
                        </button>
                        <label><span>Max counteroffers</span><input type="number" min="0" max="5" value={selected.maxCounteroffers} onChange={(event) => updateSelected({ maxCounteroffers: Math.max(0, Math.min(5, Number(event.target.value) || 0)) })} /></label>
                      </div>
                    </div>
                  ) : null}

                  {guideStep === 5 ? (
                    <div className={styles.guideQuestion}>
                      <span>6 / READY</span>
                      <h4>Here&apos;s what I&apos;ll do for {selected.name}.</h4>
                      <div className={styles.ruleSummary}>
                        <div><span>Trigger</span><strong>≤ {selected.reorderAt} {selected.unit}</strong></div>
                        <div><span>Mode</span><strong>{selected.automationMode.replace("_", " ")}</strong></div>
                        <div><span>Target price</span><strong>₱{selected.targetPackPrice}</strong></div>
                        <div><span>Auto-accept</span><strong>≤ ₱{selected.autoAcceptPackPrice}</strong></div>
                        <div><span>Hard stop</span><strong>₱{selected.hardMaxPackPrice}</strong></div>
                        <div><span>Max order</span><strong>₱{selected.maxAutoOrderSpend}</strong></div>
                      </div>
                      <label className={styles.previewRule}>
                        <input type="checkbox" checked={selected.automationPreview} onChange={(event) => updateSelected({ automationPreview: event.target.checked })} />
                        <span><strong>Preview mode</strong><small>Jourvis runs the workflow in the demo but marks automatic actions as a dry run.</small></span>
                      </label>
                    </div>
                  ) : null}

                  <div className={styles.guideNav}>
                    <button type="button" className={styles.resetButton} onClick={() => guideStep === 0 ? setGuideStep(null) : setGuideStep((guideStep ?? 1) - 1)}><ChevronLeft size={14} aria-hidden /> {guideStep === 0 ? "Close" : "Back"}</button>
                    {guideStep < 5 ? (
                      <button type="button" className={styles.saveButton} onClick={() => setGuideStep((guideStep ?? 0) + 1)}>Continue <ChevronRight size={14} aria-hidden /></button>
                    ) : (
                      <button type="button" className={styles.saveButton} onClick={enableAutomationFromGuide}><Check size={14} aria-hidden /> Enable & save for {selected.name}</button>
                    )}
                  </div>
                </div>
              ) : null}

              <div className={styles.automationRules}>
                <label><span>Automation mode</span><select value={selected.automationMode} onChange={(event) => updateSelected({ automationMode: event.target.value as Ingredient["automationMode"] })}><option value="assist">Assist only</option><option value="auto_contact">Auto-contact supplier</option><option value="autobuy">Autobuy within limits</option></select><small>Autobuy still stops when any configured limit is exceeded.</small></label>
                <label><span>Target pack price</span><div><b>₱</b><input type="number" min="0" value={selected.targetPackPrice} onChange={(event) => updateSelected({ targetPackPrice: Math.max(0, Number(event.target.value) || 0) })} /></div><small>The price Jourvis aims for when negotiating.</small></label>
                <label><span>Auto-accept up to</span><div><b>₱</b><input type="number" min="0" value={selected.autoAcceptPackPrice} onChange={(event) => updateSelected({ autoAcceptPackPrice: Math.max(0, Number(event.target.value) || 0) })} /></div><small>Quotes at or below this may be accepted automatically in Autobuy mode.</small></label>
                <label><span>Absolute maximum</span><div><b>₱</b><input type="number" min="0" value={selected.hardMaxPackPrice} onChange={(event) => updateSelected({ hardMaxPackPrice: Math.max(0, Number(event.target.value) || 0) })} /></div><small>Jourvis never accepts or counters above this private ceiling.</small></label>
                <label><span>Max auto quantity</span><div><input type="number" min="0" step="0.1" value={selected.maxAutoOrderQty} onChange={(event) => updateSelected({ maxAutoOrderQty: Math.max(0, Number(event.target.value) || 0) })} /><b>{selected.unit}</b></div><small>If the suggested quantity is higher, Jourvis asks you.</small></label>
                <label><span>Max order spend</span><div><b>₱</b><input type="number" min="0" value={selected.maxAutoOrderSpend} onChange={(event) => updateSelected({ maxAutoOrderSpend: Math.max(0, Number(event.target.value) || 0) })} /></div><small>Maximum automatic spend for this stock rule.</small></label>
                <label><span>Auto-negotiate</span><select value={selected.autoNegotiate ? "yes" : "no"} onChange={(event) => updateSelected({ autoNegotiate: event.target.value === "yes" })}><option value="yes">Yes — counter within limits</option><option value="no">No — always ask owner</option></select><small>Only applies when a supplier quote is above the auto-accept ceiling.</small></label>
                <label><span>Max counteroffers</span><input type="number" min="0" max="5" value={selected.maxCounteroffers} onChange={(event) => updateSelected({ maxCounteroffers: Math.max(0, Math.min(5, Number(event.target.value) || 0)) })} /><small>Jourvis stops and asks you after this many counters.</small></label>
                <label><span>Max delivery fee</span><div><b>₱</b><input type="number" min="0" value={selected.maxDeliveryFee} onChange={(event) => updateSelected({ maxDeliveryFee: Math.max(0, Number(event.target.value) || 0) })} /></div><small>Higher fees require owner approval.</small></label>
                <label><span>Max lead time</span><div><input type="number" min="0" step="0.5" value={selected.maxLeadDays} onChange={(event) => updateSelected({ maxLeadDays: Math.max(0, Number(event.target.value) || 0) })} /><b>days</b></div><small>Longer supplier lead times require owner approval.</small></label>
                <label><span>Automation run mode</span><select value={selected.automationPreview ? "preview" : "active"} onChange={(event) => updateSelected({ automationPreview: event.target.value === "preview" })}><option value="preview">Preview / dry run</option><option value="active">Active rules</option></select><small>This prototype never sends a real message; the setting shows how production behavior would differ.</small></label>
              </div>
            </section>

            <div className={styles.saveBar}>
              <div><strong>{saved ? "Configuration saved locally." : "You have preview configuration changes."}</strong><small>No database changes are made. This preview stores configuration in this browser only.</small></div>
              <button type="button" className={styles.saveButton} onClick={save}>{saved ? <Check size={15} aria-hidden /> : <Save size={15} aria-hidden />}{saved ? "Saved" : "Save configuration"}</button>
            </div>
          </main>
        </div>
      </div>

      <JourvisPresence
        status={guideStep !== null ? `Guiding setup · ${guideStep + 1}/6` : selected.automationEnabled ? "Automation configured" : "Ready to help"}
        message={
          guideStep !== null
            ? guideStep === 0
              ? `I’m checking when to act on ${selected.name}.`
              : guideStep === 1
                ? "Choose how much purchasing authority you want me to have."
                : guideStep === 2
                  ? "Tell me the price range I’m allowed to work inside."
                  : guideStep === 3
                    ? "Now give me quantity, spend and delivery limits."
                    : guideStep === 4
                      ? "Should I negotiate for you when a quote is too high?"
                      : "Review my rules. I’ll stop whenever something falls outside them."
            : selected.automationEnabled
              ? `I’m configured for ${selected.name} in ${selected.automationMode.replace("_", " ")} mode.`
              : `Want me to learn how to manage ${selected.name}?`
        }
        detail={
          guideStep !== null
            ? "You can keep working on the page while I stay here. I’ll remember where you drag me."
            : selected.automationEnabled
              ? `Target ₱${selected.targetPackPrice} · auto-accept ≤ ₱${selected.autoAcceptPackPrice} · hard stop ₱${selected.hardMaxPackPrice}.`
              : "I can walk you through the trigger, authority, price range, spend limits and negotiation rules."
        }
        attention={!selected.automationEnabled}
        actions={
          guideStep === null
            ? [
                { label: "Let Jourvis guide me", onClick: () => setGuideStep(0), primary: true },
                { label: "Save configuration", onClick: save },
                { label: "Back to Autoinventory", href: "/restaurant/marinara-ristorante/Autoinventory-preview" },
              ]
            : guideStep < 5
              ? [
                  { label: "Continue setup", onClick: () => setGuideStep((guideStep ?? 0) + 1), primary: true },
                  { label: "Close guide", onClick: () => setGuideStep(null) },
                ]
              : [
                  { label: `Enable & save ${selected.name}`, onClick: enableAutomationFromGuide, primary: true },
                  { label: "Review previous step", onClick: () => setGuideStep(4) },
                ]
        }
      />
    </div>
  );
}
