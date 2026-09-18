"use client";

import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ChefHat,
  Clock3,
  Mail,
  PackageCheck,
  RefreshCw,
  Search,
  Settings2,
  ShoppingCart,
  Sparkles,
  TriangleAlert,
  Truck,
  X,
} from "lucide-react";
import CompanionMark from "@/components/jourvis/CompanionMark";
import {
  type Ingredient,
  type Zone,
  getContact,
  getSupplier,
  initialIngredients,
  loadConfiguredIngredients,
  suppliers,
} from "./inventory-config";
import StockIcon from "./StockIcon";
import styles from "./autoinventory-preview.module.css";

type Tone = "good" | "watch" | "low" | "critical";
type PrimaryTab = "overview" | "stock" | "recipes" | "orders" | "activity";
type StockFilter = "All" | Zone;

type Recipe = {
  id: string;
  name: string;
  description: string;
  ingredients: Record<string, number>;
};

type ContactDraft = {
  itemIds: string[];
  quantities: Record<string, number>;
  contactBySupplier: Record<string, string>;
  title: string;
};

type ProcurementStatus =
  | "requested"
  | "supplier_viewed"
  | "quote_received"
  | "counter_sent"
  | "awaiting_confirmation"
  | "confirmed"
  | "in_transit"
  | "received"
  | "declined";

type ProcurementLine = {
  itemId: string;
  requestedQty: number;
  agreedQty?: number;
  quotedPackPrice?: number;
  receivedQty?: number;
};

type ProcurementRequest = {
  id: string;
  supplierId: string;
  contactId: string;
  mode: Ingredient["purchasingMode"];
  status: ProcurementStatus;
  lines: ProcurementLine[];
  deliveryFee: number;
  etaDays: number;
  buyerConfirmed: boolean;
  supplierConfirmed: boolean;
  incomingApplied: boolean;
};

const recipes: Recipe[] = [
  {
    id: "seafood-marinara",
    name: "Seafood Marinara",
    description: "Pasta, tomato sauce, shrimp, squid, basil and Parmigiano.",
    ingredients: { pasta: 0.18, tomato: 0.16, shrimp: 0.07, squid: 0.05, basil: 0.003, parmesan: 0.015, "olive-oil": 0.012 },
  },
  {
    id: "shrimp-alfredo",
    name: "Shrimp & Mushroom Alfredo",
    description: "Creamy pasta with shrimp, mushroom and Parmigiano.",
    ingredients: { pasta: 0.18, shrimp: 0.09, mushroom: 0.06, cream: 0.12, parmesan: 0.02, "olive-oil": 0.01 },
  },
  {
    id: "quattro",
    name: "Quattro Formaggi Pizza",
    description: "Pizza flour, mozzarella and Parmigiano.",
    ingredients: { flour: 0.24, mozzarella: 0.13, parmesan: 0.035, tomato: 0.08, basil: 0.002 },
  },
  {
    id: "salmon",
    name: "Grilled Salmon Fillet",
    description: "Salmon with olive oil, mushrooms and herbs.",
    ingredients: { salmon: 0.19, mushroom: 0.05, "olive-oil": 0.016, basil: 0.002 },
  },
];

const primaryTabs: ReadonlyArray<{ id: PrimaryTab; label: string }> = [
  { id: "overview", label: "Summary" },
  { id: "stock", label: "Stock" },
  { id: "recipes", label: "Recipes" },
  { id: "orders", label: "Orders" },
  { id: "activity", label: "Activity" },
];

const zoneOrder: Zone[] = ["Pantry", "Cold storage", "Seafood freezer", "Produce"];
const stockFilters: StockFilter[] = ["All", ...zoneOrder];

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function percent(item: Ingredient) {
  return Math.max(0, Math.min(100, Math.round((item.current / Math.max(item.fullLevel, 0.01)) * 100)));
}

function projectedAtDelivery(item: Ingredient) {
  return Math.max(0, item.current + item.incoming - item.dailyUse * item.leadDays);
}

function projectedPercent(item: Ingredient, added = 0) {
  return Math.max(0, Math.min(100, Math.round(((projectedAtDelivery(item) + added) / Math.max(item.fullLevel, 0.01)) * 100)));
}

function tone(item: Ingredient): Tone {
  if (item.current <= item.reorderAt * 0.65) return "critical";
  if (item.current <= item.reorderAt) return "low";
  if (percent(item) <= 60) return "watch";
  return "good";
}

function toneLabel(value: Tone) {
  if (value === "critical") return "Critical";
  if (value === "low") return "Low";
  if (value === "watch") return "Watch";
  return "Ready";
}

function suggestedOrder(item: Ingredient) {
  const projected = projectedAtDelivery(item);
  const shortage = Math.max(0, item.fullLevel - projected);
  if (shortage <= 0) return 0;
  return Math.max(item.packSize, Math.ceil(shortage / item.packSize) * item.packSize);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function procurementTotal(request: ProcurementRequest, ingredients: Ingredient[]) {
  return request.lines.reduce((sum, line) => {
    const item = ingredients.find((candidate) => candidate.id === line.itemId);
    if (!item) return sum;
    const quantity = line.agreedQty ?? line.requestedQty;
    const packPrice = line.quotedPackPrice ?? item.packPrice;
    const packs = Math.ceil(quantity / Math.max(item.packSize, 0.01));
    return sum + packs * packPrice;
  }, request.deliveryFee);
}

function supplierGroupsForItems(items: Ingredient[]) {
  const grouped = new Map<string, Ingredient[]>();
  items.forEach((item) => {
    const key = `${item.supplierId}::${item.purchasingMode}`;
    const list = grouped.get(key) ?? [];
    list.push(item);
    grouped.set(key, list);
  });
  return [...grouped.values()];
}

function procurementStatusLabel(status: ProcurementStatus) {
  if (status === "requested") return "Request sent";
  if (status === "supplier_viewed") return "Supplier viewed";
  if (status === "quote_received") return "Quote received";
  if (status === "counter_sent") return "Counter sent";
  if (status === "awaiting_confirmation") return "Awaiting confirmation";
  if (status === "confirmed") return "Confirmed";
  if (status === "in_transit") return "In transit";
  if (status === "received") return "Received";
  return "Declined";
}

function activeProcurementStatus(status: ProcurementStatus) {
  return status !== "received" && status !== "declined";
}

export default function MarinaraAutoinventoryPreviewPage() {
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [selectedId, setSelectedId] = useState("shrimp");
  const [activeTab, setActiveTab] = useState<PrimaryTab>("overview");
  const [stockFilter, setStockFilter] = useState<StockFilter>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSummaryLabels, setShowSummaryLabels] = useState(true);
  const [contactDraft, setContactDraft] = useState<ContactDraft | null>(null);
  const [procurements, setProcurements] = useState<ProcurementRequest[]>([]);
  const [activity, setActivity] = useState([
    "Jourvis finished the morning inventory scan.",
    "42 guests are forecast for tonight's dinner service.",
  ]);

  useEffect(() => {
    const refreshConfiguration = () => setIngredients((current) => {
      const configured = loadConfiguredIngredients();
      return configured.map((config) => {
        const live = current.find((item) => item.id === config.id);
        return live ? { ...config, current: live.current, incoming: live.incoming } : config;
      });
    });

    const savedLabels = window.localStorage.getItem("jourvis-autoinventory-summary-labels");
    if (savedLabels !== null) setShowSummaryLabels(savedLabels === "true");

    refreshConfiguration();
    window.addEventListener("focus", refreshConfiguration);
    return () => window.removeEventListener("focus", refreshConfiguration);
  }, []);

  const selected = ingredients.find((item) => item.id === selectedId) ?? ingredients[0];
  const selectedTone = tone(selected);
  const selectedSupplier = getSupplier(selected);
  const selectedContact = getContact(selected);

  const metrics = useMemo(() => {
    const critical = ingredients.filter((item) => tone(item) === "critical").length;
    const low = ingredients.filter((item) => tone(item) === "low").length;
    const incoming = ingredients.filter((item) => item.incoming > 0).length;
    const readiness = Math.round(
      ingredients.reduce((sum, item) => sum + Math.min(100, percent(item)), 0) /
        ingredients.length,
    );
    return { critical, low, incoming, readiness };
  }, [ingredients]);

  const urgent = useMemo(
    () => ingredients.filter((item) => item.current <= item.reorderAt).sort((a, b) => percent(a) - percent(b)),
    [ingredients],
  );

  const activeProcurementItemIds = useMemo(
    () => new Set(
      procurements
        .filter((request) => activeProcurementStatus(request.status))
        .flatMap((request) => request.lines.map((line) => line.itemId)),
    ),
    [procurements],
  );

  const suggested = useMemo(
    () => ingredients.filter(
      (item) =>
        item.current <= item.reorderAt &&
        suggestedOrder(item) > 0 &&
        !activeProcurementItemIds.has(item.id),
    ),
    [ingredients, activeProcurementItemIds],
  );

  const incoming = useMemo(() => ingredients.filter((item) => item.incoming > 0), [ingredients]);
  const activeProcurements = useMemo(
    () => procurements.filter((request) => activeProcurementStatus(request.status)),
    [procurements],
  );

  const filteredIngredients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return ingredients.filter((item) => {
      const supplier = getSupplier(item);
      const contact = getContact(item);
      const matchesZone = stockFilter === "All" || item.zone === stockFilter;
      const matchesSearch = !query || `${item.name} ${supplier.name} ${contact.name}`.toLowerCase().includes(query);
      return matchesZone && matchesSearch;
    });
  }, [ingredients, searchTerm, stockFilter]);

  const affectedRecipes = recipes.filter((recipe) => selected.id in recipe.ingredients);
  const daysRemaining = selected.dailyUse > 0 ? selected.current / selected.dailyUse : 99;
  const orderAmount = suggestedOrder(selected);
  const supplierGroups = useMemo(() => supplierGroupsForItems(suggested), [suggested]);
  const selectedProcurement = procurements.find(
    (request) =>
      activeProcurementStatus(request.status) &&
      request.lines.some((line) => line.itemId === selected.id),
  );

  function procurementForItem(itemId: string) {
    return procurements.find(
      (request) =>
        activeProcurementStatus(request.status) &&
        request.lines.some((line) => line.itemId === itemId),
    );
  }

  function log(message: string) {
    setActivity((current) => [message, ...current].slice(0, 12));
  }

  function updateIngredient(id: string, updater: (item: Ingredient) => Ingredient) {
    setIngredients((current) => current.map((item) => (item.id === id ? updater(item) : item)));
  }

  function receive(item: Ingredient) {
    if (item.incoming <= 0) {
      log(`No incoming ${item.name} delivery is waiting to be received.`);
      return;
    }
    const amount = item.incoming;
    updateIngredient(item.id, (current) => ({
      ...current,
      current: round(current.current + current.incoming),
      incoming: 0,
    }));
    log(`Delivery received: ${amount} ${item.unit} of ${item.name}. On-hand inventory increased.`);
  }

  function recordWaste(item: Ingredient) {
    const amount = Math.min(item.current, Math.max(0.05, item.fullLevel * 0.05));
    updateIngredient(item.id, (current) => ({
      ...current,
      current: round(Math.max(0, current.current - amount)),
    }));
    log(`Recorded ${round(amount)} ${item.unit} of ${item.name} as demo waste/spoilage.`);
  }

  function sellRecipe(recipe: Recipe) {
    const shortages = Object.entries(recipe.ingredients).filter(([id, amount]) => {
      const ingredient = ingredients.find((item) => item.id === id);
      return !ingredient || ingredient.current < amount;
    });
    if (shortages.length) {
      log(`${recipe.name} cannot be simulated: at least one ingredient is out of stock.`);
      return;
    }
    setIngredients((current) =>
      current.map((item) => {
        const amount = recipe.ingredients[item.id] ?? 0;
        return amount ? { ...item, current: round(Math.max(0, item.current - amount)) } : item;
      }),
    );
    log(`Demo sale: 1 × ${recipe.name}. Recipe ingredients were deducted automatically.`);
  }

  function resetDemo() {
    setIngredients(loadConfiguredIngredients());
    setSelectedId("shrimp");
    setActiveTab("overview");
    setStockFilter("All");
    setSearchTerm("");
    setContactDraft(null);
    setProcurements([]);
    setActivity([
      "Jourvis finished the morning inventory scan.",
      "42 guests are forecast for tonight's dinner service.",
    ]);
  }

  function chooseFilter(filter: StockFilter) {
    setStockFilter(filter);
    if (filter === "All" || selected.zone === filter) return;
    const first = ingredients.find((item) => item.zone === filter);
    if (first) setSelectedId(first.id);
  }

  function switchTab(tab: PrimaryTab) {
    setActiveTab(tab);
    if (tab === "stock" && !filteredIngredients.some((item) => item.id === selectedId)) {
      setStockFilter("All");
      setSearchTerm("");
    }
  }

  function handleTabKeys(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = primaryTabs.findIndex((tab) => tab.id === activeTab);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % primaryTabs.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + primaryTabs.length) % primaryTabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = primaryTabs.length - 1;
    if (nextIndex === currentIndex || !["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextTab = primaryTabs[nextIndex].id;
    switchTab(nextTab);
    window.requestAnimationFrame(() => document.getElementById(`autoinventory-tab-${nextTab}`)?.focus());
  }

  function openContact(items: Ingredient[], title: string) {
    const quantities = Object.fromEntries(items.map((item) => [item.id, suggestedOrder(item)]));
    const contactBySupplier = Object.fromEntries(
      supplierGroupsForItems(items).map((group) => [group[0].supplierId, group[0].contactId]),
    );
    setContactDraft({ itemIds: items.map((item) => item.id), quantities, contactBySupplier, title });
  }

  function changeDraftQuantity(item: Ingredient, next: number) {
    if (!contactDraft) return;
    const normalized = Math.max(0, round(next));
    setContactDraft({
      ...contactDraft,
      quantities: { ...contactDraft.quantities, [item.id]: normalized },
    });
  }

  function changeDraftContact(supplierId: string, contactId: string) {
    if (!contactDraft) return;
    setContactDraft({
      ...contactDraft,
      contactBySupplier: { ...contactDraft.contactBySupplier, [supplierId]: contactId },
    });
  }

  function sendContactRequests() {
    if (!contactDraft) return;
    const draftItems = ingredients.filter((item) => contactDraft.itemIds.includes(item.id));
    const groups = supplierGroupsForItems(draftItems.filter((item) => (contactDraft.quantities[item.id] ?? 0) > 0));

    if (!groups.length) {
      log("No supplier request was sent because every requested quantity is zero.");
      setContactDraft(null);
      return;
    }

    const startIndex = procurements.length;
    const nextRequests: ProcurementRequest[] = groups.map((items, index) => {
      const first = items[0];
      const supplier = getSupplier(first);
      const contactId = contactDraft.contactBySupplier[supplier.id] ?? first.contactId;
      return {
        id: `REQ-${String(startIndex + index + 1).padStart(3, "0")}`,
        supplierId: supplier.id,
        contactId,
        mode: first.purchasingMode,
        status: "requested",
        lines: items.map((item) => ({
          itemId: item.id,
          requestedQty: contactDraft.quantities[item.id] ?? 0,
        })),
        deliveryFee: 0,
        etaDays: Math.max(...items.map((item) => item.leadDays)),
        buyerConfirmed: first.purchasingMode === "fixed",
        supplierConfirmed: false,
        incomingApplied: false,
      };
    });

    setProcurements((current) => [...nextRequests, ...current]);

    nextRequests.forEach((request) => {
      const supplier = suppliers.find((candidate) => candidate.id === request.supplierId) ?? suppliers[0];
      const contact = supplier.contacts.find((candidate) => candidate.id === request.contactId) ?? supplier.contacts[0];
      log(
        request.mode === "quote"
          ? `${request.id}: quote request sent to ${contact.name} at ${supplier.name}. Stock is not incoming yet.`
          : `${request.id}: fixed-price purchase order sent to ${contact.name} at ${supplier.name}. Awaiting supplier acknowledgment.`,
      );
    });

    setContactDraft(null);
    setActiveTab("orders");
  }

  function updateProcurement(id: string, updater: (request: ProcurementRequest) => ProcurementRequest) {
    setProcurements((current) => current.map((request) => request.id === id ? updater(request) : request));
  }

  function supplierViewsRequest(request: ProcurementRequest) {
    updateProcurement(request.id, (current) => ({ ...current, status: "supplier_viewed" }));
    log(`${request.id}: supplier viewed the request.`);
  }

  function supplierSubmitsQuote(request: ProcurementRequest) {
    updateProcurement(request.id, (current) => ({
      ...current,
      status: "quote_received",
      deliveryFee: 150,
      lines: current.lines.map((line) => {
        const item = ingredients.find((candidate) => candidate.id === line.itemId);
        return {
          ...line,
          agreedQty: line.requestedQty,
          quotedPackPrice: item ? Math.round(item.packPrice * 1.05) : 0,
        };
      }),
    }));
    log(`${request.id}: supplier submitted a demo quote. Buyer review is required.`);
  }

  function buyerAcceptsQuote(request: ProcurementRequest) {
    updateProcurement(request.id, (current) => ({
      ...current,
      status: "awaiting_confirmation",
      buyerConfirmed: true,
    }));
    log(`${request.id}: buyer accepted the quote. Awaiting final supplier confirmation.`);
  }

  function buyerCountersQuote(request: ProcurementRequest) {
    updateProcurement(request.id, (current) => ({
      ...current,
      status: "counter_sent",
      buyerConfirmed: true,
      lines: current.lines.map((line) => {
        const item = ingredients.find((candidate) => candidate.id === line.itemId);
        return {
          ...line,
          quotedPackPrice: item?.packPrice ?? line.quotedPackPrice,
          agreedQty: line.agreedQty ?? line.requestedQty,
        };
      }),
    }));
    log(`${request.id}: buyer sent a counteroffer using the previous configured pack price.`);
  }

  function declineProcurement(request: ProcurementRequest) {
    updateProcurement(request.id, (current) => ({ ...current, status: "declined" }));
    log(`${request.id}: procurement request was declined/cancelled. No incoming stock was created.`);
  }

  function confirmProcurement(request: ProcurementRequest, source: "acknowledgment" | "counter" | "quote") {
    if (request.incomingApplied) return;

    const quantities = request.lines.map((line) => ({
      itemId: line.itemId,
      qty: line.agreedQty ?? line.requestedQty,
    }));

    setIngredients((current) =>
      current.map((item) => {
        const line = quantities.find((candidate) => candidate.itemId === item.id);
        return line ? { ...item, incoming: round(item.incoming + line.qty) } : item;
      }),
    );

    updateProcurement(request.id, (current) => ({
      ...current,
      status: "confirmed",
      buyerConfirmed: true,
      supplierConfirmed: true,
      incomingApplied: true,
      lines: current.lines.map((line) => ({
        ...line,
        agreedQty: line.agreedQty ?? line.requestedQty,
        receivedQty: line.agreedQty ?? line.requestedQty,
      })),
    }));

    log(
      source === "acknowledgment"
        ? `${request.id}: supplier acknowledged the fixed-price order. Both parties confirmed; stock is now confirmed incoming.`
        : source === "counter"
          ? `${request.id}: supplier accepted the buyer counteroffer. Both parties confirmed; stock is now confirmed incoming.`
          : `${request.id}: supplier gave final confirmation after buyer acceptance. Stock is now confirmed incoming.`,
    );
  }

  function markProcurementInTransit(request: ProcurementRequest) {
    updateProcurement(request.id, (current) => ({ ...current, status: "in_transit" }));
    log(`${request.id}: supplier marked the confirmed order in transit.`);
  }

  function changeReceivedQuantity(requestId: string, itemId: string, quantity: number) {
    updateProcurement(requestId, (current) => ({
      ...current,
      lines: current.lines.map((line) =>
        line.itemId === itemId ? { ...line, receivedQty: Math.max(0, round(quantity)) } : line,
      ),
    }));
  }

  function receiveProcurement(request: ProcurementRequest) {
    setIngredients((current) =>
      current.map((item) => {
        const line = request.lines.find((candidate) => candidate.itemId === item.id);
        if (!line) return item;
        const agreed = line.agreedQty ?? line.requestedQty;
        const received = line.receivedQty ?? agreed;
        return {
          ...item,
          current: round(item.current + received),
          incoming: round(Math.max(0, item.incoming - agreed)),
        };
      }),
    );

    updateProcurement(request.id, (current) => ({ ...current, status: "received" }));
    log(`${request.id}: delivery received using the actual received quantities. Procurement closed.`);
  }

  const tabCounts: Record<PrimaryTab, number> = {
    overview: urgent.length,
    stock: ingredients.length,
    recipes: recipes.length,
    orders: suggested.length + activeProcurements.length,
    activity: activity.length,
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.consoleHeader}>
          <div>
            <p className={styles.eyebrow}>
              <span className={styles.statusSquare} />
              Marinara / Owner operations / Preview
            </p>
            <div className={styles.titleRow}>
              <h1>Autoinventory-preview</h1>
              <span className={styles.previewPill}>SIMULATION</span>
            </div>
            <p className={styles.intro}>
              Stock, recipes and supplier communication in one compact workspace. Supplier and contact choices can be configured per stock item.
            </p>
          </div>
          <div className={styles.ownerPulse}>
            <CompanionMark className={styles.ownerCompanion} />
            <div>
              <span>JOURVIS</span>
              <strong>{urgent.length ? `${urgent.length} supplies need attention.` : "Inventory is inside the safe range."}</strong>
              <small>{urgent[0] ? `${urgent[0].name} is the highest-risk ingredient right now.` : "No supplier action is waiting."}</small>
            </div>
          </div>
        </header>

        <section className={styles.statusStrip} aria-label="Inventory summary">
          <div><span>Readiness</span><strong>{metrics.readiness}%</strong></div>
          <div><span>Critical</span><strong>{metrics.critical}</strong></div>
          <div><span>Low</span><strong>{metrics.low}</strong></div>
          <div><span>Confirmed incoming</span><strong>{metrics.incoming}</strong></div>
          <div className={styles.headerActions}>
            <a href="/restaurant/marinara-ristorante/Autoinventory-preview/configure"><Settings2 size={14} aria-hidden /> Configure stock</a>
            <a href="/restaurant/marinara-ristorante"><ArrowLeft size={14} aria-hidden /> Marinara</a>
            <button type="button" onClick={resetDemo}><RefreshCw size={14} aria-hidden /> Reset</button>
          </div>
        </section>

        <div className={styles.tabRail} role="tablist" aria-label="Autoinventory sections" onKeyDown={handleTabKeys}>
          {primaryTabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                id={`autoinventory-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`autoinventory-panel-${tab.id}`}
                tabIndex={active ? 0 : -1}
                className={`${styles.pixelTab} ${active ? styles.pixelTabActive : ""}`}
                onClick={() => switchTab(tab.id)}
              >
                <span className={styles.pixelGlyph} data-active={active} aria-hidden="true">
                  {Array.from({ length: 12 }).map((_, index) => <span key={index} />)}
                </span>
                <span className={styles.tabLabel}>{tab.label}</span>
                <small>{tabCounts[tab.id]}</small>
              </button>
            );
          })}
        </div>

        <main className={styles.workspace}>
          {activeTab === "overview" ? (
            <section id="autoinventory-panel-overview" role="tabpanel" aria-labelledby="autoinventory-tab-overview" className={styles.panel}>
              <div className={styles.summaryToolbar}>
                <div>
                  <span className={styles.summaryEyebrow}>SUPPLY BOARD</span>
                  <h2>Marinara inventory at a glance.</h2>
                  <p>Tile color shows stock condition. Pick any supply to inspect it on the right.</p>
                </div>

                <div className={styles.summaryControls}>
                  <div className={styles.summaryFilters} aria-label="Filter summary by storage area">
                    {stockFilters.map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        className={filter === stockFilter ? styles.summaryFilterActive : ""}
                        onClick={() => chooseFilter(filter)}
                      >
                        {filter === "Cold storage" ? "Cold" : filter === "Seafood freezer" ? "Seafood" : filter}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className={styles.labelSwitch}
                    role="switch"
                    aria-checked={showSummaryLabels}
                    onClick={() => {
                      setShowSummaryLabels((current) => {
                        const next = !current;
                        window.localStorage.setItem("jourvis-autoinventory-summary-labels", String(next));
                        return next;
                      });
                    }}
                  >
                    <span>Labels</span>
                    <i data-on={showSummaryLabels}><b /></i>
                    <strong>{showSummaryLabels ? "ON" : "OFF"}</strong>
                  </button>
                </div>
              </div>

              <div className={styles.summaryGameLayout}>
                <div className={styles.summaryInventoryPanel}>
                  <div className={styles.summaryGrid}>
                    {ingredients
                      .filter((item) => stockFilter === "All" || item.zone === stockFilter)
                      .map((item) => {
                        const itemTone = tone(item);
                        const itemPercent = percent(item);
                        const active = selected.id === item.id;
                        const procurement = procurementForItem(item.id);
                        const procurementLine = procurement?.lines.find((line) => line.itemId === item.id);

                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`${styles.summaryTile} ${summaryToneClass(itemTone, styles)} ${active ? styles.summaryTileSelected : ""}`}
                            onClick={() => setSelectedId(item.id)}
                            aria-pressed={active}
                            aria-label={`${item.name}, ${toneLabel(itemTone)}, ${itemPercent}% stock`}
                            title={item.name}
                          >
                            <span className={styles.summaryTileTop}>
                              <small>{toneLabel(itemTone)}</small>
                              <strong>{itemPercent}%</strong>
                            </span>

                            <StockIcon stockId={item.id} className={styles.summaryStockIcon} size={50} />

                            {procurement ? (
                              <span
                                className={styles.summaryProcurementBadge}
                                data-status={procurement.status}
                              >
                                {procurement.status === "confirmed" || procurement.status === "in_transit"
                                  ? `+${procurementLine?.agreedQty ?? procurementLine?.requestedQty ?? 0} ${item.unit} confirmed`
                                  : procurementStatusLabel(procurement.status)}
                              </span>
                            ) : null}

                            {showSummaryLabels ? (
                              <span className={styles.summaryTileLabel}>{item.name}</span>
                            ) : null}
                          </button>
                        );
                      })}
                  </div>

                  <div className={styles.summaryBoardFooter}>
                    <span>{ingredients.filter((item) => stockFilter === "All" || item.zone === stockFilter).length} supplies shown</span>
                    {urgent.length > 1 ? (
                      <button type="button" className={styles.primaryButton} onClick={() => openContact(urgent, "Group restock")}>
                        Group restock · {urgent.length}
                      </button>
                    ) : null}
                  </div>
                </div>

                <aside className={styles.summaryLegend}>
                  <div className={styles.summarySelectedHead}>
                    <StockIcon stockId={selected.id} className={styles.summaryLegendIcon} size={34} />
                    <div>
                      <span>SELECTED SUPPLY</span>
                      <h3>{selected.name}</h3>
                      <small>{selected.zone}</small>
                    </div>
                    <b className={`${styles.summaryStatePill} ${summaryToneClass(selectedTone, styles)}`}>
                      {toneLabel(selectedTone)}
                    </b>
                  </div>

                  <div className={styles.summaryStats}>
                    <div><span>On hand</span><strong>{selected.current} {selected.unit}</strong></div>
                    <div><span>Full level</span><strong>{selected.fullLevel} {selected.unit}</strong></div>
                    <div><span>Reorder at</span><strong>{selected.reorderAt} {selected.unit}</strong></div>
                    <div><span>Days cover</span><strong>{round(daysRemaining)} days</strong></div>
                    <div><span>Incoming</span><strong>{selected.incoming} {selected.unit}</strong></div>
                    <div><span>Stock level</span><strong>{percent(selected)}%</strong></div>
                  </div>

                  <div className={styles.summarySupplier}>
                    <span>SUPPLIER</span>
                    <strong>{selectedSupplier.name}</strong>
                    <small>{selectedContact.name} · {selectedContact.role}</small>
                    <small>{selectedContact.channel} · {selectedContact.email}</small>
                  </div>

                  <div className={styles.summaryAdvice}>
                    <CompanionMark className={styles.summaryCompanion} />
                    <div>
                      <span>JOURVIS</span>
                      <p>
                        {selectedProcurement
                          ? `${selectedProcurement.id}: ${procurementStatusLabel(selectedProcurement.status)}. Requested stock does not count as incoming until both sides confirm.`
                          : orderAmount > 0
                            ? `Suggested request: ${orderAmount} ${selected.unit}. You can change the quantity and contact before sending.`
                            : "Current and confirmed incoming stock cover the configured target."}
                      </p>
                    </div>
                  </div>

                  <div className={styles.summaryActions}>
                    {selectedProcurement ? (
                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() => setActiveTab("orders")}
                      >
                        <ChevronRight size={15} aria-hidden /> View purchase flow
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.primaryButton}
                        disabled={orderAmount <= 0}
                        onClick={() => openContact([selected], `Contact ${selectedSupplier.name}`)}
                      >
                        <Mail size={15} aria-hidden /> Contact supplier
                      </button>
                    )}
                    <a className={styles.secondaryButton} href={`/restaurant/marinara-ristorante/Autoinventory-preview/configure?stock=${selected.id}`}>
                      <Settings2 size={15} aria-hidden /> Configure
                    </a>
                  </div>

                  <div className={styles.statusLegend} aria-label="Stock status legend">
                    <span>LEVEL COLORS</span>
                    <div><i className={styles.legendReady} /><b>Ready</b><small>Above watch level</small></div>
                    <div><i className={styles.legendWatch} /><b>Watch</b><small>60% or lower</small></div>
                    <div><i className={styles.legendLow} /><b>Low</b><small>At reorder point</small></div>
                    <div><i className={styles.legendCritical} /><b>Critical</b><small>Well below reorder point</small></div>
                  </div>
                </aside>
              </div>
            </section>
          ) : null}

          {activeTab === "stock" ? (
            <section id="autoinventory-panel-stock" role="tabpanel" aria-labelledby="autoinventory-tab-stock" className={styles.panel}>
              <div className={styles.stockToolbar}>
                <div className={styles.filterRow} aria-label="Filter inventory by storage area">
                  {stockFilters.map((filter) => <button key={filter} type="button" className={filter === stockFilter ? styles.filterActive : ""} onClick={() => chooseFilter(filter)}>{filter}</button>)}
                </div>
                <label className={styles.searchBox}><Search size={15} aria-hidden /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search stock, supplier or contact" /></label>
              </div>

              <div className={styles.stockLayout}>
                <div className={styles.stockList}>
                  <div className={styles.stockHeader}><span>Supply</span><span>Level</span><span>On hand</span><span>Coverage</span><span>Status</span><span /></div>
                  {filteredIngredients.map((item) => {
                    const contact = getContact(item);
                    return (
                      <button key={item.id} type="button" className={selected.id === item.id ? styles.stockRowSelected : ""} onClick={() => setSelectedId(item.id)}>
                        <span className={styles.inventoryName}><StockIcon stockId={item.id} className={styles.stockIcon} /><span><strong>{item.name}</strong><small>{item.zone} · {contact.name}</small></span></span>
                        <span className={styles.rowBattery}><i className={toneClassName(tone(item), styles)} style={{ width: `${percent(item)}%` }} /></span>
                        <span>{item.current} / {item.fullLevel} {item.unit}</span>
                        <span>{round(item.current / item.dailyUse)} days</span>
                        <span className={`${styles.statusBadge} ${toneClassName(tone(item), styles)}`}>{toneLabel(tone(item))}</span>
                        <ChevronRight size={15} aria-hidden />
                      </button>
                    );
                  })}
                </div>

                <aside className={styles.detailPanel}>
                  <div className={styles.detailHeading}>
                    <div className={styles.detailTitleWithIcon}><StockIcon stockId={selected.id} className={styles.detailStockIcon} size={28} /><div><span>SELECTED SUPPLY</span><h2>{selected.name}</h2></div></div>
                    <span className={`${styles.statusBadge} ${toneClassName(selectedTone, styles)}`}>{toneLabel(selectedTone)}</span>
                  </div>

                  <div className={styles.detailBattery}><i className={toneClassName(selectedTone, styles)} style={{ width: `${percent(selected)}%` }} /></div>
                  <div className={styles.detailBatteryLabels}><span>{selected.current} {selected.unit} current</span><strong>{percent(selected)}%</strong><span>{selected.fullLevel} {selected.unit} = 100%</span></div>
                  <div className={styles.thresholdLine}><span style={{ left: `${Math.min(100, Math.round((selected.reorderAt / selected.fullLevel) * 100))}%` }} /><small>Reorder at {selected.reorderAt} {selected.unit}</small></div>

                  <div className={styles.factGrid}>
                    <div><span>On hand</span><strong>{selected.current} {selected.unit}</strong></div>
                    <div><span>Full level</span><strong>{selected.fullLevel} {selected.unit}</strong></div>
                    <div><span>Reorder at</span><strong>{selected.reorderAt} {selected.unit}</strong></div>
                    <div><span>Days cover</span><strong>{round(daysRemaining)} days</strong></div>
                    <div><span>Incoming</span><strong>{selected.incoming} {selected.unit}</strong></div>
                    <div><span>After delivery</span><strong>{projectedPercent(selected, selected.incoming)}%</strong></div>
                  </div>

                  <div className={styles.contactCard}>
                    <div><span>SUPPLIER CONTACT</span><strong>{selectedContact.name}</strong><small>{selectedContact.role}</small></div>
                    <div><span>{selectedSupplier.name}</span><small>{selectedContact.channel} · {selectedContact.email}</small><small>{selectedContact.phone}</small></div>
                  </div>

                  <div className={styles.recommendation}>
                    <Sparkles size={17} aria-hidden />
                    <div><span>JOURVIS</span><p>{orderAmount > 0 ? `Suggested: ${orderAmount} ${selected.unit}. Based on ${selected.fullLevel} ${selected.unit} full level, ${selected.leadDays}-day lead time and expected usage.` : "Current and incoming stock cover the configured full level."}</p></div>
                  </div>

                  <div className={styles.detailActions}>
                    <button type="button" className={styles.primaryButton} disabled={orderAmount <= 0} onClick={() => openContact([selected], `Contact ${selectedSupplier.name}`)}><Mail size={16} aria-hidden /> Contact supplier</button>
                    <button type="button" className={styles.secondaryButton} disabled={selected.incoming <= 0} onClick={() => receive(selected)}><PackageCheck size={16} aria-hidden /> Receive delivery</button>
                    <a className={styles.textAction} href={`/restaurant/marinara-ristorante/Autoinventory-preview/configure?stock=${selected.id}`}><Settings2 size={15} aria-hidden /> Configure stock</a>
                    <button type="button" className={styles.textAction} onClick={() => recordWaste(selected)}><TriangleAlert size={15} aria-hidden /> Record demo waste</button>
                  </div>

                  <div className={styles.usedBy}><span>USED BY</span>{affectedRecipes.map((recipe) => <div key={recipe.id}><strong>{recipe.name}</strong><small>{recipe.ingredients[selected.id]} {selected.unit} / serving</small></div>)}</div>
                </aside>
              </div>
            </section>
          ) : null}

          {activeTab === "recipes" ? (
            <section id="autoinventory-panel-recipes" role="tabpanel" aria-labelledby="autoinventory-tab-recipes" className={styles.panel}>
              <div className={styles.sectionHeading}><div><span>RECIPE-DRIVEN STOCK</span><h2>What every dish consumes.</h2></div><p>Simulate a sale to see the raw-material batteries move.</p></div>
              <div className={styles.recipeGrid}>
                {recipes.map((recipe) => {
                  const possible = Math.floor(Math.min(...Object.entries(recipe.ingredients).map(([id, amount]) => { const item = ingredients.find((ingredient) => ingredient.id === id); return item ? item.current / amount : 0; })));
                  return (
                    <article key={recipe.id} className={styles.recipeCard}>
                      <div className={styles.recipeTitle}><ChefHat size={20} aria-hidden /><div><h3>{recipe.name}</h3><p>{recipe.description}</p></div></div>
                      <div className={styles.recipeMeta}><span>Possible now</span><strong>{possible} servings</strong></div>
                      <div className={styles.recipeIngredients}>{Object.entries(recipe.ingredients).map(([id, amount]) => { const item = ingredients.find((ingredient) => ingredient.id === id); return item ? <span key={id}>{item.name}<b>{amount} {item.unit}</b></span> : null; })}</div>
                      <button type="button" className={styles.secondaryButton} onClick={() => sellRecipe(recipe)}><ShoppingCart size={15} aria-hidden /> Simulate 1 sale</button>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {activeTab === "orders" ? (
            <section id="autoinventory-panel-orders" role="tabpanel" aria-labelledby="autoinventory-tab-orders" className={styles.panel}>
              <div className={styles.sectionHeading}>
                <div><span>SUPPLIER FLOW</span><h2>Contact, confirm, receive.</h2></div>
                {suggested.length ? <button type="button" className={styles.primaryButton} onClick={() => openContact(suggested, "Group restock")}>Group restock · {suggested.length}</button> : null}
              </div>

              <div className={styles.orderColumns}>
                <div>
                  <div className={styles.orderColumnTitle}><span>NEEDS ACTION</span><strong>{suggested.length}</strong></div>
                  {supplierGroups.length ? supplierGroups.map((items) => {
                    const first = items[0];
                    const supplier = getSupplier(first);
                    const contact = getContact(first);
                    const total = items.reduce((sum, item) => sum + Math.ceil(suggestedOrder(item) / item.packSize) * item.packPrice, 0);
                    return (
                      <article className={styles.supplierGroup} key={supplier.id}>
                        <div className={styles.supplierGroupHead}><div><span>{supplier.name}</span><strong>{contact.name}</strong><small>{contact.role} · {contact.channel}</small></div><b>{formatMoney(total)}</b></div>
                        {items.map((item) => <div className={styles.orderItem} key={item.id}><span className={styles.orderItemName}><StockIcon stockId={item.id} className={styles.stockIconSmall} size={18} /><span><strong>{item.name}</strong><small>{item.current}/{item.fullLevel} {item.unit} · reorder at {item.reorderAt}</small></span></span><b>{suggestedOrder(item)} {item.unit}</b></div>)}
                        <button type="button" className={styles.secondaryButton} onClick={() => openContact(items, `Contact ${supplier.name}`)}><Mail size={15} aria-hidden /> Contact supplier</button>
                      </article>
                    );
                  }) : <div className={styles.emptyState}><Check size={18} aria-hidden /> No supplier contact is needed.</div>}
                </div>

                <div>
                  <div className={styles.orderColumnTitle}><span>INCOMING</span><strong>{incoming.length}</strong></div>
                  {incoming.length ? incoming.map((item) => {
                    const supplier = getSupplier(item);
                    const contact = getContact(item);
                    return (
                      <article className={styles.incomingCard} key={item.id}>
                        <div><span>{supplier.name}</span><h3>{item.name}</h3><p>{item.incoming} {item.unit} incoming · contact {contact.name}</p></div>
                        <div className={styles.projectedRow}><span>Current {percent(item)}%</span><ChevronRight size={14} aria-hidden /><strong>After delivery {Math.min(100, Math.round(((item.current + item.incoming) / item.fullLevel) * 100))}%</strong></div>
                        <button type="button" className={styles.primaryButton} onClick={() => receive(item)}><PackageCheck size={15} aria-hidden /> Receive delivery</button>
                      </article>
                    );
                  }) : <div className={styles.emptyState}><Truck size={18} aria-hidden /> No deliveries are waiting.</div>}
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === "activity" ? (
            <section id="autoinventory-panel-activity" role="tabpanel" aria-labelledby="autoinventory-tab-activity" className={styles.panel}>
              <div className={styles.sectionHeading}><div><span>AUDIT TRAIL</span><h2>What changed, in order.</h2></div><p>Preview activity only. Nothing here is written to the database.</p></div>
              <div className={styles.activityList}>{activity.map((entry, index) => <div key={`${entry}-${index}`}><span>{index === 0 ? "NOW" : `${index + 1}`}</span><p>{entry}</p></div>)}</div>
            </section>
          ) : null}
        </main>

        <div className={styles.previewNotice}><TriangleAlert size={16} aria-hidden /><p><strong>Preview only.</strong> Supplier names, contacts, prices, stock levels and recipes are demo data. Contact Supplier simulates the request and adds the chosen quantity to incoming stock; no real email, SMS, database, purchasing or accounting action occurs.</p></div>
      </div>

      {contactDraft ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setContactDraft(null); }}>
          <section className={styles.contactModal} role="dialog" aria-modal="true" aria-labelledby="contact-modal-title">
            <div className={styles.modalHeader}>
              <div><span>SUPPLIER REQUEST</span><h2 id="contact-modal-title">{contactDraft.title}</h2><p>Change the contact person and requested quantity before sending.</p></div>
              <button type="button" onClick={() => setContactDraft(null)} aria-label="Close supplier request"><X size={19} aria-hidden /></button>
            </div>

            <div className={styles.modalBody}>
              {supplierGroupsForItems(ingredients.filter((item) => contactDraft.itemIds.includes(item.id))).map((items) => {
                const first = items[0];
                const supplier = getSupplier(first);
                const selectedContactId = contactDraft.contactBySupplier[supplier.id] ?? first.contactId;
                const contact = supplier.contacts.find((candidate) => candidate.id === selectedContactId) ?? supplier.contacts[0];
                return (
                  <div className={styles.modalSupplier} key={supplier.id}>
                    <div className={styles.modalSupplierHead}>
                      <div><span>{supplier.name}</span><strong>{contact.name}</strong><small>{contact.role}</small></div>
                      <div>
                        <span>CONTACT PERSON</span>
                        <select
                          value={selectedContactId}
                          onChange={(event) => changeDraftContact(supplier.id, event.target.value)}
                          aria-label={`Contact person for ${supplier.name}`}
                          style={{ marginTop: 6, minWidth: 210, minHeight: 38, padding: "6px 30px 6px 9px", background: "#08141f", color: "#f7f4ee", border: "1px solid #2a3a44" }}
                        >
                          {supplier.contacts.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.role}</option>)}
                        </select>
                        <small>{contact.channel} · {contact.email}</small><small>{contact.phone}</small>
                      </div>
                    </div>
                    {items.map((item) => {
                      const quantity = contactDraft.quantities[item.id] ?? 0;
                      const packs = item.packSize > 0 ? quantity / item.packSize : 0;
                      const estimatedCost = Math.ceil(packs) * item.packPrice;
                      return (
                        <div className={styles.requestItem} key={item.id}>
                          <div className={styles.requestItemTitle}><div className={styles.requestItemName}><StockIcon stockId={item.id} className={styles.stockIconSmall} size={18} /><div><strong>{item.name}</strong><small>Jourvis suggests {suggestedOrder(item)} {item.unit} · {item.purchaseUnit}</small></div></div><span>After delivery ~{Math.min(100, Math.round(((item.current + item.incoming + quantity) / item.fullLevel) * 100))}%</span></div>
                          <div className={styles.quantityEditor}>
                            <button type="button" onClick={() => changeDraftQuantity(item, quantity - item.packSize)} aria-label={`Decrease ${item.name} quantity`}>−</button>
                            <label><span>Quantity to request</span><div><input type="number" min="0" step={item.packSize} value={quantity} onChange={(event) => changeDraftQuantity(item, Number(event.target.value) || 0)} /><b>{item.unit}</b></div></label>
                            <button type="button" onClick={() => changeDraftQuantity(item, quantity + item.packSize)} aria-label={`Increase ${item.name} quantity`}>+</button>
                          </div>
                          <div className={styles.requestMeta}><span>{quantity > 0 ? `${round(quantity / item.packSize)} purchase unit${quantity / item.packSize === 1 ? "" : "s"}` : "Not included"}</span><strong>{quantity > 0 ? formatMoney(estimatedCost) : "—"}</strong></div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className={styles.modalFooter}><button type="button" className={styles.secondaryButton} onClick={() => setContactDraft(null)}>Cancel</button><button type="button" className={styles.primaryButton} onClick={sendContactRequests}><Mail size={16} aria-hidden /> Send demo request{supplierGroupsForItems(ingredients.filter((item) => contactDraft.itemIds.includes(item.id))).length > 1 ? "s" : ""}</button></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function toneClassName(value: Tone, css: typeof styles) {
  if (value === "critical") return css.critical;
  if (value === "low") return css.low;
  if (value === "watch") return css.watch;
  return css.good;
}

function summaryToneClass(value: Tone, css: typeof styles) {
  if (value === "critical") return css.summaryTileCritical;
  if (value === "low") return css.summaryTileLow;
  if (value === "watch") return css.summaryTileWatch;
  return css.summaryTileReady;
}
