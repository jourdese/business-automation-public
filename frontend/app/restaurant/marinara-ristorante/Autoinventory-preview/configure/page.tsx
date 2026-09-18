"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, RotateCcw, Save, Search, Settings2 } from "lucide-react";
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
import styles from "./configure.module.css";

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export default function AutoinventoryConfigurePage() {
  const [items, setItems] = useState(initialIngredients);
  const [selectedId, setSelectedId] = useState("shrimp");
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);

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
            <p>Choose which supplier and contact person Jourvis should use, what quantity means 100%, and when restocking should begin.</p>
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

            <div className={styles.saveBar}>
              <div><strong>{saved ? "Configuration saved locally." : "You have preview configuration changes."}</strong><small>No database changes are made. This preview stores configuration in this browser only.</small></div>
              <button type="button" className={styles.saveButton} onClick={save}>{saved ? <Check size={15} aria-hidden /> : <Save size={15} aria-hidden />}{saved ? "Saved" : "Save configuration"}</button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
