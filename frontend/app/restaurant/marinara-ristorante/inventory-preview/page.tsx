"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  ChefHat,
  Clock3,
  Mail,
  PackageCheck,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  TriangleAlert,
  Truck,
} from "lucide-react";
import CompanionMark from "@/components/jourvis/CompanionMark";
import styles from "./inventory-preview.module.css";

type Zone = "Pantry" | "Cold storage" | "Seafood freezer" | "Produce";
type Tone = "good" | "watch" | "low" | "critical";

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

const zoneOrder: Zone[] = ["Pantry", "Cold storage", "Seafood freezer", "Produce"];

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function percent(item: Ingredient) {
  return Math.max(0, Math.min(100, Math.round((item.current / item.par) * 100)));
}

function tone(item: Ingredient): Tone {
  const value = percent(item);
  if (value <= 20) return "critical";
  if (value <= 35) return "low";
  if (value <= 60) return "watch";
  return "good";
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

function toneClass(value: Tone) {
  if (value === "critical") return styles.critical;
  if (value === "low") return styles.low;
  if (value === "watch") return styles.watch;
  return styles.good;
}

export default function MarinaraInventoryPreviewPage() {
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [selectedId, setSelectedId] = useState("shrimp");
  const [autoPilot, setAutoPilot] = useState(false);
  const [activity, setActivity] = useState([
    "Jourvis finished the morning inventory scan.",
    "42 guests are forecast for tonight's dinner service.",
  ]);

  const selected = ingredients.find((item) => item.id === selectedId) ?? ingredients[0];
  const selectedTone = tone(selected);

  const metrics = useMemo(() => {
    const critical = ingredients.filter((item) => percent(item) <= 20).length;
    const low = ingredients.filter((item) => percent(item) > 20 && percent(item) <= 35).length;
    const incoming = ingredients.filter((item) => item.incoming > 0).length;
    const readiness = Math.round(
      ingredients.reduce((sum, item) => sum + Math.min(100, percent(item)), 0) /
        ingredients.length,
    );
    return { critical, low, incoming, readiness };
  }, [ingredients]);

  const affectedRecipes = recipes.filter((recipe) => selected.id in recipe.ingredients);
  const daysRemaining = selected.dailyUse > 0 ? selected.current / selected.dailyUse : 99;
  const orderAmount = suggestedOrder(selected);
  const orderPacks = orderAmount > 0 ? Math.ceil(orderAmount / selected.packSize) : 0;
  const orderCost = orderPacks * selected.packPrice;

  function log(message: string) {
    setActivity((current) => [message, ...current].slice(0, 6));
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
    updateIngredient(item.id, (current) => ({ ...current, incoming: round(current.incoming + amount) }));
    log(`Purchase request sent to ${item.supplier}: ${amount} ${item.unit} of ${item.name} (${formatMoney(Math.ceil(amount / item.packSize) * item.packPrice)} demo total).`);
  }

  function receive(item: Ingredient) {
    if (item.incoming <= 0) {
      log(`No incoming ${item.name} delivery is waiting to be received.`);
      return;
    }
    const amount = item.incoming;
    updateIngredient(item.id, (current) => ({ ...current, current: round(current.current + current.incoming), incoming: 0 }));
    log(`Delivery received: ${amount} ${item.unit} of ${item.name}. Inventory battery recharged.`);
  }

  function recordWaste(item: Ingredient) {
    const amount = Math.min(item.current, Math.max(0.05, item.par * 0.05));
    updateIngredient(item.id, (current) => ({ ...current, current: round(Math.max(0, current.current - amount)) }));
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
    setAutoPilot(false);
    setActivity([
      "Jourvis finished the morning inventory scan.",
      "42 guests are forecast for tonight's dinner service.",
    ]);
  }

  const urgent = ingredients
    .filter((item) => percent(item) <= 35)
    .sort((a, b) => percent(a) - percent(b));

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <a className={styles.backLink} href="/restaurant/marinara-ristorante">
          <ArrowLeft size={16} aria-hidden />
          Back to Marinara
        </a>
        <span className={styles.previewBadge}>OWNER PREVIEW · LOCAL INVENTORY SIMULATION</span>
        <button className={styles.resetButton} type="button" onClick={resetDemo}>
          <RefreshCw size={15} aria-hidden />
          Reset demo
        </button>
      </div>

      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>MARINARA × JOURVIS OPERATIONS</p>
          <h1>Inventory becomes a living world.</h1>
          <p className={styles.heroCopy}>
            Every dish consumes real recipe ingredients. Every supplier delivery recharges the restaurant. Jourvis watches the system, spots risk and prepares the next action.
          </p>
        </div>
        <div className={styles.jourvisIntro}>
          <CompanionMark className={styles.companion} />
          <div>
            <span>JOURVIS</span>
            <strong>{metrics.critical ? `${metrics.critical} ingredient${metrics.critical > 1 ? "s" : ""} need immediate attention.` : "Inventory is stable."}</strong>
            <p>{urgent[0] ? `${urgent[0].name} is currently the highest-risk supply.` : "No low-stock items right now."}</p>
          </div>
        </div>
      </section>

      <section className={styles.metrics} aria-label="Inventory overview">
        <article>
          <span>READINESS</span>
          <strong>{metrics.readiness}%</strong>
          <small>average stock vs PAR</small>
        </article>
        <article>
          <span>CRITICAL</span>
          <strong>{metrics.critical}</strong>
          <small>at or below 20%</small>
        </article>
        <article>
          <span>LOW</span>
          <strong>{metrics.low}</strong>
          <small>21–35% remaining</small>
        </article>
        <article>
          <span>INCOMING</span>
          <strong>{metrics.incoming}</strong>
          <small>supplier deliveries</small>
        </article>
      </section>

      <div className={styles.layout}>
        <section className={styles.worldPanel} aria-labelledby="world-title">
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.panelKicker}>THE DIGITAL RESTAURANT</p>
              <h2 id="world-title">Marinara World</h2>
            </div>
            <div className={styles.serviceChip}>
              <Clock3 size={15} aria-hidden />
              Dinner forecast · 42 guests
            </div>
          </div>

          <div className={styles.pixelWorld}>
            <div className={styles.worldFloor} aria-hidden="true" />
            {zoneOrder.map((zone) => {
              const zoneItems = ingredients.filter((item) => item.zone === zone);
              const average = Math.round(zoneItems.reduce((sum, item) => sum + percent(item), 0) / zoneItems.length);
              return (
                <div className={`${styles.zone} ${styles[`zone${zone.replace(/\s/g, "")}`] ?? ""}`} key={zone}>
                  <div className={styles.zoneSign}>{zone}</div>
                  <div className={styles.pixelShelf} aria-hidden="true">
                    {zoneItems.slice(0, 4).map((item) => (
                      <span key={item.id} className={toneClass(tone(item))} />
                    ))}
                  </div>
                  <strong>{average}% zone health</strong>
                  <small>{zoneItems.length} tracked supplies</small>
                </div>
              );
            })}
            <div className={styles.pixelKitchen}>
              <ChefHat size={27} aria-hidden />
              <strong>KITCHEN</strong>
              <span>recipes consume stock</span>
            </div>
            <div className={styles.pixelReceiving}>
              <Truck size={25} aria-hidden />
              <strong>RECEIVING</strong>
              <span>{metrics.incoming ? `${metrics.incoming} delivery${metrics.incoming > 1 ? "ies" : ""} waiting` : "dock clear"}</span>
            </div>
            <div className={styles.pixelJourvis}>
              <CompanionMark className={styles.worldCompanion} />
              <span>monitoring</span>
            </div>
          </div>

          <div className={styles.inventoryGrid}>
            {ingredients.map((item) => {
              const level = percent(item);
              const itemTone = tone(item);
              const filled = Math.round(level / 10);
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`${styles.ingredientCard} ${selected.id === item.id ? styles.selectedCard : ""}`}
                  onClick={() => setSelectedId(item.id)}
                  aria-pressed={selected.id === item.id}
                >
                  <div className={styles.ingredientTop}>
                    <span>{item.name}</span>
                    <strong className={toneClass(itemTone)}>{level}%</strong>
                  </div>
                  <div className={styles.battery} aria-label={`${item.name} ${level}% of PAR stock`}>
                    {Array.from({ length: 10 }).map((_, index) => (
                      <span key={index} className={`${styles.batterySegment} ${index < filled ? toneClass(itemTone) : ""}`} />
                    ))}
                  </div>
                  <div className={styles.ingredientMeta}>
                    <span>{item.current} {item.unit}</span>
                    {item.incoming > 0 ? <span className={styles.incoming}>+{item.incoming} incoming</span> : <span>{round(item.current / item.dailyUse)} days</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className={styles.controlPanel} aria-labelledby="control-title">
          <div className={styles.panelHeadingCompact}>
            <div>
              <p className={styles.panelKicker}>SELECTED SUPPLY</p>
              <h2 id="control-title">{selected.name}</h2>
            </div>
            <span className={`${styles.healthBadge} ${toneClass(selectedTone)}`}>{percent(selected)}%</span>
          </div>

          <div className={styles.bigBattery}>
            <div className={styles.bigBatteryShell}>
              <div className={`${styles.bigBatteryFill} ${toneClass(selectedTone)}`} style={{ width: `${percent(selected)}%` }} />
            </div>
            <div className={styles.bigBatteryCap} aria-hidden="true" />
          </div>

          <div className={styles.stockFacts}>
            <div><span>On hand</span><strong>{selected.current} {selected.unit}</strong></div>
            <div><span>PAR target</span><strong>{selected.par} {selected.unit}</strong></div>
            <div><span>Daily use</span><strong>{selected.dailyUse} {selected.unit}</strong></div>
            <div><span>Days cover</span><strong>{round(daysRemaining)} days</strong></div>
            <div><span>Incoming</span><strong>{selected.incoming} {selected.unit}</strong></div>
          </div>

          <div className={styles.jourvisAdvice}>
            <div className={styles.adviceIcon}><Bot size={18} aria-hidden /></div>
            <div>
              <strong>Jourvis recommendation</strong>
              {orderAmount > 0 ? (
                <p>Order <b>{orderAmount} {selected.unit}</b> from {selected.supplier}. Estimated demo cost: <b>{formatMoney(orderCost)}</b>.</p>
              ) : (
                <p>Current and incoming stock cover the PAR target. No purchase is needed.</p>
              )}
            </div>
          </div>

          <div className={styles.supplierCard}>
            <span>SUPPLIER</span>
            <strong>{selected.supplier}</strong>
            <p>{selected.packSize} {selected.unit} pack · {formatMoney(selected.packPrice)} · {selected.leadTime}</p>
          </div>

          <div className={styles.actions}>
            <button className={styles.primaryAction} type="button" onClick={() => placeOrder(selected)} disabled={orderAmount === 0}>
              <Mail size={17} aria-hidden />
              Send restock request
            </button>
            <button className={styles.secondaryAction} type="button" onClick={() => receive(selected)} disabled={selected.incoming <= 0}>
              <PackageCheck size={17} aria-hidden />
              Receive delivery
            </button>
            <button className={styles.ghostAction} type="button" onClick={() => recordWaste(selected)}>
              <TriangleAlert size={16} aria-hidden />
              Record demo waste
            </button>
          </div>

          <label className={styles.autoPilotRow}>
            <input type="checkbox" checked={autoPilot} onChange={(event) => setAutoPilot(event.target.checked)} />
            <span>
              <strong>Autopilot preview</strong>
              <small>{autoPilot ? "Jourvis may prepare eligible reorders automatically. Sending remains simulated." : "Keep all supplier orders behind owner approval."}</small>
            </span>
          </label>

          <div className={styles.recipeImpact}>
            <span>USED BY</span>
            {affectedRecipes.map((recipe) => (
              <div key={recipe.id}>
                <strong>{recipe.name}</strong>
                <small>{recipe.ingredients[selected.id]} {selected.unit} / serving</small>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <section className={styles.demoSection}>
        <div className={styles.panelHeading}>
          <div>
            <p className={styles.panelKicker}>RECIPE-DRIVEN INVENTORY</p>
            <h2>Simulate tonight&apos;s orders</h2>
          </div>
          <p className={styles.sectionNote}>Click a dish. Its raw ingredients are deducted instantly.</p>
        </div>
        <div className={styles.recipeGrid}>
          {recipes.map((recipe) => (
            <article key={recipe.id} className={styles.recipeCard}>
              <div className={styles.recipeIcon}><ChefHat size={21} aria-hidden /></div>
              <h3>{recipe.name}</h3>
              <p>{recipe.description}</p>
              <button type="button" onClick={() => sellRecipe(recipe)}>
                <ShoppingCart size={16} aria-hidden />
                Simulate 1 sale
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <div className={styles.alertPanel}>
          <div className={styles.smallHeading}>
            <Sparkles size={18} aria-hidden />
            <h2>Jourvis action queue</h2>
          </div>
          {urgent.length ? urgent.slice(0, 4).map((item) => (
            <button type="button" key={item.id} onClick={() => setSelectedId(item.id)}>
              <span className={`${styles.alertDot} ${toneClass(tone(item))}`} />
              <span><strong>{item.name}</strong><small>{percent(item)}% · about {round(item.current / item.dailyUse)} days left</small></span>
              <b>Review</b>
            </button>
          )) : (
            <div className={styles.allGood}><Check size={18} aria-hidden /> No low-stock actions right now.</div>
          )}
        </div>

        <div className={styles.activityPanel}>
          <div className={styles.smallHeading}>
            <Clock3 size={18} aria-hidden />
            <h2>Live activity</h2>
          </div>
          <div className={styles.activityList}>
            {activity.map((entry, index) => (
              <div key={`${entry}-${index}`}>
                <span>{index === 0 ? "NOW" : `${index + 1}`}</span>
                <p>{entry}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.previewNotice}>
        <TriangleAlert size={18} aria-hidden />
        <p><strong>Preview only.</strong> Supplier names, prices, recipe quantities and inventory values are demo data. No email, SMS, purchasing, database or accounting action is performed by this page yet.</p>
      </section>
    </div>
  );
}
