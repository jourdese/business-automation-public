"use client";

import {
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import {
  ArrowLeft,
  Check,
  ChefHat,
  ChevronRight,
  Clock3,
  Mail,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  TriangleAlert,
  Truck,
} from "lucide-react";
import CompanionMark from "@/components/jourvis/CompanionMark";
import styles from "./autoinventory-preview.module.css";

type Zone = "Pantry" | "Cold storage" | "Seafood freezer" | "Produce";
type Tone = "good" | "watch" | "low" | "critical";
type PrimaryTab = "overview" | "stock" | "recipes" | "orders" | "activity";
type StockFilter = "All" | Zone;

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  current: number;
  par: number;
  dailyUse: number;
  incoming: number;
  supplier: string;
  packSize: number;
  packPrice: number;
  leadTime: string;
  zone: Zone;
};

type Recipe = {
  id: string;
  name: string;
  description: string;
  ingredients: Record<string, number>;
};

const initialIngredients: Ingredient[] = [
  { id: "pasta", name: "Pasta", unit: "kg", current: 10.2, par: 12, dailyUse: 1.7, incoming: 0, supplier: "Davao Pasta & Provisions", packSize: 5, packPrice: 860, leadTime: "1 day", zone: "Pantry" },
  { id: "tomato", name: "Tomato sauce", unit: "L", current: 7.4, par: 10, dailyUse: 1.45, incoming: 0, supplier: "Casa Rosso Foods", packSize: 4, packPrice: 980, leadTime: "1 day", zone: "Pantry" },
  { id: "olive-oil", name: "Olive oil", unit: "L", current: 4.5, par: 5, dailyUse: 0.38, incoming: 0, supplier: "Casa Rosso Foods", packSize: 2, packPrice: 1220, leadTime: "2 days", zone: "Pantry" },
  { id: "flour", name: "Pizza flour", unit: "kg", current: 13, par: 15, dailyUse: 2.1, incoming: 0, supplier: "Davao Pasta & Provisions", packSize: 10, packPrice: 760, leadTime: "1 day", zone: "Pantry" },
  { id: "parmesan", name: "Parmigiano", unit: "kg", current: 1.45, par: 5, dailyUse: 0.62, incoming: 0, supplier: "Italian Pantry Davao", packSize: 2, packPrice: 2380, leadTime: "2 days", zone: "Cold storage" },
  { id: "mozzarella", name: "Mozzarella", unit: "kg", current: 6.1, par: 8, dailyUse: 1.15, incoming: 0, supplier: "Italian Pantry Davao", packSize: 3, packPrice: 1650, leadTime: "1 day", zone: "Cold storage" },
  { id: "cream", name: "Cooking cream", unit: "L", current: 2.25, par: 5, dailyUse: 0.72, incoming: 0, supplier: "Davao Dairy Supply", packSize: 2, packPrice: 720, leadTime: "1 day", zone: "Cold storage" },
  { id: "shrimp", name: "Shrimp", unit: "kg", current: 2.2, par: 10, dailyUse: 1.95, incoming: 0, supplier: "Davao Fresh Seafood", packSize: 5, packPrice: 2800, leadTime: "1 day", zone: "Seafood freezer" },
  { id: "salmon", name: "Salmon", unit: "kg", current: 4.9, par: 8, dailyUse: 1.05, incoming: 0, supplier: "Davao Fresh Seafood", packSize: 4, packPrice: 3440, leadTime: "1 day", zone: "Seafood freezer" },
  { id: "squid", name: "Squid", unit: "kg", current: 1.7, par: 6, dailyUse: 1.0, incoming: 0, supplier: "Davao Fresh Seafood", packSize: 3, packPrice: 1380, leadTime: "1 day", zone: "Seafood freezer" },
  { id: "basil", name: "Fresh basil", unit: "kg", current: 0.48, par: 2, dailyUse: 0.31, incoming: 0, supplier: "Green Basket Produce", packSize: 1, packPrice: 410, leadTime: "same day", zone: "Produce" },
  { id: "mushroom", name: "Mushrooms", unit: "kg", current: 2.8, par: 5, dailyUse: 0.74, incoming: 0, supplier: "Green Basket Produce", packSize: 2, packPrice: 540, leadTime: "same day", zone: "Produce" },
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
  return Math.max(0, Math.min(100, Math.round((item.current / item.par) * 100)));
}

function toneFromPercent(value: number): Tone {
  if (value <= 20) return "critical";
  if (value <= 35) return "low";
  if (value <= 60) return "watch";
  return "good";
}

function tone(item: Ingredient): Tone {
  return toneFromPercent(percent(item));
}

function toneLabel(value: Tone) {
  if (value === "critical") return "Critical";
  if (value === "low") return "Low";
  if (value === "watch") return "Watch";
  return "Ready";
}

function toneClass(value: Tone) {
  if (value === "critical") return styles.critical;
  if (value === "low") return styles.low;
  if (value === "watch") return styles.watch;
  return styles.good;
}

function suggestedOrder(item: Ingredient) {
  const shortage = Math.max(0, item.par - item.current - item.incoming);
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

function Battery({ item, compact = false }: { item: Ingredient; compact?: boolean }) {
  const level = percent(item);
  const filled = Math.round(level / 10);
  const itemTone = tone(item);
  return (
    <div
      className={`${styles.battery} ${compact ? styles.batteryCompact : ""}`}
      aria-label={`${item.name}: ${level}% of PAR, ${toneLabel(itemTone)}`}
    >
      {Array.from({ length: 10 }).map((_, index) => (
        <span
          key={index}
          className={`${styles.batteryCell} ${index < filled ? toneClass(itemTone) : ""}`}
        />
      ))}
    </div>
  );
}

function PixelGlyph({ active }: { active: boolean }) {
  return (
    <span className={styles.pixelGlyph} data-active={active} aria-hidden="true">
      {Array.from({ length: 12 }).map((_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

export default function MarinaraAutoinventoryPreviewPage() {
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [selectedId, setSelectedId] = useState("shrimp");
  const [selectedRecipeId, setSelectedRecipeId] = useState("seafood-marinara");
  const [activeTab, setActiveTab] = useState<PrimaryTab>("overview");
  const [stockFilter, setStockFilter] = useState<StockFilter>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoPilot, setAutoPilot] = useState(false);
  const [activity, setActivity] = useState([
    "Jourvis finished the morning inventory scan.",
    "42 guests are forecast for tonight's dinner service.",
  ]);

  const selected = ingredients.find((item) => item.id === selectedId) ?? ingredients[0];
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedRecipeId) ?? recipes[0];

  const metrics = useMemo(() => {
    const critical = ingredients.filter((item) => percent(item) <= 20).length;
    const low = ingredients.filter((item) => percent(item) > 20 && percent(item) <= 35).length;
    const incoming = ingredients.filter((item) => item.incoming > 0).length;
    const readiness = Math.round(
      ingredients.reduce((sum, item) => sum + percent(item), 0) / ingredients.length,
    );
    return { critical, low, incoming, readiness };
  }, [ingredients]);

  const urgent = useMemo(
    () =>
      ingredients
        .filter((item) => percent(item) <= 35)
        .sort((a, b) => percent(a) - percent(b)),
    [ingredients],
  );

  const suggested = useMemo(
    () =>
      ingredients
        .filter((item) => suggestedOrder(item) > 0)
        .sort((a, b) => percent(a) - percent(b)),
    [ingredients],
  );

  const incoming = useMemo(
    () => ingredients.filter((item) => item.incoming > 0),
    [ingredients],
  );

  const filteredIngredients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return ingredients.filter((item) => {
      const zoneMatch = stockFilter === "All" || item.zone === stockFilter;
      const queryMatch = !query || `${item.name} ${item.zone} ${item.supplier}`.toLowerCase().includes(query);
      return zoneMatch && queryMatch;
    });
  }, [ingredients, searchTerm, stockFilter]);

  const affectedRecipes = recipes.filter((recipe) => selected.id in recipe.ingredients);
  const daysRemaining = selected.dailyUse > 0 ? selected.current / selected.dailyUse : 99;
  const orderAmount = suggestedOrder(selected);
  const orderPacks = orderAmount > 0 ? Math.ceil(orderAmount / selected.packSize) : 0;
  const orderCost = orderPacks * selected.packPrice;
  const recipeCapacity = Math.max(
    0,
    Math.floor(
      Math.min(
        ...Object.entries(selectedRecipe.ingredients).map(([id, amount]) => {
          const item = ingredients.find((ingredient) => ingredient.id === id);
          return item ? item.current / amount : 0;
        }),
      ),
    ),
  );

  function log(message: string) {
    setActivity((current) => [message, ...current].slice(0, 12));
  }

  function updateIngredient(id: string, updater: (item: Ingredient) => Ingredient) {
    setIngredients((current) => current.map((item) => (item.id === id ? updater(item) : item)));
  }

  function placeOrder(item: Ingredient) {
    const amount = suggestedOrder(item);
    if (!amount) {
      log(`${item.name} is already covered by on-hand and incoming stock.`);
      return;
    }
    updateIngredient(item.id, (current) => ({
      ...current,
      incoming: round(current.incoming + amount),
    }));
    log(
      `Restock request prepared for ${item.supplier}: ${amount} ${item.unit} of ${item.name} (${formatMoney(Math.ceil(amount / item.packSize) * item.packPrice)} demo total).`,
    );
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
    log(`Delivery received: ${amount} ${item.unit} of ${item.name}. Inventory recharged.`);
  }

  function recordWaste(item: Ingredient) {
    const amount = Math.min(item.current, Math.max(0.05, item.par * 0.05));
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
        return amount
          ? { ...item, current: round(Math.max(0, item.current - amount)) }
          : item;
      }),
    );
    log(`Demo sale: 1 × ${recipe.name}. Recipe ingredients were deducted automatically.`);
  }

  function resetDemo() {
    setIngredients(initialIngredients);
    setSelectedId("shrimp");
    setSelectedRecipeId("seafood-marinara");
    setStockFilter("All");
    setSearchTerm("");
    setAutoPilot(false);
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
    window.requestAnimationFrame(() => {
      document.getElementById(`autoinventory-tab-${nextTab}`)?.focus();
    });
  }

  const tabCounts: Record<PrimaryTab, number> = {
    overview: metrics.critical + metrics.low,
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
              A compact view of stock, recipes and supplier actions. Jourvis keeps the useful signals together so the owner can see what matters and act quickly.
            </p>
          </div>
          <div className={styles.ownerPulse}>
            <CompanionMark className={styles.ownerCompanion} />
            <div>
              <span>JOURVIS</span>
              <strong>
                {urgent.length ? `${urgent.length} supplies need attention.` : "Inventory is inside the safe range."}
              </strong>
              <small>
                {urgent[0] ? `${urgent[0].name} is the highest-risk ingredient right now.` : "No low-stock action is waiting."}
              </small>
            </div>
          </div>
        </header>

        <section className={styles.statusStrip} aria-label="Inventory summary">
          <div>
            <span>Readiness</span>
            <strong>{metrics.readiness}%</strong>
          </div>
          <div>
            <span>Critical</span>
            <strong>{metrics.critical}</strong>
          </div>
          <div>
            <span>Low</span>
            <strong>{metrics.low}</strong>
          </div>
          <div>
            <span>Incoming</span>
            <strong>{metrics.incoming}</strong>
          </div>
          <div className={styles.headerActions}>
            <a href="/restaurant/marinara-ristorante">
              <ArrowLeft size={14} aria-hidden /> Marinara
            </a>
            <button type="button" onClick={resetDemo}>
              <RefreshCw size={14} aria-hidden /> Reset
            </button>
          </div>
        </section>

        <div className={styles.tabRail} role="tablist" aria-label="Autoinventory sections" onKeyDown={handleTabKeys}>
          {primaryTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`autoinventory-tab-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls={`autoinventory-panel-${tab.id}`}
                tabIndex={active ? 0 : -1}
                className={`${styles.pixelTab} ${active ? styles.pixelTabActive : ""}`}
                onClick={() => switchTab(tab.id)}
              >
                <PixelGlyph active={active} />
                <span className={styles.tabLabel}>{tab.label}</span>
                <small>{tabCounts[tab.id]}</small>
              </button>
            );
          })}
        </div>

        <section
          className={styles.workspace}
          id={`autoinventory-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`autoinventory-tab-${activeTab}`}
        >
          {activeTab === "overview" ? (
            <div className={styles.overviewGrid}>
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.mono}>NEEDS ATTENTION</span>
                    <h2>What matters now</h2>
                  </div>
                  <button className={styles.textAction} type="button" onClick={() => switchTab("stock")}>
                    Open stock <ChevronRight size={15} aria-hidden />
                  </button>
                </div>
                <div className={styles.urgentList}>
                  {urgent.length ? (
                    urgent.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(item.id);
                          setStockFilter("All");
                          switchTab("stock");
                        }}
                      >
                        <span className={`${styles.statusDot} ${toneClass(tone(item))}`} />
                        <span className={styles.rowName}>
                          <strong>{item.name}</strong>
                          <small>{item.zone}</small>
                        </span>
                        <Battery item={item} compact />
                        <strong className={styles.percent}>{percent(item)}%</strong>
                        <small className={styles.days}>{round(item.current / item.dailyUse)}d</small>
                        <span className={`${styles.toneText} ${toneClass(tone(item))}`}>{toneLabel(tone(item))}</span>
                      </button>
                    ))
                  ) : (
                    <div className={styles.emptyState}><Check size={18} aria-hidden /> No low-stock actions right now.</div>
                  )}
                </div>
              </section>

              <aside className={`${styles.panel} ${styles.jourvisPanel}`}>
                <div className={styles.jourvisHeading}>
                  <CompanionMark className={styles.panelCompanion} />
                  <div>
                    <span className={styles.mono}>JOURVIS / TODAY</span>
                    <h2>I&apos;ll keep the thread.</h2>
                  </div>
                </div>
                <p>
                  {urgent[0]
                    ? `${urgent[0].name} has about ${round(urgent[0].current / urgent[0].dailyUse)} days of cover. I would review its supplier order first.`
                    : "Stock is currently inside the safe range. I will surface the next meaningful action here."}
                </p>
                {urgent[0] ? (
                  <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={() => {
                      setSelectedId(urgent[0].id);
                      switchTab("orders");
                    }}
                  >
                    Review restock <Mail size={15} aria-hidden />
                  </button>
                ) : null}
                <div className={styles.miniFacts}>
                  <div><span>Dinner forecast</span><strong>42 guests</strong></div>
                  <div><span>Tracked supplies</span><strong>{ingredients.length}</strong></div>
                  <div><span>Recipes linked</span><strong>{recipes.length}</strong></div>
                  <div><span>Database writes</span><strong>None</strong></div>
                </div>
              </aside>

              <section className={`${styles.panel} ${styles.zonePanel}`}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.mono}>MARINARA WORLD</span>
                    <h2>Four rooms, one system</h2>
                  </div>
                  <span className={styles.panelNote}>Pixel tiles show zone health</span>
                </div>
                <div className={styles.zoneMatrix}>
                  {zoneOrder.map((zone) => {
                    const items = ingredients.filter((item) => item.zone === zone);
                    const average = Math.round(items.reduce((sum, item) => sum + percent(item), 0) / items.length);
                    const filled = Math.round((average / 100) * 16);
                    const zoneTone = toneFromPercent(average);
                    return (
                      <button
                        key={zone}
                        type="button"
                        className={styles.zoneTile}
                        onClick={() => {
                          chooseFilter(zone);
                          switchTab("stock");
                        }}
                      >
                        <div className={styles.zonePixels} aria-hidden="true">
                          {Array.from({ length: 16 }).map((_, index) => (
                            <span key={index} className={index < filled ? toneClass(zoneTone) : ""} />
                          ))}
                        </div>
                        <span>
                          <strong>{zone}</strong>
                          <small>{average}% · {items.length} supplies</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "stock" ? (
            <div>
              <div className={styles.stockToolbar}>
                <div className={styles.filterGroup} aria-label="Filter inventory by zone">
                  {stockFilters.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      aria-pressed={stockFilter === filter}
                      className={stockFilter === filter ? styles.filterActive : ""}
                      onClick={() => chooseFilter(filter)}
                    >
                      {filter === "Cold storage" ? "Cold" : filter === "Seafood freezer" ? "Seafood" : filter}
                    </button>
                  ))}
                </div>
                <label className={styles.searchBox}>
                  <Search size={15} aria-hidden />
                  <span className="sr-only">Search inventory</span>
                  <input
                    type="search"
                    value={searchTerm}
                    placeholder="Search stock"
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </label>
              </div>

              <div className={styles.stockLayout}>
                <section className={styles.stockList} aria-label="Ingredients">
                  <div className={styles.stockListHead}>
                    <span>Supply</span><span>Level</span><span>On hand</span><span>Cover</span><span>Status</span><span />
                  </div>
                  {filteredIngredients.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`${styles.stockRow} ${selected.id === item.id ? styles.stockRowSelected : ""}`}
                      aria-pressed={selected.id === item.id}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <span className={styles.rowName}>
                        <strong>{item.name}</strong>
                        <small>{item.zone}</small>
                      </span>
                      <span className={styles.levelCell}>
                        <Battery item={item} compact />
                        <b>{percent(item)}%</b>
                      </span>
                      <span>{item.current} {item.unit}</span>
                      <span>{round(item.current / item.dailyUse)}d</span>
                      <span className={`${styles.toneText} ${toneClass(tone(item))}`}>{toneLabel(tone(item))}</span>
                      <ChevronRight size={16} aria-hidden />
                    </button>
                  ))}
                  {!filteredIngredients.length ? <div className={styles.emptyState}>No supplies match this filter.</div> : null}
                </section>

                <aside className={styles.detailCard} aria-label={`${selected.name} details`}>
                  <div className={styles.detailTop}>
                    <div>
                      <span className={styles.mono}>SELECTED SUPPLY</span>
                      <h2>{selected.name}</h2>
                      <small>{selected.zone}</small>
                    </div>
                    <span className={`${styles.healthBadge} ${toneClass(tone(selected))}`}>{toneLabel(tone(selected))}</span>
                  </div>
                  <div className={styles.bigBatteryRow}>
                    <Battery item={selected} />
                    <strong>{percent(selected)}%</strong>
                  </div>
                  <div className={styles.factGrid}>
                    <div><span>On hand</span><strong>{selected.current} {selected.unit}</strong></div>
                    <div><span>PAR target</span><strong>{selected.par} {selected.unit}</strong></div>
                    <div><span>Daily use</span><strong>{selected.dailyUse} {selected.unit}</strong></div>
                    <div><span>Days cover</span><strong>{round(daysRemaining)} days</strong></div>
                    <div><span>Incoming</span><strong>{selected.incoming} {selected.unit}</strong></div>
                    <div><span>Supplier lead</span><strong>{selected.leadTime}</strong></div>
                  </div>
                  <div className={styles.recommendation}>
                    <Sparkles size={17} aria-hidden />
                    <div>
                      <span>JOURVIS RECOMMENDS</span>
                      <p>
                        {orderAmount > 0
                          ? `Prepare ${orderAmount} ${selected.unit} from ${selected.supplier}. Demo estimate: ${formatMoney(orderCost)}.`
                          : "Current and incoming stock cover the PAR target."}
                      </p>
                    </div>
                  </div>
                  <div className={styles.detailActions}>
                    <button type="button" className={styles.primaryButton} disabled={!orderAmount} onClick={() => placeOrder(selected)}>
                      <Mail size={15} aria-hidden /> Prepare restock
                    </button>
                    <button type="button" className={styles.secondaryButton} disabled={selected.incoming <= 0} onClick={() => receive(selected)}>
                      <PackageCheck size={15} aria-hidden /> Receive
                    </button>
                    <button type="button" className={styles.quietButton} onClick={() => recordWaste(selected)}>
                      <TriangleAlert size={14} aria-hidden /> Record demo waste
                    </button>
                  </div>
                  <div className={styles.usedBy}>
                    <span className={styles.mono}>USED BY</span>
                    {affectedRecipes.map((recipe) => (
                      <button
                        key={recipe.id}
                        type="button"
                        onClick={() => {
                          setSelectedRecipeId(recipe.id);
                          switchTab("recipes");
                        }}
                      >
                        <span>{recipe.name}</span>
                        <small>{recipe.ingredients[selected.id]} {selected.unit} / serving</small>
                      </button>
                    ))}
                  </div>
                </aside>
              </div>
            </div>
          ) : null}

          {activeTab === "recipes" ? (
            <div className={styles.recipeLayout}>
              <section className={styles.recipeList} aria-label="Recipes">
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.mono}>RECIPE-DRIVEN INVENTORY</span>
                    <h2>What each dish consumes</h2>
                  </div>
                </div>
                {recipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    type="button"
                    className={selectedRecipe.id === recipe.id ? styles.recipeSelected : ""}
                    onClick={() => setSelectedRecipeId(recipe.id)}
                  >
                    <ChefHat size={18} aria-hidden />
                    <span>
                      <strong>{recipe.name}</strong>
                      <small>{recipe.description}</small>
                    </span>
                    <ChevronRight size={16} aria-hidden />
                  </button>
                ))}
              </section>

              <aside className={styles.recipeDetail}>
                <span className={styles.mono}>SELECTED RECIPE</span>
                <h2>{selectedRecipe.name}</h2>
                <p>{selectedRecipe.description}</p>
                <div className={styles.capacity}>
                  <span>Current possible servings</span>
                  <strong>{recipeCapacity}</strong>
                </div>
                <div className={styles.recipeIngredients}>
                  {Object.entries(selectedRecipe.ingredients).map(([id, amount]) => {
                    const item = ingredients.find((ingredient) => ingredient.id === id);
                    if (!item) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setSelectedId(id);
                          setStockFilter("All");
                          switchTab("stock");
                        }}
                      >
                        <span><strong>{item.name}</strong><small>{item.current} {item.unit} on hand</small></span>
                        <span>{amount} {item.unit} / serving</span>
                      </button>
                    );
                  })}
                </div>
                <button className={styles.primaryButton} type="button" onClick={() => sellRecipe(selectedRecipe)}>
                  <ShoppingCart size={15} aria-hidden /> Simulate 1 sale
                </button>
              </aside>
            </div>
          ) : null}

          {activeTab === "orders" ? (
            <div className={styles.ordersGrid}>
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.mono}>SUGGESTED RESTOCKS</span>
                    <h2>{suggested.length} to review</h2>
                  </div>
                  <Mail size={18} aria-hidden />
                </div>
                <div className={styles.orderList}>
                  {suggested.slice(0, 8).map((item) => {
                    const amount = suggestedOrder(item);
                    const packs = Math.ceil(amount / item.packSize);
                    return (
                      <article key={item.id}>
                        <div>
                          <span className={`${styles.statusDot} ${toneClass(tone(item))}`} />
                          <div><strong>{item.name}</strong><small>{item.supplier}</small></div>
                        </div>
                        <span><b>{amount} {item.unit}</b><small>{formatMoney(packs * item.packPrice)} · {item.leadTime}</small></span>
                        <button type="button" onClick={() => placeOrder(item)}>Prepare</button>
                      </article>
                    );
                  })}
                  {!suggested.length ? <div className={styles.emptyState}><Check size={18} aria-hidden /> No suggested restocks.</div> : null}
                </div>
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.mono}>INCOMING</span>
                    <h2>{incoming.length} deliveries</h2>
                  </div>
                  <Truck size={18} aria-hidden />
                </div>
                <div className={styles.orderList}>
                  {incoming.map((item) => (
                    <article key={item.id}>
                      <div>
                        <Truck size={15} aria-hidden />
                        <div><strong>{item.name}</strong><small>{item.supplier}</small></div>
                      </div>
                      <span><b>+{item.incoming} {item.unit}</b><small>Awaiting receiving</small></span>
                      <button type="button" onClick={() => receive(item)}>Receive</button>
                    </article>
                  ))}
                  {!incoming.length ? <div className={styles.emptyState}>No supplier deliveries are waiting.</div> : null}
                </div>
              </section>

              <label className={styles.autopilotCard}>
                <input type="checkbox" checked={autoPilot} onChange={(event) => setAutoPilot(event.target.checked)} />
                <span>
                  <strong>Autopilot preview</strong>
                  <small>
                    {autoPilot
                      ? "Jourvis may prepare eligible restocks automatically. Sending remains simulated."
                      : "Every supplier request stays behind owner approval."}
                  </small>
                </span>
              </label>
            </div>
          ) : null}

          {activeTab === "activity" ? (
            <section className={styles.activityPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.mono}>AUDIT TRAIL</span>
                  <h2>What changed</h2>
                </div>
                <button className={styles.textAction} type="button" onClick={resetDemo}>
                  <RefreshCw size={14} aria-hidden /> Reset demo
                </button>
              </div>
              <div className={styles.timeline}>
                {activity.map((entry, index) => (
                  <div key={`${entry}-${index}`}>
                    <span className={styles.timelineTime}>{index === 0 ? "NOW" : `${index + 1}`}</span>
                    <span className={styles.timelineDot} />
                    <p>{entry}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </section>

        <footer className={styles.previewNotice}>
          <TriangleAlert size={16} aria-hidden />
          <p>
            <strong>Preview only.</strong> Supplier names, prices, recipe quantities and inventory values are demo data. No email, SMS, purchasing, database or accounting action is performed yet.
          </p>
          <span>/restaurant/marinara-ristorante/Autoinventory-preview</span>
        </footer>
      </div>
    </div>
  );
}
