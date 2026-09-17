"use client";

import {
  type KeyboardEvent,
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
import styles from "./autoinventory-preview.module.css";

type Zone = "Pantry" | "Cold storage" | "Seafood freezer" | "Produce";
type Tone = "good" | "watch" | "low" | "critical";
type PrimaryTab = "overview" | "stock" | "recipes" | "orders" | "activity";
type StockFilter = "All" | Zone;

type SupplierContact = {
  name: string;
  role: string;
  email: string;
  phone: string;
  channel: "Email" | "SMS";
};

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  current: number;
  fullLevel: number;
  reorderAt: number;
  dailyUse: number;
  incoming: number;
  supplier: string;
  supplierContact: SupplierContact;
  packSize: number;
  packPrice: number;
  purchaseUnit: string;
  leadDays: number;
  zone: Zone;
};

type Recipe = {
  id: string;
  name: string;
  description: string;
  ingredients: Record<string, number>;
};

type ContactDraft = {
  itemIds: string[];
  quantities: Record<string, number>;
  title: string;
};

const contacts = {
  seafood: {
    name: "Maria Santos",
    role: "Sales contact",
    email: "maria@davaofresh.example",
    phone: "+63 917 555 0142",
    channel: "Email" as const,
  },
  pantry: {
    name: "Paolo Reyes",
    role: "Wholesale account",
    email: "paolo@davaoprovisions.example",
    phone: "+63 917 555 0198",
    channel: "Email" as const,
  },
  rosso: {
    name: "Lia Cruz",
    role: "Orders desk",
    email: "lia@casarosso.example",
    phone: "+63 917 555 0181",
    channel: "Email" as const,
  },
  italian: {
    name: "Marco Dela Torre",
    role: "Account manager",
    email: "marco@italianpantry.example",
    phone: "+63 917 555 0130",
    channel: "Email" as const,
  },
  dairy: {
    name: "Anne Lim",
    role: "Sales contact",
    email: "anne@davaodairy.example",
    phone: "+63 917 555 0116",
    channel: "SMS" as const,
  },
  produce: {
    name: "Mika Villanueva",
    role: "Produce orders",
    email: "mika@greenbasket.example",
    phone: "+63 917 555 0164",
    channel: "SMS" as const,
  },
};

const initialIngredients: Ingredient[] = [
  { id: "pasta", name: "Pasta", unit: "kg", current: 10.2, fullLevel: 12, reorderAt: 4, dailyUse: 1.7, incoming: 0, supplier: "Davao Pasta & Provisions", supplierContact: contacts.pantry, packSize: 5, packPrice: 860, purchaseUnit: "5 kg case", leadDays: 1, zone: "Pantry" },
  { id: "tomato", name: "Tomato sauce", unit: "L", current: 7.4, fullLevel: 10, reorderAt: 3, dailyUse: 1.45, incoming: 0, supplier: "Casa Rosso Foods", supplierContact: contacts.rosso, packSize: 4, packPrice: 980, purchaseUnit: "4 L case", leadDays: 1, zone: "Pantry" },
  { id: "olive-oil", name: "Olive oil", unit: "L", current: 4.5, fullLevel: 5, reorderAt: 1.5, dailyUse: 0.38, incoming: 0, supplier: "Casa Rosso Foods", supplierContact: contacts.rosso, packSize: 2, packPrice: 1220, purchaseUnit: "2 L case", leadDays: 2, zone: "Pantry" },
  { id: "flour", name: "Pizza flour", unit: "kg", current: 13, fullLevel: 15, reorderAt: 5, dailyUse: 2.1, incoming: 0, supplier: "Davao Pasta & Provisions", supplierContact: contacts.pantry, packSize: 10, packPrice: 760, purchaseUnit: "10 kg sack", leadDays: 1, zone: "Pantry" },
  { id: "parmesan", name: "Parmigiano", unit: "kg", current: 1.45, fullLevel: 5, reorderAt: 2, dailyUse: 0.62, incoming: 0, supplier: "Italian Pantry Davao", supplierContact: contacts.italian, packSize: 2, packPrice: 2380, purchaseUnit: "2 kg wheel", leadDays: 2, zone: "Cold storage" },
  { id: "mozzarella", name: "Mozzarella", unit: "kg", current: 6.1, fullLevel: 8, reorderAt: 3, dailyUse: 1.15, incoming: 0, supplier: "Italian Pantry Davao", supplierContact: contacts.italian, packSize: 3, packPrice: 1650, purchaseUnit: "3 kg case", leadDays: 1, zone: "Cold storage" },
  { id: "cream", name: "Cooking cream", unit: "L", current: 2.25, fullLevel: 5, reorderAt: 2, dailyUse: 0.72, incoming: 0, supplier: "Davao Dairy Supply", supplierContact: contacts.dairy, packSize: 2, packPrice: 720, purchaseUnit: "2 L case", leadDays: 1, zone: "Cold storage" },
  { id: "shrimp", name: "Shrimp", unit: "kg", current: 2.2, fullLevel: 10, reorderAt: 3, dailyUse: 1.95, incoming: 0, supplier: "Davao Fresh Seafood", supplierContact: contacts.seafood, packSize: 5, packPrice: 2800, purchaseUnit: "5 kg pack", leadDays: 1, zone: "Seafood freezer" },
  { id: "salmon", name: "Salmon", unit: "kg", current: 4.9, fullLevel: 8, reorderAt: 3, dailyUse: 1.05, incoming: 0, supplier: "Davao Fresh Seafood", supplierContact: contacts.seafood, packSize: 4, packPrice: 3440, purchaseUnit: "4 kg case", leadDays: 1, zone: "Seafood freezer" },
  { id: "squid", name: "Squid", unit: "kg", current: 1.7, fullLevel: 6, reorderAt: 2.2, dailyUse: 1, incoming: 0, supplier: "Davao Fresh Seafood", supplierContact: contacts.seafood, packSize: 3, packPrice: 1380, purchaseUnit: "3 kg pack", leadDays: 1, zone: "Seafood freezer" },
  { id: "basil", name: "Fresh basil", unit: "kg", current: 0.48, fullLevel: 2, reorderAt: 0.7, dailyUse: 0.31, incoming: 0, supplier: "Green Basket Produce", supplierContact: contacts.produce, packSize: 1, packPrice: 410, purchaseUnit: "1 kg bundle", leadDays: 0.5, zone: "Produce" },
  { id: "mushroom", name: "Mushrooms", unit: "kg", current: 2.8, fullLevel: 5, reorderAt: 1.8, dailyUse: 0.74, incoming: 0, supplier: "Green Basket Produce", supplierContact: contacts.produce, packSize: 2, packPrice: 540, purchaseUnit: "2 kg crate", leadDays: 0.5, zone: "Produce" },
];

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
  { id: "overview", label: "Overview" },
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

function toneClass(value: Tone) {
  if (value === "critical") return styles.critical;
  if (value === "low") return styles.low;
  if (value === "watch") return styles.watch;
  return styles.good;
}

function contactKey(item: Ingredient) {
  return `${item.supplier}::${item.supplierContact.email}`;
}

export default function MarinaraAutoinventoryPreviewPage() {
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [selectedId, setSelectedId] = useState("shrimp");
  const [activeTab, setActiveTab] = useState<PrimaryTab>("overview");
  const [stockFilter, setStockFilter] = useState<StockFilter>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contactDraft, setContactDraft] = useState<ContactDraft | null>(null);
  const [activity, setActivity] = useState([
    "Jourvis finished the morning inventory scan.",
    "42 guests are forecast for tonight's dinner service.",
  ]);

  const selected = ingredients.find((item) => item.id === selectedId) ?? ingredients[0];
  const selectedTone = tone(selected);

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
  const suggested = useMemo(
    () => ingredients.filter((item) => item.current <= item.reorderAt && suggestedOrder(item) > 0),
    [ingredients],
  );
  const incoming = useMemo(() => ingredients.filter((item) => item.incoming > 0), [ingredients]);

  const filteredIngredients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return ingredients.filter((item) => {
      const matchesZone = stockFilter === "All" || item.zone === stockFilter;
      const matchesSearch = !query || `${item.name} ${item.supplier} ${item.supplierContact.name}`.toLowerCase().includes(query);
      return matchesZone && matchesSearch;
    });
  }, [ingredients, searchTerm, stockFilter]);

  const affectedRecipes = recipes.filter((recipe) => selected.id in recipe.ingredients);
  const daysRemaining = selected.dailyUse > 0 ? selected.current / selected.dailyUse : 99;
  const orderAmount = suggestedOrder(selected);
  const orderCost = Math.ceil(orderAmount / selected.packSize) * selected.packPrice;

  const supplierGroups = useMemo(() => {
    const grouped = new Map<string, Ingredient[]>();
    suggested.forEach((item) => {
      const key = contactKey(item);
      const list = grouped.get(key) ?? [];
      list.push(item);
      grouped.set(key, list);
    });
    return [...grouped.values()];
  }, [suggested]);

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
    setIngredients(initialIngredients);
    setSelectedId("shrimp");
    setActiveTab("overview");
    setStockFilter("All");
    setSearchTerm("");
    setSettingsOpen(false);
    setContactDraft(null);
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
    setContactDraft({ itemIds: items.map((item) => item.id), quantities, title });
  }

  function changeDraftQuantity(item: Ingredient, next: number) {
    if (!contactDraft) return;
    const normalized = Math.max(0, round(next));
    setContactDraft({
      ...contactDraft,
      quantities: { ...contactDraft.quantities, [item.id]: normalized },
    });
  }

  function sendContactRequests() {
    if (!contactDraft) return;
    const draftItems = ingredients.filter((item) => contactDraft.itemIds.includes(item.id));
    const grouped = new Map<string, Ingredient[]>();
    draftItems.forEach((item) => {
      const qty = contactDraft.quantities[item.id] ?? 0;
      if (qty <= 0) return;
      const key = contactKey(item);
      const list = grouped.get(key) ?? [];
      list.push(item);
      grouped.set(key, list);
    });

    if (!grouped.size) {
      log("No supplier request was sent because every requested quantity is zero.");
      setContactDraft(null);
      return;
    }

    setIngredients((current) =>
      current.map((item) => {
        const qty = contactDraft.quantities[item.id] ?? 0;
        return qty > 0 ? { ...item, incoming: round(item.incoming + qty) } : item;
      }),
    );

    grouped.forEach((items) => {
      const first = items[0];
      const summary = items
        .map((item) => `${item.name} ${contactDraft.quantities[item.id]} ${item.unit}`)
        .join(", ");
      log(`Demo supplier request sent to ${first.supplierContact.name} at ${first.supplier}: ${summary}.`);
    });
    setContactDraft(null);
    setActiveTab("orders");
  }

  const tabCounts: Record<PrimaryTab, number> = {
    overview: urgent.length,
    stock: ingredients.length,
    recipes: recipes.length,
    orders: suggested.length + incoming.length,
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
              Stock, recipes and supplier communication in one compact workspace. Full levels, reorder points and actual request quantities can be changed per product.
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
          <div><span>Incoming</span><strong>{metrics.incoming}</strong></div>
          <div className={styles.headerActions}>
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
              <div className={styles.overviewGrid}>
                <div className={styles.attentionCard}>
                  <div className={styles.panelTitle}>
                    <div><span>WHAT NEEDS ATTENTION</span><h2>Today&apos;s stock pulse</h2></div>
                    {urgent.length > 1 ? (
                      <button type="button" className={styles.primaryButton} onClick={() => openContact(urgent, "Group restock")}>Group restock</button>
                    ) : null}
                  </div>
                  <div className={styles.urgentList}>
                    {urgent.length ? urgent.map((item) => (
                      <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setActiveTab("stock"); }}>
                        <span className={`${styles.statusDot} ${toneClass(tone(item))}`} />
                        <span><strong>{item.name}</strong><small>{item.current} / {item.fullLevel} {item.unit} · reorder at {item.reorderAt} {item.unit}</small></span>
                        <span className={styles.miniBattery}><i className={toneClass(tone(item))} style={{ width: `${percent(item)}%` }} /></span>
                        <b>{percent(item)}%</b>
                        <ChevronRight size={16} aria-hidden />
                      </button>
                    )) : (
                      <div className={styles.emptyState}><Check size={18} aria-hidden /> No supplier action is needed right now.</div>
                    )}
                  </div>
                </div>

                <aside className={styles.jourvisCard}>
                  <CompanionMark className={styles.cardCompanion} />
                  <div>
                    <span>JOURVIS SUGGESTS</span>
                    {urgent[0] ? (
                      <>
                        <h3>Contact {urgent[0].supplierContact.name} about {urgent[0].name}.</h3>
                        <p>I estimate {suggestedOrder(urgent[0])} {urgent[0].unit} would cover the configured full level after expected usage before delivery. You can change the quantity before anything is sent.</p>
                        <button type="button" className={styles.primaryButton} onClick={() => openContact([urgent[0]], `Contact ${urgent[0].supplier}`)}>Contact supplier</button>
                      </>
                    ) : <p>No restock recommendation is waiting.</p>}
                  </div>
                </aside>
              </div>

              <div className={styles.zoneTiles}>
                {zoneOrder.map((zone) => {
                  const items = ingredients.filter((item) => item.zone === zone);
                  const level = Math.round(items.reduce((sum, item) => sum + percent(item), 0) / items.length);
                  return (
                    <button key={zone} type="button" onClick={() => { chooseFilter(zone); setActiveTab("stock"); }}>
                      <div className={styles.zonePixelGrid} aria-hidden="true">
                        {Array.from({ length: 20 }).map((_, index) => <span key={index} className={index < Math.round(level / 5) ? styles.zonePixelOn : ""} />)}
                      </div>
                      <span>{zone}</span><strong>{level}%</strong><small>{items.length} supplies</small>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {activeTab === "stock" ? (
            <section id="autoinventory-panel-stock" role="tabpanel" aria-labelledby="autoinventory-tab-stock" className={styles.panel}>
              <div className={styles.stockToolbar}>
                <div className={styles.filterRow} aria-label="Filter inventory by storage area">
                  {stockFilters.map((filter) => (
                    <button key={filter} type="button" className={filter === stockFilter ? styles.filterActive : ""} onClick={() => chooseFilter(filter)}>{filter}</button>
                  ))}
                </div>
                <label className={styles.searchBox}><Search size={15} aria-hidden /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search stock or supplier" /></label>
              </div>

              <div className={styles.stockLayout}>
                <div className={styles.stockList}>
                  <div className={styles.stockHeader}><span>Supply</span><span>Level</span><span>On hand</span><span>Coverage</span><span>Status</span><span /></div>
                  {filteredIngredients.map((item) => (
                    <button key={item.id} type="button" className={selected.id === item.id ? styles.stockRowSelected : ""} onClick={() => setSelectedId(item.id)}>
                      <span className={styles.inventoryName}><strong>{item.name}</strong><small>{item.zone} · {item.supplierContact.name}</small></span>
                      <span className={styles.rowBattery}><i className={toneClass(tone(item))} style={{ width: `${percent(item)}%` }} /></span>
                      <span>{item.current} / {item.fullLevel} {item.unit}</span>
                      <span>{round(item.current / item.dailyUse)} days</span>
                      <span className={`${styles.statusBadge} ${toneClass(tone(item))}`}>{toneLabel(tone(item))}</span>
                      <ChevronRight size={15} aria-hidden />
                    </button>
                  ))}
                </div>

                <aside className={styles.detailPanel}>
                  <div className={styles.detailHeading}>
                    <div><span>SELECTED SUPPLY</span><h2>{selected.name}</h2></div>
                    <span className={`${styles.statusBadge} ${toneClass(selectedTone)}`}>{toneLabel(selectedTone)}</span>
                  </div>

                  <div className={styles.detailBattery}><i className={toneClass(selectedTone)} style={{ width: `${percent(selected)}%` }} /></div>
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
                    <div><span>SUPPLIER CONTACT</span><strong>{selected.supplierContact.name}</strong><small>{selected.supplierContact.role}</small></div>
                    <div><span>{selected.supplier}</span><small>{selected.supplierContact.channel} · {selected.supplierContact.email}</small><small>{selected.supplierContact.phone}</small></div>
                  </div>

                  <div className={styles.recommendation}>
                    <Sparkles size={17} aria-hidden />
                    <div><span>JOURVIS</span><p>{orderAmount > 0 ? `Suggested: ${orderAmount} ${selected.unit}. Based on ${selected.fullLevel} ${selected.unit} full level, ${selected.leadDays}-day lead time and expected usage.` : "Current and incoming stock cover the configured full level."}</p></div>
                  </div>

                  <div className={styles.detailActions}>
                    <button type="button" className={styles.primaryButton} disabled={orderAmount <= 0} onClick={() => openContact([selected], `Contact ${selected.supplier}`)}><Mail size={16} aria-hidden /> Contact supplier</button>
                    <button type="button" className={styles.secondaryButton} disabled={selected.incoming <= 0} onClick={() => receive(selected)}><PackageCheck size={16} aria-hidden /> Receive delivery</button>
                    <button type="button" className={styles.textAction} onClick={() => setSettingsOpen((value) => !value)}><Settings2 size={15} aria-hidden /> Stock settings</button>
                    <button type="button" className={styles.textAction} onClick={() => recordWaste(selected)}><TriangleAlert size={15} aria-hidden /> Record demo waste</button>
                  </div>

                  {settingsOpen ? (
                    <div className={styles.settingsPanel}>
                      <div className={styles.settingsTitle}><div><span>STOCK SETTINGS</span><strong>{selected.name}</strong></div><button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close stock settings"><X size={16} aria-hidden /></button></div>
                      <label><span>Full level / 100%</span><div><input type="number" min="0.01" step="0.1" value={selected.fullLevel} onChange={(event) => { const value = Math.max(0.01, Number(event.target.value) || 0.01); updateIngredient(selected.id, (item) => ({ ...item, fullLevel: value, reorderAt: Math.min(item.reorderAt, value) })); }} /><b>{selected.unit}</b></div><small>This quantity fills the battery to 100%.</small></label>
                      <label><span>Reorder at</span><div><input type="number" min="0" max={selected.fullLevel} step="0.1" value={selected.reorderAt} onChange={(event) => { const value = Math.max(0, Math.min(selected.fullLevel, Number(event.target.value) || 0)); updateIngredient(selected.id, (item) => ({ ...item, reorderAt: value })); }} /><b>{selected.unit}</b></div><small>Jourvis starts recommending supplier action at this level.</small></label>
                      <div className={styles.settingReadout}><span>Purchase unit</span><strong>{selected.purchaseUnit}</strong><small>{formatMoney(selected.packPrice)} · {selected.leadDays} day lead time</small></div>
                    </div>
                  ) : null}

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
                    const total = items.reduce((sum, item) => sum + Math.ceil(suggestedOrder(item) / item.packSize) * item.packPrice, 0);
                    return (
                      <article className={styles.supplierGroup} key={contactKey(first)}>
                        <div className={styles.supplierGroupHead}><div><span>{first.supplier}</span><strong>{first.supplierContact.name}</strong><small>{first.supplierContact.role} · {first.supplierContact.channel}</small></div><b>{formatMoney(total)}</b></div>
                        {items.map((item) => <div className={styles.orderItem} key={item.id}><span><strong>{item.name}</strong><small>{item.current}/{item.fullLevel} {item.unit} · reorder at {item.reorderAt}</small></span><b>{suggestedOrder(item)} {item.unit}</b></div>)}
                        <button type="button" className={styles.secondaryButton} onClick={() => openContact(items, `Contact ${first.supplier}`)}><Mail size={15} aria-hidden /> Contact supplier</button>
                      </article>
                    );
                  }) : <div className={styles.emptyState}><Check size={18} aria-hidden /> No supplier contact is needed.</div>}
                </div>

                <div>
                  <div className={styles.orderColumnTitle}><span>INCOMING</span><strong>{incoming.length}</strong></div>
                  {incoming.length ? incoming.map((item) => (
                    <article className={styles.incomingCard} key={item.id}>
                      <div><span>{item.supplier}</span><h3>{item.name}</h3><p>{item.incoming} {item.unit} incoming · contact {item.supplierContact.name}</p></div>
                      <div className={styles.projectedRow}><span>Current {percent(item)}%</span><ChevronRight size={14} aria-hidden /><strong>After delivery {Math.min(100, Math.round(((item.current + item.incoming) / item.fullLevel) * 100))}%</strong></div>
                      <button type="button" className={styles.primaryButton} onClick={() => receive(item)}><PackageCheck size={15} aria-hidden /> Receive delivery</button>
                    </article>
                  )) : <div className={styles.emptyState}><Truck size={18} aria-hidden /> No deliveries are waiting.</div>}
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
              <div><span>SUPPLIER REQUEST</span><h2 id="contact-modal-title">{contactDraft.title}</h2><p>Jourvis suggested the starting quantities. Change any amount before sending.</p></div>
              <button type="button" onClick={() => setContactDraft(null)} aria-label="Close supplier request"><X size={19} aria-hidden /></button>
            </div>

            <div className={styles.modalBody}>
              {supplierGroupsForDraft(ingredients, contactDraft).map((items) => {
                const first = items[0];
                return (
                  <div className={styles.modalSupplier} key={contactKey(first)}>
                    <div className={styles.modalSupplierHead}>
                      <div><span>{first.supplier}</span><strong>{first.supplierContact.name}</strong><small>{first.supplierContact.role}</small></div>
                      <div><span>{first.supplierContact.channel}</span><small>{first.supplierContact.email}</small><small>{first.supplierContact.phone}</small></div>
                    </div>
                    {items.map((item) => {
                      const quantity = contactDraft.quantities[item.id] ?? 0;
                      const packs = item.packSize > 0 ? quantity / item.packSize : 0;
                      const estimatedCost = Math.ceil(packs) * item.packPrice;
                      return (
                        <div className={styles.requestItem} key={item.id}>
                          <div className={styles.requestItemTitle}><div><strong>{item.name}</strong><small>Jourvis suggests {suggestedOrder(item)} {item.unit} · {item.purchaseUnit}</small></div><span>After delivery ~{Math.min(100, Math.round(((item.current + item.incoming + quantity) / item.fullLevel) * 100))}%</span></div>
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

            <div className={styles.modalFooter}><button type="button" className={styles.secondaryButton} onClick={() => setContactDraft(null)}>Cancel</button><button type="button" className={styles.primaryButton} onClick={sendContactRequests}><Mail size={16} aria-hidden /> Send demo request{supplierGroupsForDraft(ingredients, contactDraft).length > 1 ? "s" : ""}</button></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function supplierGroupsForDraft(ingredients: Ingredient[], draft: ContactDraft) {
  const grouped = new Map<string, Ingredient[]>();
  ingredients.filter((item) => draft.itemIds.includes(item.id)).forEach((item) => {
    const key = contactKey(item);
    const list = grouped.get(key) ?? [];
    list.push(item);
    grouped.set(key, list);
  });
  return [...grouped.values()];
}
