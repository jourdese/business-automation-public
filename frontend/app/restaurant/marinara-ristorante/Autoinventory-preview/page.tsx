"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
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
import styles from "./autoinventory-preview.module.css";

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

export default function MarinaraAutoinventoryPreviewPage() {
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
  const urgent = ingredients
    .filter((item) => percent(item) <= 35)
    .sort((a, b) => percent(a) - percent(b));

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
    log(`Restock request prepared for ${item.supplier}: ${amount} ${item.unit} of ${item.name} (${formatMoney(Math.ceil(amount / item.packSize) * item.packPrice)} demo total).`);
  }

  function receive(item: Ingredient) {
    if (item.incoming <= 0) {
      log(`No incoming ${item.name} delivery is waiting to be received.`);
      return;
    }
    const amount = item.incoming;
    updateIngredient(item.id, (current) => ({ ...current, current: round(current.current + current.incoming), incoming: 0 }));
    log(`Delivery received: ${amount} ${item.unit} of ${item.name}. Inventory recharged.`);
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

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="autoinventory-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span className={styles.statusSquare} />
            Marinara / Owner operations / Preview
          </p>
          <h1 id="autoinventory-title">
            Autoinventory-<span>preview.</span>
          </h1>
          <p className={styles.heroDescription}>
            A living view of Marinara&apos;s ingredients, recipes and supplier flow. Jourvis keeps the useful signals together so inventory feels less like a spreadsheet and more like a world you can understand at a glance.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="#autoinventory-world">
              Explore the restaurant <ArrowRight size={18} aria-hidden />
            </a>
            <a className={styles.textLink} href="/restaurant/marinara-ristorante">
              <ArrowLeft size={15} aria-hidden /> Back to Marinara
            </a>
          </div>
        </div>

        <div className={styles.heroPresence}>
          <CompanionMark className={styles.heroCompanion} />
          <span className={styles.orbitLabel}>YOUR OPERATIONS COMPANION</span>
          <div className={styles.heroSignal}>
            <span>Jourvis sees</span>
            <strong>{metrics.critical + metrics.low} supplies that need attention.</strong>
            <small>{urgent[0] ? `${urgent[0].name} is currently the highest-risk ingredient.` : "Everything is inside the safe range."}</small>
          </div>
        </div>

        <div className={styles.heroBaseline}>
          <span>Less stock checking. More room to run the restaurant.</span>
          <span className={styles.routeLabel}>/restaurant/marinara-ristorante/Autoinventory-preview</span>
        </div>
      </section>

      <section className={styles.overview} aria-label="Inventory overview">
        <div className={styles.sectionTopline}>
          <p>01 / What needs attention</p>
          <span>Demo values · No database writes</span>
        </div>
        <div className={styles.metrics}>
          <article>
            <span>Inventory readiness</span>
            <strong>{metrics.readiness}%</strong>
            <small>Average stock against PAR</small>
          </article>
          <article>
            <span>Critical</span>
            <strong>{metrics.critical}</strong>
            <small>At or below 20%</small>
          </article>
          <article>
            <span>Low</span>
            <strong>{metrics.low}</strong>
            <small>21–35% remaining</small>
          </article>
          <article>
            <span>Incoming</span>
            <strong>{metrics.incoming}</strong>
            <small>Supplier deliveries</small>
          </article>
        </div>
      </section>

      <section className={styles.worldSection} id="autoinventory-world" aria-labelledby="world-title">
        <div className={styles.sectionTopline}>
          <p>02 / Marinara as a living system</p>
          <span>Dinner forecast · 42 guests</span>
        </div>
        <div className={styles.worldHeading}>
          <div>
            <h2 id="world-title">The restaurant,<br /><span>made visible.</span></h2>
            <p>Each room reflects the ingredients inside it. Each ingredient has a battery. The kitchen consumes stock. Receiving recharges it.</p>
          </div>
          <div className={styles.worldGuide}>
            <CompanionMark className={styles.guideCompanion} />
            <div>
              <span>JOURVIS</span>
              <strong>I&apos;ll keep an eye on the levels.</strong>
              <small>Select any ingredient to see what it affects and what I would do next.</small>
            </div>
          </div>
        </div>

        <div className={styles.worldLayout}>
          <div className={styles.pixelWorld}>
            <div className={styles.pixelGrid} aria-hidden="true" />
            {zoneOrder.map((zone) => {
              const zoneItems = ingredients.filter((item) => item.zone === zone);
              const average = Math.round(zoneItems.reduce((sum, item) => sum + percent(item), 0) / zoneItems.length);
              return (
                <div className={styles.zone} key={zone}>
                  <div className={styles.zoneTop}>
                    <span>{zone}</span>
                    <strong>{average}%</strong>
                  </div>
                  <div className={styles.pixelShelf} aria-hidden="true">
                    {zoneItems.slice(0, 4).map((item) => (
                      <span key={item.id} className={toneClass(tone(item))} />
                    ))}
                  </div>
                  <small>{zoneItems.length} tracked supplies</small>
                </div>
              );
            })}
            <div className={styles.kitchenNode}>
              <ChefHat size={24} aria-hidden />
              <span>KITCHEN</span>
              <small>recipes consume stock</small>
            </div>
            <div className={styles.receivingNode}>
              <Truck size={23} aria-hidden />
              <span>RECEIVING</span>
              <small>{metrics.incoming ? `${metrics.incoming} delivery${metrics.incoming > 1 ? "ies" : ""} waiting` : "dock clear"}</small>
            </div>
            <CompanionMark className={styles.worldCompanion} />
          </div>

          <aside className={styles.selectedPanel} aria-labelledby="selected-title">
            <div className={styles.selectedHeading}>
              <div>
                <span className={styles.monoLabel}>SELECTED SUPPLY</span>
                <h3 id="selected-title">{selected.name}</h3>
              </div>
              <strong className={`${styles.healthNumber} ${toneClass(selectedTone)}`}>{percent(selected)}%</strong>
            </div>

            <div className={styles.largeBattery} aria-label={`${selected.name} ${percent(selected)}% of PAR stock`}>
              <div className={`${styles.largeBatteryFill} ${toneClass(selectedTone)}`} style={{ width: `${percent(selected)}%` }} />
            </div>

            <div className={styles.factGrid}>
              <div><span>On hand</span><strong>{selected.current} {selected.unit}</strong></div>
              <div><span>PAR target</span><strong>{selected.par} {selected.unit}</strong></div>
              <div><span>Days cover</span><strong>{round(daysRemaining)} days</strong></div>
              <div><span>Incoming</span><strong>{selected.incoming} {selected.unit}</strong></div>
            </div>

            <div className={styles.recommendation}>
              <CompanionMark className={styles.adviceCompanion} />
              <div>
                <span>Jourvis recommendation</span>
                {orderAmount > 0 ? (
                  <p>Order <b>{orderAmount} {selected.unit}</b> from {selected.supplier}. Demo estimate: <b>{formatMoney(orderCost)}</b>.</p>
                ) : (
                  <p>On-hand and incoming stock already cover the PAR target.</p>
                )}
              </div>
            </div>

            <div className={styles.supplierLine}>
              <span>Supplier</span>
              <strong>{selected.supplier}</strong>
              <small>{selected.packSize} {selected.unit} pack · {formatMoney(selected.packPrice)} · {selected.leadTime}</small>
            </div>

            <div className={styles.actionButtons}>
              <button type="button" className={styles.primaryButton} onClick={() => placeOrder(selected)} disabled={orderAmount === 0}>
                <Mail size={16} aria-hidden /> Prepare restock
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => receive(selected)} disabled={selected.incoming <= 0}>
                <PackageCheck size={16} aria-hidden /> Receive delivery
              </button>
              <button type="button" className={styles.quietButton} onClick={() => recordWaste(selected)}>
                <TriangleAlert size={15} aria-hidden /> Record demo waste
              </button>
            </div>
          </aside>
        </div>

        <div className={styles.inventoryList}>
          {ingredients.map((item) => {
            const level = percent(item);
            const itemTone = tone(item);
            const filled = Math.round(level / 10);
            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.inventoryRow} ${selected.id === item.id ? styles.inventoryRowActive : ""}`}
                onClick={() => setSelectedId(item.id)}
                aria-pressed={selected.id === item.id}
              >
                <span className={styles.inventoryName}>
                  <strong>{item.name}</strong>
                  <small>{item.zone}</small>
                </span>
                <span className={styles.battery} aria-hidden="true">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <i key={index} className={index < filled ? toneClass(itemTone) : ""} />
                  ))}
                </span>
                <span className={styles.inventoryValue}>
                  <strong className={toneClass(itemTone)}>{level}%</strong>
                  <small>{item.incoming > 0 ? `+${item.incoming} ${item.unit} incoming` : `${round(item.current / item.dailyUse)} days`}</small>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.recipeSection} aria-labelledby="recipe-title">
        <div className={styles.sectionTopline}>
          <p>03 / Recipe-driven inventory</p>
          <span>Every sale can become a stock movement</span>
        </div>
        <div className={styles.recipeIntro}>
          <h2 id="recipe-title">Sell a dish.<br /><span>The world changes.</span></h2>
          <p>These demo recipes connect menu items to raw materials. Simulate a sale and watch the ingredient levels update immediately.</p>
        </div>
        <div className={styles.recipeGrid}>
          {recipes.map((recipe, index) => (
            <article key={recipe.id} className={styles.recipeCard}>
              <span className={styles.recipeNumber}>0{index + 1}</span>
              <div>
                <h3>{recipe.name}</h3>
                <p>{recipe.description}</p>
              </div>
              <button type="button" onClick={() => sellRecipe(recipe)}>
                <ShoppingCart size={15} aria-hidden /> Simulate 1 sale
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.operationsSection} aria-labelledby="operations-title">
        <div className={styles.sectionTopline}>
          <p>04 / Keep the next step together</p>
          <span>Owner approval remains in control</span>
        </div>
        <div className={styles.operationsHeading}>
          <h2 id="operations-title">Jourvis keeps<br /><span>the thread.</span></h2>
          <label className={styles.autopilot}>
            <input type="checkbox" checked={autoPilot} onChange={(event) => setAutoPilot(event.target.checked)} />
            <span>
              <strong>Autopilot preview</strong>
              <small>{autoPilot ? "Eligible reorders may be prepared automatically. Sending remains simulated." : "Supplier orders stay behind owner approval."}</small>
            </span>
          </label>
        </div>

        <div className={styles.bottomGrid}>
          <div className={styles.queuePanel}>
            <div className={styles.panelTitle}>
              <Sparkles size={17} aria-hidden />
              <div><span>A LITTLE LESS TO HOLD</span><h3>Action queue</h3></div>
            </div>
            {urgent.length ? urgent.slice(0, 4).map((item) => (
              <button type="button" key={item.id} onClick={() => setSelectedId(item.id)}>
                <span className={`${styles.queueDot} ${toneClass(tone(item))}`} />
                <span><strong>{item.name}</strong><small>{percent(item)}% · about {round(item.current / item.dailyUse)} days left</small></span>
                <b>Review</b>
              </button>
            )) : (
              <div className={styles.allGood}><Check size={17} aria-hidden /> No low-stock actions right now.</div>
            )}
          </div>

          <div className={styles.activityPanel}>
            <div className={styles.panelTitle}>
              <Clock3 size={17} aria-hidden />
              <div><span>WHAT JUST HAPPENED</span><h3>Activity</h3></div>
            </div>
            <div className={styles.activityList}>
              {activity.map((entry, index) => (
                <div key={`${entry}-${index}`}>
                  <span>{index === 0 ? "NOW" : `0${index + 1}`}</span>
                  <p>{entry}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.detailSection} aria-label="Selected ingredient impact">
        <div>
          <span className={styles.monoLabel}>USED BY</span>
          <h2>{selected.name}<br /><span>touches {affectedRecipes.length} menu item{affectedRecipes.length === 1 ? "" : "s"}.</span></h2>
        </div>
        <div className={styles.impactList}>
          {affectedRecipes.map((recipe) => (
            <div key={recipe.id}>
              <strong>{recipe.name}</strong>
              <span>{recipe.ingredients[selected.id]} {selected.unit} / serving</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.previewNotice}>
        <TriangleAlert size={17} aria-hidden />
        <p><strong>Autoinventory-preview is simulation-only.</strong> Supplier names, prices, recipe quantities and inventory values are demo data. No email, SMS, purchasing, database or accounting action is performed yet.</p>
        <button type="button" onClick={resetDemo}><RefreshCw size={14} aria-hidden /> Reset preview</button>
      </section>
    </div>
  );
}
