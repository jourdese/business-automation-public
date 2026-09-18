"use client";

import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useMemo,
  useState,
} from "react";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  PackageCheck,
  Pencil,
  PlusCircle,
  ReceiptText,
  Save,
  ShoppingBasket,
  Trash2,
  X,
  Truck,
} from "lucide-react";
import { operationCatalog } from "@/command-center/core/business-registry";
import {
  estimatedPurchaseTotal,
  inventoryPercent,
  isPurchaseActive,
  projectedInventoryAtDelivery,
  purchaseProgressStage,
  projectedInventoryPercentAtDelivery,
  suggestedPurchaseQuantity,
  type CommandCenterInventoryItem,
  type CommandCenterMenuItem,
  type CommandCenterRecipe,
  type CommandCenterStockAdjustmentReason,
  type CommandCenterSupplier,
} from "@/command-center/core/runtime";
import { useCommandCenterRuntime } from "@/command-center/core/runtime-provider";
import MenuPhoto from "./MenuPhoto";
import SupplyPhoto from "./SupplyPhoto";
import styles from "./CommandCenter.module.css";

type AdjustmentDraft = {
  itemId: string;
  mode: "adjust" | "waste";
  amount: string;
  reason: CommandCenterStockAdjustmentReason;
};

type MenuEditorDraft = {
  id?: string;
  name: string;
  category: string;
  variant: string;
  currentPrice: string;
  description: string;
  active: boolean;
  available: boolean;
  recipeId: string;
};

type RecipeIngredientDraft = {
  itemId: string;
  amount: string;
};

type RecipeEditorDraft = {
  id?: string;
  name: string;
  description: string;
  notes: string;
  active: boolean;
  ingredients: RecipeIngredientDraft[];
};

type InventoryEditorDraft = {
  name: string;
  unit: string;
  zone: string;
  current: string;
  fullLevel: string;
  reorderAt: string;
  dailyUse: string;
  supplierId: string;
  contactId: string;
  packSize: string;
  packPrice: string;
  purchaseUnit: string;
  leadDays: string;
  purchasingMode: "fixed" | "quote";
  automationEnabled: boolean;
  automationMode: "assist" | "auto_contact" | "autobuy";
  automationTriggerPercent: string;
  maxAutoOrderSpend: string;
};

export default function OperationModuleView({
  businessId,
  moduleId,
}: {
  businessId: string;
  moduleId: string;
}) {

  const [adjustment, setAdjustment] = useState<AdjustmentDraft | null>(null);
  const [receiveDrafts, setReceiveDrafts] = useState<Record<string, string>>({});
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryZone, setInventoryZone] = useState("All");
  const [menuSearch, setMenuSearch] = useState("");
  const [menuCategory, setMenuCategory] = useState("All");
  const [menuEditor, setMenuEditor] = useState<MenuEditorDraft | null>(null);
  const [recipeEditor, setRecipeEditor] = useState<RecipeEditorDraft | null>(null);
  const [purchaseFilter, setPurchaseFilter] = useState<"active" | "history" | "all">("active");

  const {
    state,
    tasks,
    adjustInventory,
    receivePurchase,
    updatePurchaseQuantity,
    startOwnerPurchase,
    saveMenuItem,
    archiveMenuItem,
    saveRecipe,
    archiveRecipe,
    createInventoryItem,
    recordRecipeSale,
  } = useCommandCenterRuntime();

  const operationModule = operationCatalog[moduleId] ?? {
    label: moduleId,
    description: "Business operation managed by Jourvis.",
  };
  const moduleTasks = tasks.filter((task) => task.module === moduleId);
  const currentInventoryRoute =
    businessId === "marinara-ristorante" && moduleId === "inventory"
      ? "/restaurant/marinara-ristorante/Autoinventory-preview"
      : null;

  const supplierById = useMemo(
    () => new Map(state.suppliers.map((supplier) => [supplier.id, supplier])),
    [state.suppliers],
  );

  function openNewMenuItem() {
    setMenuEditor({
      name: "",
      category: "Pasta",
      variant: "",
      currentPrice: "",
      description: "",
      active: true,
      available: true,
      recipeId: "",
    });
  }

  function openMenuItemEditor(item: CommandCenterMenuItem) {
    setMenuEditor({
      id: item.id,
      name: item.name,
      category: item.category,
      variant: item.variant ?? "",
      currentPrice:
        item.currentPrice !== undefined ? String(item.currentPrice) : "",
      description: item.description ?? "",
      active: item.active,
      available: item.available,
      recipeId: item.recipeId ?? "",
    });
  }

  function submitMenuEditor() {
    if (!menuEditor) return;
    const currentPrice =
      menuEditor.currentPrice.trim() === ""
        ? undefined
        : Number(menuEditor.currentPrice);
    if (
      !menuEditor.name.trim() ||
      !menuEditor.category.trim() ||
      (currentPrice !== undefined &&
        (!Number.isFinite(currentPrice) || currentPrice < 0))
    ) {
      return;
    }

    saveMenuItem({
      id: menuEditor.id,
      name: menuEditor.name,
      category: menuEditor.category,
      variant: menuEditor.variant || undefined,
      currentPrice,
      description: menuEditor.description || undefined,
      active: menuEditor.active,
      available: menuEditor.available,
      recipeId: menuEditor.recipeId || undefined,
    });
    setMenuEditor(null);
  }

  function openNewRecipe() {
    setRecipeEditor({
      name: "",
      description: "",
      notes: "",
      active: true,
      ingredients: [],
    });
  }

  function openRecipeEditor(recipe: CommandCenterRecipe) {
    setRecipeEditor({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      notes: recipe.notes ?? "",
      active: recipe.active,
      ingredients: Object.entries(recipe.ingredients).map(
        ([itemId, amount]) => ({
          itemId,
          amount: String(amount),
        }),
      ),
    });
  }

  function submitRecipeEditor() {
    if (!recipeEditor || !recipeEditor.name.trim()) return;

    const ingredients = Object.fromEntries(
      recipeEditor.ingredients
        .map((entry) => [entry.itemId, Number(entry.amount)] as const)
        .filter(
          ([itemId, amount]) =>
            Boolean(itemId) && Number.isFinite(amount) && amount > 0,
        ),
    );

    saveRecipe({
      id: recipeEditor.id,
      name: recipeEditor.name,
      description: recipeEditor.description,
      notes: recipeEditor.notes || undefined,
      active: recipeEditor.active,
      ingredients,
    });
    setRecipeEditor(null);
  }

  function openAdjustment(
    itemId: string,
    mode: AdjustmentDraft["mode"],
  ) {
    setAdjustment({
      itemId,
      mode,
      amount: "",
      reason: mode === "waste" ? "waste" : "physical_count",
    });
  }

  function applyAdjustment() {
    if (!adjustment) return;
    const amount = Number(adjustment.amount);
    if (!Number.isFinite(amount) || amount === 0) return;
    if (adjustment.mode === "waste" && amount < 0) return;

    adjustInventory(
      adjustment.itemId,
      adjustment.mode === "waste" ? -amount : amount,
      adjustment.mode === "waste" ? "waste" : adjustment.reason,
    );
    setAdjustment(null);
  }

  if (moduleId === "inventory" && state.inventory.length) {
    const zones = [
      "All",
      ...Array.from(
        new Set(
          state.inventory
            .map((item) => item.zone)
            .filter((zone): zone is string => Boolean(zone)),
        ),
      ),
    ];
    const normalizedSearch = inventorySearch.trim().toLowerCase();
    const visibleInventory = state.inventory.filter((item) => {
      const matchesZone = inventoryZone === "All" || item.zone === inventoryZone;
      const matchesSearch =
        !normalizedSearch ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        (supplierById.get(item.supplierId)?.name ?? "")
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesZone && matchesSearch;
    });

    return (
      <section className={styles.sectionPage}>
        <OperationHeader
          businessId={businessId}
          moduleLabel={operationModule.label}
          description={operationModule.description}
        />

        <div className={styles.operationModuleHero}>
          <div>
            <span>JOURVIS OPERATING</span>
            <h2>
              {moduleTasks.length
                ? `${moduleTasks.length} inventory exception${moduleTasks.length === 1 ? "" : "s"} need you.`
                : "Inventory is operating inside its rules."}
            </h2>
            <p>
              Jourvis watches stock, keeps incoming separate from on-hand inventory,
              starts approved purchasing work, and records every manual adjustment
              and automatic change in Activity.
            </p>
          </div>
          <Bot size={36} aria-hidden />
        </div>

        <div className={styles.inventoryToolbar}>
          <input
            type="search"
            value={inventorySearch}
            onChange={(event) => setInventorySearch(event.target.value)}
            placeholder="Search supply or supplier"
            aria-label="Search inventory"
          />
          <div className={styles.inventoryZoneFilters}>
            {zones.map((zone) => (
              <button
                key={zone}
                type="button"
                data-active={inventoryZone === zone}
                onClick={() => setInventoryZone(zone)}
              >
                {zone}
              </button>
            ))}
          </div>
          <span>{visibleInventory.length} of {state.inventory.length} supplies</span>
        </div>

        <div className={styles.inventoryCardGrid}>
          {visibleInventory.map((item) => {
            const percent = inventoryPercent(item);
            const projected = projectedInventoryAtDelivery(item);
            const projectedPercent = projectedInventoryPercentAtDelivery(item);
            const low = item.current <= item.reorderAt;
            const task = tasks.find((entry) => entry.entityId === item.id);
            const supplier = supplierById.get(item.supplierId);
            const usedByRecipes = state.recipes.filter(
              (recipe) => item.id in recipe.ingredients,
            );
            const daysCover =
              item.dailyUse && item.dailyUse > 0
                ? Math.round((item.current / item.dailyUse) * 10) / 10
                : null;
            const editing = adjustment?.itemId === item.id;

            return (
              <article
                className={styles.inventoryCard}
                data-low={low}
                key={item.id}
              >
                <div className={styles.inventoryCardTop}>
                  <SupplyPhoto
                    supplyId={item.id}
                    className={styles.operationSupplyPhoto}
                    size={74}
                  />
                  <div>
                    <span>{item.zone ?? "Inventory"}</span>
                    <h3>{item.name}</h3>
                    <p>{supplier?.name ?? item.supplierId}</p>
                  </div>
                  <b data-alert={Boolean(task)}>
                    {task ? "Needs owner" : low ? "Low" : `${percent}%`}
                  </b>
                </div>

                <div className={styles.inventoryLevels}>
                  <div>
                    <span>On hand</span>
                    <strong>{item.current} {item.unit}</strong>
                    <small>Full {item.fullLevel} {item.unit}</small>
                  </div>
                  <div>
                    <span>Incoming</span>
                    <strong>{item.incoming} {item.unit}</strong>
                    <small>{item.purchaseUnit}</small>
                  </div>
                  <div>
                    <span>Projected at delivery</span>
                    <strong>{projected} {item.unit}</strong>
                    <small>{projectedPercent}% of full level</small>
                  </div>
                  <div>
                    <span>Daily use</span>
                    <strong>{item.dailyUse ?? "—"} {item.dailyUse ? item.unit : ""}</strong>
                    <small>Trigger {item.automationTriggerPercent}%</small>
                  </div>
                  <div>
                    <span>Days cover</span>
                    <strong>{daysCover !== null ? `${daysCover} days` : "—"}</strong>
                    <small>Based on configured daily use</small>
                  </div>
                </div>

                {usedByRecipes.length ? (
                  <div className={styles.inventoryUsedBy}>
                    <span>USED BY</span>
                    <div>
                      {usedByRecipes.map((recipe) => (
                        <span key={recipe.id}>
                          <strong>{recipe.name}</strong>
                          <small>
                            {recipe.ingredients[item.id]} {item.unit} / sale
                          </small>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className={styles.inventoryActions}>
                  <button
                    type="button"
                    onClick={() => openAdjustment(item.id, "adjust")}
                  >
                    <PlusCircle size={14} aria-hidden /> Adjust stock
                  </button>
                  <button
                    type="button"
                    data-danger
                    onClick={() => openAdjustment(item.id, "waste")}
                  >
                    <Trash2 size={14} aria-hidden /> Record waste
                  </button>
                </div>

                {editing ? (
                  <div className={styles.inlineAdjustment}>
                    <div>
                      <strong>
                        {adjustment.mode === "waste"
                          ? `Waste / spoilage · ${item.name}`
                          : `Adjust stock · ${item.name}`}
                      </strong>
                      <small>
                        {adjustment.mode === "waste"
                          ? "This manual action will be written to Activity with its reason and timestamp."
                          : "Enter a positive or negative change. Jourvis will clamp the final stock level at zero and record the exact applied correction."}
                      </small>
                    </div>

                    {adjustment.mode === "adjust" ? (
                      <select
                        value={adjustment.reason}
                        onChange={(event) =>
                          setAdjustment((current) =>
                            current
                              ? {
                                  ...current,
                                  reason: event.target.value as CommandCenterStockAdjustmentReason,
                                }
                              : current,
                          )
                        }
                      >
                        <option value="physical_count">Physical count correction</option>
                        <option value="external_delivery">Outside-Jourvis delivery</option>
                        <option value="transfer">Stock transfer in</option>
                        <option value="other">Other increase</option>
                      </select>
                    ) : null}

                    <div className={styles.adjustmentAmount}>
                      <input
                        type="number"
                        min={adjustment.mode === "waste" ? "0" : undefined}
                        step="0.01"
                        placeholder={adjustment.mode === "waste" ? "Amount" : "Change by (+ / -)"}
                        value={adjustment.amount}
                        onChange={(event) =>
                          setAdjustment((current) =>
                            current ? { ...current, amount: event.target.value } : current,
                          )
                        }
                      />
                      <span>{item.unit}</span>
                    </div>

                    <div className={styles.adjustmentButtons}>
                      <button type="button" onClick={() => setAdjustment(null)}>
                        Cancel
                      </button>
                      <button type="button" data-primary onClick={applyAdjustment}>
                        Apply
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        {currentInventoryRoute ? (
          <article className={styles.migrationCard}>
            <div>
              <span>LEGACY REFERENCE</span>
              <strong>Previous Autoinventory remains available during parity checks</strong>
              <p>
                The Command Center is now the migration target. The legacy workspace is kept
                only as a reference while remaining detailed behavior is verified.
              </p>
            </div>
            <a href={currentInventoryRoute}>
              Open legacy inventory <ArrowRight size={14} />
            </a>
          </article>
        ) : null}
      </section>
    );
  }

  if (moduleId === "purchasing") {
    const activePurchaseItemIds = new Set(
      state.purchases
        .filter((purchase) => isPurchaseActive(purchase.status))
        .map((purchase) => purchase.itemId),
    );
    const supplierRestockGroups = Array.from(
      state.inventory
        .filter(
          (item) =>
            item.current <= item.reorderAt &&
            suggestedPurchaseQuantity(item) > 0 &&
            !state.pausedItemIds.includes(item.id) &&
            !activePurchaseItemIds.has(item.id),
        )
        .reduce((groups, item) => {
          const key = `${item.supplierId}::${item.purchasingMode}`;
          const current = groups.get(key) ?? [];
          current.push(item);
          groups.set(key, current);
          return groups;
        }, new Map<string, typeof state.inventory>()),
    ).map(([, items]) => items);

    const purchases = [...state.purchases]
      .filter((purchase) =>
        purchaseFilter === "all"
          ? true
          : purchaseFilter === "active"
            ? isPurchaseActive(purchase.status)
            : !isPurchaseActive(purchase.status),
      )
      .sort((a, b) => {
        const active = Number(isPurchaseActive(b.status)) - Number(isPurchaseActive(a.status));
        if (active) return active;
        return b.createdAt.localeCompare(a.createdAt);
      });

    return (
      <section className={styles.sectionPage}>
        <OperationHeader
          businessId={businessId}
          moduleLabel={operationModule.label}
          description={operationModule.description}
        />

        <div className={styles.operationModuleHero}>
          <div>
            <span>AUTOMATED PURCHASING</span>
            <h2>Jourvis handles the supplier workflow until a real decision is needed.</h2>
            <p>
              Requests, quotes, confirmation, transit, partial receiving, and final receiving
              now share one Command Center runtime and one Activity history.
            </p>
          </div>
          <Truck size={36} aria-hidden />
        </div>

        <div className={styles.purchaseToolbar}>
          <div>
            {(["active", "history", "all"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                data-active={purchaseFilter === filter}
                onClick={() => setPurchaseFilter(filter)}
              >
                {filter === "active"
                  ? "Active"
                  : filter === "history"
                    ? "History"
                    : "All"}
              </button>
            ))}
          </div>
          <span>{purchases.length} purchase{purchases.length === 1 ? "" : "s"}</span>
        </div>

        {supplierRestockGroups.length ? (
          <section className={styles.restockSuggestionPanel}>
            <header>
              <div>
                <span>RESTOCK SUGGESTIONS</span>
                <h3>Approve supplier work without merging item authority.</h3>
                <p>
                  Items are grouped here by supplier and purchase mode for owner review.
                  Starting a group still creates one purchase workflow per item.
                </p>
              </div>
              <strong>{supplierRestockGroups.length} supplier group{supplierRestockGroups.length === 1 ? "" : "s"}</strong>
            </header>

            <div className={styles.restockSuggestionGrid}>
              {supplierRestockGroups.map((items) => {
                const first = items[0];
                const supplier = supplierById.get(first.supplierId);
                const contact =
                  supplier?.contacts.find((entry) => entry.id === first.contactId) ??
                  supplier?.contacts[0];
                const estimatedTotal = items.reduce(
                  (sum, item) =>
                    sum +
                    estimatedPurchaseTotal(
                      item,
                      suggestedPurchaseQuantity(item),
                    ),
                  0,
                );

                return (
                  <article
                    className={styles.restockSuggestionCard}
                    key={`${first.supplierId}-${first.purchasingMode}`}
                  >
                    <header>
                      <div>
                        <span>{first.purchasingMode === "quote" ? "QUOTE REQUIRED" : "FIXED PRICE"}</span>
                        <strong>{supplier?.name ?? first.supplierId}</strong>
                        <small>
                          {contact
                            ? `${contact.name} · ${contact.role} · ${contact.channel}`
                            : "Configured supplier contact"}
                        </small>
                      </div>
                      <b>
                        {first.purchasingMode === "quote"
                          ? `Est. ₱${Math.round(estimatedTotal).toLocaleString("en-PH")}`
                          : `₱${Math.round(estimatedTotal).toLocaleString("en-PH")}`}
                      </b>
                    </header>

                    <div>
                      {items.map((item) => (
                        <div className={styles.restockSuggestionLine} key={item.id}>
                          <SupplyPhoto
                            supplyId={item.id}
                            className={styles.supplierSupplyPhoto}
                            size={38}
                          />
                          <span>
                            <strong>{item.name}</strong>
                            <small>
                              {item.current}/{item.fullLevel} {item.unit} · warning at {item.reorderAt}
                            </small>
                          </span>
                          <b>{suggestedPurchaseQuantity(item)} {item.unit}</b>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className={styles.recipeSaleButton}
                      onClick={() => items.forEach((item) => startOwnerPurchase(item.id))}
                    >
                      Start supplier flow
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className={styles.purchaseCardList}>
          {purchases.map((purchase) => {
            const item = state.inventory.find((entry) => entry.id === purchase.itemId);
            const task = tasks.find((entry) => entry.requestId === purchase.id);
            const supplier = supplierById.get(purchase.supplierId);
            const contact =
              supplier?.contacts.find((entry) => entry.id === purchase.contactId) ??
              supplier?.contacts[0];
            const progressStage = purchaseProgressStage(purchase.status);
            const received = purchase.receivedQuantity ?? 0;
            const remaining = Math.max(0, purchase.quantity - received);
            const canReceive =
              purchase.status === "in_transit" ||
              purchase.status === "partial_received";
            const receiveValue = receiveDrafts[purchase.id] ?? String(remaining || "");
            const editableQuantity = ![
              "awaiting_confirmation",
              "confirmed",
              "in_transit",
              "partial_received",
              "received",
              "rejected",
            ].includes(purchase.status);
            const quantityValue =
              quantityDrafts[purchase.id] ?? String(purchase.quantity);

            return (
              <article className={styles.purchaseCard} key={purchase.id}>
                <div className={styles.purchaseIdentity}>
                  <SupplyPhoto
                    supplyId={purchase.itemId}
                    className={styles.purchaseSupplyPhoto}
                    size={58}
                  />
                  <div>
                    <span>{purchase.id}</span>
                    <h3>{item?.name ?? purchase.itemId}</h3>
                    <p>
                      {purchase.origin === "jourvis"
                        ? "Started automatically by Jourvis"
                        : "Started after owner approval"}
                      {" · "}
                      {supplier?.name ?? purchase.supplierId}
                      {contact ? ` · ${contact.name} · ${contact.channel}` : ""}
                    </p>
                  </div>
                </div>

                <div
                  className={styles.purchaseProgress}
                  aria-label={`${purchase.id} purchase progress`}
                >
                  {[
                    [1, "Request"],
                    [2, "Supplier"],
                    [3, "Agreement"],
                    [4, "Confirmed"],
                    [5, "Received"],
                  ].map(([stage, label]) => (
                    <span
                      key={String(label)}
                      data-reached={progressStage >= Number(stage)}
                    >
                      <i aria-hidden />
                      {label}
                    </span>
                  ))}
                </div>

                <div className={styles.purchaseConfirmations}>
                  <span data-confirmed={Boolean(purchase.buyerConfirmed)}>
                    <i aria-hidden />
                    Buyer {purchase.buyerConfirmed ? "confirmed" : "pending"}
                  </span>
                  <span data-confirmed={Boolean(purchase.supplierConfirmed)}>
                    <i aria-hidden />
                    Supplier {purchase.supplierConfirmed ? "confirmed" : "pending"}
                  </span>
                  {contact?.email ? <small>{contact.email}</small> : null}
                </div>

                <div className={styles.purchaseFacts}>
                  <div><span>Quantity</span><strong>{purchase.quantity} {item?.unit ?? ""}</strong></div>
                  <div><span>Value</span><strong>₱{Math.round(purchase.quotedTotal ?? purchase.estimatedTotal).toLocaleString("en-PH")}</strong></div>
                  <div>
                    <span>Pack price</span>
                    <strong>
                      {purchase.quotedPackPrice !== undefined
                        ? `₱${Math.round(purchase.quotedPackPrice).toLocaleString("en-PH")}`
                        : item?.purchasingMode === "quote"
                          ? "Awaiting quote"
                          : `₱${Math.round(item?.packPrice ?? 0).toLocaleString("en-PH")}`}
                    </strong>
                  </div>
                  <div><span>Delivery fee</span><strong>{purchase.deliveryFee !== undefined ? `₱${Math.round(purchase.deliveryFee).toLocaleString("en-PH")}` : "—"}</strong></div>
                  <div><span>ETA</span><strong>{purchase.etaDays !== undefined ? `${purchase.etaDays} day${purchase.etaDays === 1 ? "" : "s"}` : "Pending"}</strong></div>
                  <div><span>Mode</span><strong>{item?.purchasingMode === "quote" ? "Supplier quote" : "Fixed price"}</strong></div>
                  <div><span>Received</span><strong>{received} {item?.unit ?? ""}</strong></div>
                  <div>
                    <span>Status</span>
                    <strong data-alert={Boolean(task)}>
                      {task ? "Needs owner" : purchase.status.replaceAll("_", " ")}
                    </strong>
                  </div>
                </div>

                <div className={styles.purchaseExplanation}>
                  <span>WHY THIS WORKFLOW EXISTS</span>
                  <p>{purchase.explanation}</p>
                </div>

                {editableQuantity && item ? (
                  <div className={styles.quantityEditor}>
                    <div>
                      <strong>Requested quantity</strong>
                      <small>Update before supplier confirmation; Jourvis will recalculate the request.</small>
                    </div>
                    <input
                      type="number"
                      min={item.packSize}
                      step="0.01"
                      value={quantityValue}
                      onChange={(event) =>
                        setQuantityDrafts((current) => ({
                          ...current,
                          [purchase.id]: event.target.value,
                        }))
                      }
                    />
                    <span>{item.unit}</span>
                    <button
                      type="button"
                      onClick={() => {
                        updatePurchaseQuantity(
                          purchase.id,
                          Number(quantityValue),
                        );
                        setQuantityDrafts((current) => {
                          const next = { ...current };
                          delete next[purchase.id];
                          return next;
                        });
                      }}
                    >
                      Update request
                    </button>
                  </div>
                ) : null}

                {canReceive && item ? (
                  <div className={styles.receivingBar}>
                    <PackageCheck size={17} aria-hidden />
                    <div>
                      <strong>Receive physical delivery</strong>
                      <small>{remaining} {item.unit} still incoming</small>
                    </div>
                    <input
                      type="number"
                      min="0.01"
                      max={remaining}
                      step="0.01"
                      value={receiveValue}
                      onChange={(event) =>
                        setReceiveDrafts((current) => ({
                          ...current,
                          [purchase.id]: event.target.value,
                        }))
                      }
                    />
                    <span>{item.unit}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const quantity = Number(receiveValue);
                        receivePurchase(purchase.id, quantity);
                        setReceiveDrafts((current) => {
                          const next = { ...current };
                          delete next[purchase.id];
                          return next;
                        });
                      }}
                    >
                      Receive
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}

          {!purchases.length ? (
            <article className={styles.panelCard}>
              <PanelEmpty
                icon={<CheckCircle2 size={17} />}
                title={purchaseFilter === "active" ? "No active purchases" : "No purchases in this view"}
                body={
                  purchaseFilter === "active"
                    ? "Jourvis will create purchasing work when an eligible automatic task reaches its trigger."
                    : "Change the filter to review other purchasing activity."
                }
              />
            </article>
          ) : null}
        </div>
      </section>
    );
  }

  if (moduleId === "suppliers") {
    return (
      <section className={styles.sectionPage}>
        <OperationHeader
          businessId={businessId}
          moduleLabel={operationModule.label}
          description={operationModule.description}
        />

        <div className={styles.supplierRuntimeGrid}>
          {state.suppliers.map((supplier) => {
            const suppliedItems = state.inventory.filter((item) =>
              supplier.itemIds.includes(item.id),
            );
            const activeSupplierPurchases = state.purchases.filter(
              (purchase) =>
                purchase.supplierId === supplier.id &&
                isPurchaseActive(purchase.status),
            );

            return (
              <article className={styles.supplierCardDetailed} key={supplier.id}>
                <header>
                  <div>
                    <span>SUPPLIER</span>
                    <h3>{supplier.name}</h3>
                  </div>
                  <b>{activeSupplierPurchases.length} active</b>
                </header>

                <div className={styles.supplierPriceList}>
                  {suppliedItems.map((item) => (
                    <div key={item.id}>
                      <SupplyPhoto
                        supplyId={item.id}
                        className={styles.supplierSupplyPhoto}
                        size={44}
                      />
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.purchaseUnit}</small>
                      </span>
                      <span>
                        <strong>₱{Math.round(item.packPrice).toLocaleString("en-PH")}</strong>
                        <small>{item.purchasingMode === "quote" ? "quote basis" : "fixed price"}</small>
                      </span>
                      <span>
                        <strong>{item.leadDays} day{item.leadDays === 1 ? "" : "s"}</strong>
                        <small>lead time</small>
                      </span>
                    </div>
                  ))}
                </div>

                <div className={styles.supplierContacts}>
                  {supplier.contacts.map((contact) => (
                    <div key={contact.id}>
                      <strong>{contact.name}</strong>
                      <small>{contact.role}</small>
                      <span>{contact.channel} · {contact.phone}</span>
                      <span>{contact.email}</span>
                    </div>
                  ))}
                </div>

                <footer>
                  <span>{suppliedItems.length} supplied items</span>
                  <span>
                    Avg lead {suppliedItems.length
                      ? (
                          suppliedItems.reduce((sum, item) => sum + item.leadDays, 0) /
                          suppliedItems.length
                        ).toFixed(1)
                      : "—"} days
                  </span>
                </footer>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  if (moduleId === "menu") {
    const categories = [
      "All",
      ...Array.from(new Set(state.menuItems.map((item) => item.category))),
    ];
    const normalizedSearch = menuSearch.trim().toLowerCase();
    const visibleMenuItems = state.menuItems.filter((item) => {
      const matchesCategory =
        menuCategory === "All" || item.category === menuCategory;
      const matchesSearch =
        !normalizedSearch ||
        [
          item.name,
          item.printedName,
          item.category,
          item.variant ?? "",
          item.description ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
    const mappedCount = state.menuItems.filter((item) => item.recipeId).length;
    const pricedCount = state.menuItems.filter(
      (item) => item.currentPrice !== undefined,
    ).length;
    const archivedReferenceCount = state.menuItems.filter(
      (item) => item.referenceSource === "archived-menu-photo",
    ).length;
    const referenceYear =
      state.menuItems.find((item) => item.referencePublicationDate)
        ?.referencePublicationDate?.slice(0, 4) ?? "archived";
    const editingMenuItem = menuEditor?.id
      ? state.menuItems.find((item) => item.id === menuEditor.id)
      : undefined;

    return (
      <section className={styles.sectionPage}>
        <OperationHeader
          businessId={businessId}
          moduleLabel={operationModule.label}
          description={operationModule.description}
        />

        <div className={styles.operationModuleHero}>
          <div>
            <span>MENU MANAGEMENT</span>
            <h2>Manage live menu configuration without overwriting historical references.</h2>
            <p>
              Add and edit menu items, current selling prices, availability, and recipe links.
              Archived source prices remain immutable reference data.
            </p>
          </div>
          <ChefHat size={36} aria-hidden />
        </div>

        <div className={styles.entityToolbar}>
          <div>
            <button type="button" data-primary onClick={openNewMenuItem}>
              <PlusCircle size={15} aria-hidden /> Add menu item
            </button>
          </div>
          <span>{state.menuItems.filter((item) => item.active).length} active · {state.menuItems.length} total</span>
        </div>

        {menuEditor ? (
          <MenuEditorPanel
            draft={menuEditor}
            setDraft={setMenuEditor}
            existing={editingMenuItem}
            recipes={state.recipes}
            onSave={submitMenuEditor}
            onCancel={() => setMenuEditor(null)}
          />
        ) : null}

        <div className={styles.activitySummary}>
          <article>
            <span>ARCHIVED REFERENCES</span>
            <strong>{archivedReferenceCount}</strong>
            <small>source-backed entries from {referenceYear}</small>
          </article>
          <article>
            <span>RECIPE MAPPED</span>
            <strong>{mappedCount}</strong>
            <small>items connected to inventory usage</small>
          </article>
          <article>
            <span>CURRENT PRICE SET</span>
            <strong>{pricedCount}</strong>
            <small>owner-managed live/demo selling prices</small>
          </article>
        </div>

        <div className={styles.inventoryToolbar}>
          <input
            type="search"
            value={menuSearch}
            onChange={(event) => setMenuSearch(event.target.value)}
            placeholder="Search menu item or category"
            aria-label="Search menu"
          />
          <div className={styles.inventoryZoneFilters}>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                data-active={menuCategory === category}
                onClick={() => setMenuCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <span>{visibleMenuItems.length} of {state.menuItems.length} items</span>
        </div>

        <article className={styles.migrationCard}>
          <div>
            <span>REFERENCE DATA</span>
            <strong>Current price and archived price are intentionally separate</strong>
            <p>
              Editing a menu item changes live Command Center configuration only. Historical
              menu source, publication date, printed name, and archived reference price remain preserved.
            </p>
          </div>
        </article>

        <div className={styles.menuGrid}>
          {visibleMenuItems.map((menuItem) => {
            const recipe = menuItem.recipeId
              ? state.recipes.find((entry) => entry.id === menuItem.recipeId)
              : undefined;
            const ingredients = recipe
              ? Object.entries(recipe.ingredients).flatMap(([itemId, amount]) => {
                  const item = state.inventory.find((entry) => entry.id === itemId);
                  if (!item) return [];
                  const unitCost = item.packPrice / Math.max(item.packSize, 0.01);
                  return [{
                    item,
                    amount,
                    cost: unitCost * amount,
                    servings: amount > 0 ? Math.floor(item.current / amount) : 999,
                  }];
                })
              : [];
            const ingredientCost = ingredients.reduce(
              (sum, entry) => sum + entry.cost,
              0,
            );
            const possibleServings = ingredients.length
              ? Math.min(...ingredients.map((entry) => entry.servings))
              : null;
            const riskyIngredients = ingredients.filter(
              ({ item }) => item.current <= item.reorderAt,
            );
            const foodCostPercent =
              recipe &&
              menuItem.currentPrice !== undefined &&
              menuItem.currentPrice > 0
                ? Math.round((ingredientCost / menuItem.currentPrice) * 1000) / 10
                : null;

            return (
              <article
                className={styles.menuCard}
                data-inactive={!menuItem.active}
                key={menuItem.id}
              >
                {recipe ? (
                  <MenuPhoto
                    menuId={recipe.id}
                    className={styles.menuDishPhoto}
                  />
                ) : (
                  <span className={styles.menuDishPlaceholder} aria-hidden>
                    <ChefHat size={30} />
                  </span>
                )}

                <div className={styles.menuCardBody}>
                  <div className={styles.menuCardTitle}>
                    <div>
                      <span>
                        {menuItem.category}
                        {menuItem.variant ? " · " + menuItem.variant : ""}
                      </span>
                      <h3>{menuItem.name}</h3>
                    </div>
                    <b
                      data-risk={
                        menuItem.active &&
                        menuItem.available &&
                        Boolean(recipe?.active) &&
                        riskyIngredients.length > 0
                      }
                    >
                      {!menuItem.active
                        ? "Archived"
                        : !menuItem.available
                          ? "Unavailable"
                          : recipe?.active
                            ? riskyIngredients.length
                              ? riskyIngredients.length + " stock risk"
                              : "Recipe mapped"
                            : menuItem.recipeId
                              ? "Recipe archived"
                              : "No recipe"}
                    </b>
                  </div>

                  <p>
                    {menuItem.description ||
                      recipe?.description ||
                      "No live description has been configured for this item."}
                  </p>

                  {menuItem.referenceSource === "archived-menu-photo" &&
                  menuItem.printedName !== menuItem.name ? (
                    <small className={styles.referenceLabel}>
                      Archived printed name: {menuItem.printedName}
                    </small>
                  ) : null}

                  <div className={styles.menuEconomics}>
                    <div>
                      <ReceiptText size={15} aria-hidden />
                      <span>
                        <small>Current selling price</small>
                        <strong>
                          {menuItem.currentPrice !== undefined
                            ? "₱" + Math.round(menuItem.currentPrice).toLocaleString("en-PH")
                            : "Not set"}
                        </strong>
                      </span>
                    </div>
                    <div>
                      <ReceiptText size={15} aria-hidden />
                      <span>
                        <small>Archived reference</small>
                        <strong>
                          {menuItem.referencePrice !== undefined
                            ? "₱" + Math.round(menuItem.referencePrice).toLocaleString("en-PH")
                            : "None"}
                        </strong>
                      </span>
                    </div>
                    <div>
                      <CircleDollarSign size={15} aria-hidden />
                      <span>
                        <small>Est. ingredient cost</small>
                        <strong>
                          {recipe
                            ? "₱" + Math.round(ingredientCost).toLocaleString("en-PH")
                            : "Recipe not mapped"}
                        </strong>
                      </span>
                    </div>
                    <div>
                      <CircleDollarSign size={15} aria-hidden />
                      <span>
                        <small>Food cost</small>
                        <strong>{foodCostPercent !== null ? foodCostPercent + "%" : "—"}</strong>
                      </span>
                    </div>
                    <div>
                      <ShoppingBasket size={15} aria-hidden />
                      <span>
                        <small>Possible servings</small>
                        <strong>{recipe ? possibleServings ?? 0 : "—"}</strong>
                      </span>
                    </div>
                  </div>

                  {recipe ? (
                    <div className={styles.menuIngredientStrip}>
                      {ingredients.map(({ item, amount }) => (
                        <div key={item.id} data-low={item.current <= item.reorderAt}>
                          <SupplyPhoto
                            supplyId={item.id}
                            className={styles.recipeSupplyPhoto}
                            size={38}
                          />
                          <span>
                            <strong>{item.name}</strong>
                            <small>{amount} {item.unit}</small>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className={styles.entityActions}>
                    {recipe?.active && menuItem.active && menuItem.available ? (
                      <button
                        type="button"
                        data-primary
                        onClick={() => recordRecipeSale(recipe.id, 1)}
                      >
                        Simulate POS sale
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => openMenuItemEditor(menuItem)}
                    >
                      <Pencil size={14} aria-hidden /> Edit
                    </button>
                    {menuItem.active ? (
                      <button
                        type="button"
                        data-danger
                        onClick={() => archiveMenuItem(menuItem.id)}
                      >
                        <Archive size={14} aria-hidden /> Archive
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          saveMenuItem({
                            id: menuItem.id,
                            name: menuItem.name,
                            category: menuItem.category,
                            variant: menuItem.variant,
                            currentPrice: menuItem.currentPrice,
                            description: menuItem.description,
                            active: true,
                            available: menuItem.available,
                            recipeId: menuItem.recipeId,
                          });
                        }}
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {!visibleMenuItems.length ? (
            <article className={styles.panelCard}>
              <PanelEmpty
                icon={<ChefHat size={17} />}
                title="No menu items in this view"
                body="Add a menu item or change the current search/category filter."
              />
            </article>
          ) : null}
        </div>
      </section>
    );
  }

  if (moduleId === "recipes") {
    const editingRecipe = recipeEditor?.id
      ? state.recipes.find((recipe) => recipe.id === recipeEditor.id)
      : undefined;

    return (
      <section className={styles.sectionPage}>
        <OperationHeader
          businessId={businessId}
          moduleLabel={operationModule.label}
          description={operationModule.description}
        />

        <div className={styles.operationModuleHero}>
          <div>
            <span>RECIPE MANAGEMENT</span>
            <h2>Configure what every menu item consumes.</h2>
            <p>
              Create and edit recipes against real inventory items. Changes immediately
              affect menu cost estimates, possible servings, stock risk, and simulated POS deductions.
            </p>
          </div>
          <ReceiptText size={36} aria-hidden />
        </div>

        <div className={styles.entityToolbar}>
          <div>
            <button type="button" data-primary onClick={openNewRecipe}>
              <PlusCircle size={15} aria-hidden /> Add recipe
            </button>
          </div>
          <span>{state.recipes.filter((recipe) => recipe.active).length} active · {state.recipes.length} total</span>
        </div>

        {recipeEditor ? (
          <RecipeEditorPanel
            draft={recipeEditor}
            setDraft={setRecipeEditor}
            existing={editingRecipe}
            inventory={state.inventory}
            suppliers={state.suppliers}
            menuItems={state.menuItems}
            onCreateInventoryItem={createInventoryItem}
            onSave={submitRecipeEditor}
            onCancel={() => setRecipeEditor(null)}
          />
        ) : null}

        <div className={styles.recipeGrid}>
          {state.recipes.map((recipe) => {
            const linkedMenuItems = state.menuItems.filter(
              (item) => item.recipeId === recipe.id,
            );
            const ingredientCost = Object.entries(recipe.ingredients).reduce(
              (sum, [itemId, amount]) => {
                const item = state.inventory.find((entry) => entry.id === itemId);
                if (!item) return sum;
                return sum + (item.packPrice / Math.max(item.packSize, 0.01)) * amount;
              },
              0,
            );

            return (
              <article
                className={styles.recipeCard}
                data-inactive={!recipe.active}
                key={recipe.id}
              >
                <MenuPhoto
                  menuId={recipe.id}
                  className={styles.recipeDishPhoto}
                />
                <header>
                  <div>
                    <span>{recipe.active ? "RECIPE" : "ARCHIVED RECIPE"}</span>
                    <h3>{recipe.name}</h3>
                    <p>{recipe.description || "No recipe description configured."}</p>
                  </div>
                  <ShoppingBasket size={20} aria-hidden />
                </header>

                <div className={styles.recipeSummary}>
                  <span>
                    <small>Ingredient cost</small>
                    <strong>₱{Math.round(ingredientCost).toLocaleString("en-PH")}</strong>
                  </span>
                  <span>
                    <small>Ingredients</small>
                    <strong>{Object.keys(recipe.ingredients).length}</strong>
                  </span>
                  <span>
                    <small>Linked menu items</small>
                    <strong>{linkedMenuItems.length}</strong>
                  </span>
                </div>

                {recipe.notes ? (
                  <p className={styles.recipeNotes}>{recipe.notes}</p>
                ) : null}

                <div className={styles.recipeIngredients}>
                  {Object.entries(recipe.ingredients).map(([itemId, amount]) => {
                    const item = state.inventory.find((entry) => entry.id === itemId);
                    return (
                      <div key={itemId}>
                        <SupplyPhoto
                          supplyId={itemId}
                          className={styles.recipeSupplyPhoto}
                          size={42}
                        />
                        <span>
                          <strong>{item?.name ?? itemId}</strong>
                          <small>{amount} {item?.unit ?? ""} / sale</small>
                        </span>
                      </div>
                    );
                  })}
                </div>

                {linkedMenuItems.length ? (
                  <div className={styles.recipeLinkedMenu}>
                    <span>USED BY MENU</span>
                    <div>
                      {linkedMenuItems.map((item) => (
                        <small key={item.id}>
                          {item.name}{item.variant ? " · " + item.variant : ""}
                        </small>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className={styles.entityActions}>
                  {recipe.active ? (
                    <button
                      type="button"
                      data-primary
                      onClick={() => recordRecipeSale(recipe.id, 1)}
                    >
                      Simulate POS sale
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openRecipeEditor(recipe)}
                  >
                    <Pencil size={14} aria-hidden /> Edit
                  </button>
                  {recipe.active ? (
                    <button
                      type="button"
                      data-danger
                      onClick={() => archiveRecipe(recipe.id)}
                    >
                      <Archive size={14} aria-hidden /> Archive
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        saveRecipe({
                          id: recipe.id,
                          name: recipe.name,
                          description: recipe.description,
                          notes: recipe.notes,
                          active: true,
                          ingredients: recipe.ingredients,
                        })
                      }
                    >
                      Restore
                    </button>
                  )}
                </div>
              </article>
            );
          })}

          {!state.recipes.length ? (
            <article className={styles.panelCard}>
              <PanelEmpty
                icon={<ReceiptText size={17} />}
                title="No recipes yet"
                body="Create a recipe and map its ingredients to inventory."
              />
            </article>
          ) : null}
        </div>
      </section>
    );
  }

  if (moduleId === "waste" && state.inventory.length) {
    return (
      <section className={styles.sectionPage}>
        <OperationHeader
          businessId={businessId}
          moduleLabel={operationModule.label}
          description={operationModule.description}
        />

        <div className={styles.wasteGrid}>
          {state.inventory.map((item) => {
            const editing =
              adjustment?.itemId === item.id && adjustment.mode === "waste";
            return (
              <article className={styles.wasteCard} key={item.id}>
                <SupplyPhoto
                  supplyId={item.id}
                  className={styles.operationSupplyPhoto}
                  size={62}
                />
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.current} {item.unit} on hand</small>
                </div>
                <button
                  type="button"
                  onClick={() => openAdjustment(item.id, "waste")}
                >
                  <Trash2 size={14} aria-hidden /> Log waste
                </button>

                {editing ? (
                  <div className={styles.wasteInline}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Amount"
                      value={adjustment.amount}
                      onChange={(event) =>
                        setAdjustment((current) =>
                          current ? { ...current, amount: event.target.value } : current,
                        )
                      }
                    />
                    <span>{item.unit}</span>
                    <button type="button" onClick={applyAdjustment}>Save</button>
                    <button type="button" onClick={() => setAdjustment(null)}>Cancel</button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.sectionPage}>
      <OperationHeader
        businessId={businessId}
        moduleLabel={operationModule.label}
        description={operationModule.description}
      />

      <div className={styles.operationModuleHero}>
        <div>
          <span>JOURVIS OPERATING MODEL</span>
          <h2>Automatic by default. Human by exception.</h2>
          <p>
            This shared module is ready for business-specific data and actions. Jourvis
            can monitor, plan, act, verify, and escalate through the same Command Center runtime.
          </p>
        </div>
        <Bot size={36} aria-hidden />
      </div>

      <div className={styles.operationStageGrid}>
        {[
          ["Monitor", "Watch the live business state and detect meaningful changes."],
          ["Plan", "Use rules and forecasts to prepare the next action."],
          ["Act", "Execute routine work automatically within authority."],
          ["Verify", "Confirm that the expected result actually occurred."],
          ["Escalate", "Ask the owner only when a rule, risk, or ambiguity requires it."],
        ].map(([title, description]) => (
          <article key={title}>
            <CheckCircle2 size={15} />
            <strong>{title}</strong>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function MenuEditorPanel({
  draft,
  setDraft,
  existing,
  recipes,
  onSave,
  onCancel,
}: {
  draft: MenuEditorDraft;
  setDraft: Dispatch<SetStateAction<MenuEditorDraft | null>>;
  existing?: CommandCenterMenuItem;
  recipes: CommandCenterRecipe[];
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <section className={styles.entityEditor}>
      <header>
        <div>
          <span>{draft.id ? "EDIT MENU ITEM" : "NEW MENU ITEM"}</span>
          <h3>{draft.id ? draft.name || "Menu item" : "Create menu item"}</h3>
          <p>
            Live fields can change freely. Archived source fields shown below are preserved.
          </p>
        </div>
        <button type="button" onClick={onCancel} aria-label="Close menu editor">
          <X size={16} aria-hidden />
        </button>
      </header>

      <div className={styles.entityEditorGrid}>
        <label>
          <span>Name</span>
          <input
            value={draft.name}
            onChange={(event) =>
              setDraft((current) =>
                current ? { ...current, name: event.target.value } : current,
              )
            }
          />
        </label>
        <label>
          <span>Category</span>
          <input
            value={draft.category}
            onChange={(event) =>
              setDraft((current) =>
                current ? { ...current, category: event.target.value } : current,
              )
            }
          />
        </label>
        <label>
          <span>Variant / size</span>
          <input
            value={draft.variant}
            placeholder="Solo, Sharing, 12-inch…"
            onChange={(event) =>
              setDraft((current) =>
                current ? { ...current, variant: event.target.value } : current,
              )
            }
          />
        </label>
        <label>
          <span>Current selling price</span>
          <div className={styles.moneyInput}>
            <b>₱</b>
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.currentPrice}
              placeholder="Not set"
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? { ...current, currentPrice: event.target.value }
                    : current,
                )
              }
            />
          </div>
        </label>
        <label>
          <span>Linked recipe</span>
          <select
            value={draft.recipeId}
            onChange={(event) =>
              setDraft((current) =>
                current ? { ...current, recipeId: event.target.value } : current,
              )
            }
          >
            <option value="">No recipe yet</option>
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.name}{recipe.active ? "" : " · archived"}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.entityEditorWide}>
          <span>Description</span>
          <textarea
            rows={3}
            value={draft.description}
            onChange={(event) =>
              setDraft((current) =>
                current
                  ? { ...current, description: event.target.value }
                  : current,
              )
            }
          />
        </label>
      </div>

      <div className={styles.entityToggleRow}>
        <label>
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(event) =>
              setDraft((current) =>
                current ? { ...current, active: event.target.checked } : current,
              )
            }
          />
          <span>Active menu item</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.available}
            onChange={(event) =>
              setDraft((current) =>
                current
                  ? { ...current, available: event.target.checked }
                  : current,
              )
            }
          />
          <span>Available for sale</span>
        </label>
      </div>

      {existing?.referenceSource === "archived-menu-photo" ? (
        <div className={styles.referenceLock}>
          <span>ARCHIVED REFERENCE · READ ONLY</span>
          <div>
            <strong>{existing.printedName}</strong>
            <small>
              {existing.referencePrice !== undefined
                ? `₱${Math.round(existing.referencePrice).toLocaleString("en-PH")}`
                : "Price unavailable"}
              {existing.referencePublicationDate
                ? ` · source date ${existing.referencePublicationDate}`
                : ""}
            </small>
          </div>
        </div>
      ) : null}

      <footer className={styles.entityEditorActions}>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" data-primary onClick={onSave}>
          <Save size={14} aria-hidden /> Save menu item
        </button>
      </footer>
    </section>
  );
}

function RecipeEditorPanel({
  draft,
  setDraft,
  existing,
  inventory,
  menuItems,
  onSave,
  onCancel,
}: {
  draft: RecipeEditorDraft;
  setDraft: Dispatch<SetStateAction<RecipeEditorDraft | null>>;
  existing?: CommandCenterRecipe;
  inventory: CommandCenterInventoryItem[];
  menuItems: CommandCenterMenuItem[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const costFor = (ingredients: Array<{ itemId: string; amount: string }>) =>
    ingredients.reduce((sum, entry) => {
      const item = inventory.find((candidate) => candidate.id === entry.itemId);
      const amount = Number(entry.amount);
      if (!item || !Number.isFinite(amount) || amount <= 0) return sum;
      return sum + (item.packPrice / Math.max(item.packSize, 0.01)) * amount;
    }, 0);

  const servingsFor = (ingredients: Array<{ itemId: string; amount: string }>) => {
    const possible = ingredients.flatMap((entry) => {
      const item = inventory.find((candidate) => candidate.id === entry.itemId);
      const amount = Number(entry.amount);
      if (!item || !Number.isFinite(amount) || amount <= 0) return [];
      return [Math.floor(item.current / amount)];
    });
    return possible.length ? Math.min(...possible) : 0;
  };

  const draftCost = costFor(draft.ingredients);
  const draftServings = servingsFor(draft.ingredients);
  const existingIngredients = existing
    ? Object.entries(existing.ingredients).map(([itemId, amount]) => ({
        itemId,
        amount: String(amount),
      }))
    : [];
  const previousCost = costFor(existingIngredients);
  const costDelta = draftCost - previousCost;
  const linkedCount = existing
    ? menuItems.filter((item) => item.recipeId === existing.id).length
    : 0;

  function addIngredient() {
    const used = new Set(draft.ingredients.map((entry) => entry.itemId));
    const nextItem = inventory.find((item) => !used.has(item.id));
    if (!nextItem) return;
    setDraft((current) =>
      current
        ? {
            ...current,
            ingredients: [
              ...current.ingredients,
              { itemId: nextItem.id, amount: "" },
            ],
          }
        : current,
    );
  }

  return (
    <section className={styles.entityEditor}>
      <header>
        <div>
          <span>{draft.id ? "EDIT RECIPE" : "NEW RECIPE"}</span>
          <h3>{draft.id ? draft.name || "Recipe" : "Create recipe"}</h3>
          <p>
            Ingredient quantities are per sale/serving and immediately drive stock usage and menu economics.
          </p>
        </div>
        <button type="button" onClick={onCancel} aria-label="Close recipe editor">
          <X size={16} aria-hidden />
        </button>
      </header>

      <div className={styles.entityEditorGrid}>
        <label>
          <span>Name</span>
          <input
            value={draft.name}
            onChange={(event) =>
              setDraft((current) =>
                current ? { ...current, name: event.target.value } : current,
              )
            }
          />
        </label>
        <label>
          <span>Status</span>
          <select
            value={draft.active ? "active" : "archived"}
            onChange={(event) =>
              setDraft((current) =>
                current
                  ? { ...current, active: event.target.value === "active" }
                  : current,
              )
            }
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className={styles.entityEditorWide}>
          <span>Description</span>
          <textarea
            rows={2}
            value={draft.description}
            onChange={(event) =>
              setDraft((current) =>
                current
                  ? { ...current, description: event.target.value }
                  : current,
              )
            }
          />
        </label>
        <label className={styles.entityEditorWide}>
          <span>Internal notes</span>
          <textarea
            rows={2}
            value={draft.notes}
            placeholder="Prep notes, portion guidance, kitchen notes…"
            onChange={(event) =>
              setDraft((current) =>
                current ? { ...current, notes: event.target.value } : current,
              )
            }
          />
        </label>
      </div>

      <div className={styles.recipeImpact}>
        <article>
          <span>EST. INGREDIENT COST</span>
          <strong>₱{Math.round(draftCost).toLocaleString("en-PH")}</strong>
          {existing ? (
            <small>
              {costDelta === 0
                ? "No cost change"
                : `${costDelta > 0 ? "+" : "-"}₱${Math.round(Math.abs(costDelta)).toLocaleString("en-PH")} vs saved recipe`}
            </small>
          ) : (
            <small>Based on configured inventory pack prices</small>
          )}
        </article>
        <article>
          <span>POSSIBLE SERVINGS</span>
          <strong>{draftServings}</strong>
          <small>Based on current on-hand inventory</small>
        </article>
        <article>
          <span>LINKED MENU ITEMS</span>
          <strong>{linkedCount}</strong>
          <small>These items will use the saved recipe immediately</small>
        </article>
      </div>

      <div className={styles.recipeBuilder}>
        <header>
          <div>
            <span>INGREDIENTS</span>
            <strong>{draft.ingredients.length} mapped</strong>
          </div>
          <button
            type="button"
            onClick={addIngredient}
            disabled={draft.ingredients.length >= inventory.length}
          >
            <PlusCircle size={14} aria-hidden /> Add ingredient
          </button>
        </header>

        <div className={styles.recipeBuilderLines}>
          {draft.ingredients.map((entry, index) => {
            const item = inventory.find((candidate) => candidate.id === entry.itemId);
            const usedByOtherLines = new Set(
              draft.ingredients
                .filter((_, lineIndex) => lineIndex !== index)
                .map((line) => line.itemId),
            );
            return (
              <div key={`${entry.itemId}-${index}`}>
                <select
                  value={entry.itemId}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            ingredients: current.ingredients.map((line, lineIndex) =>
                              lineIndex === index
                                ? { ...line, itemId: event.target.value }
                                : line,
                            ),
                          }
                        : current,
                    )
                  }
                >
                  {inventory.map((inventoryItem) => (
                    <option
                      key={inventoryItem.id}
                      value={inventoryItem.id}
                      disabled={usedByOtherLines.has(inventoryItem.id)}
                    >
                      {inventoryItem.name}
                    </option>
                  ))}
                </select>
                <div className={styles.recipeAmountInput}>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={entry.amount}
                    placeholder="0.00"
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              ingredients: current.ingredients.map((line, lineIndex) =>
                                lineIndex === index
                                  ? { ...line, amount: event.target.value }
                                  : line,
                              ),
                            }
                          : current,
                      )
                    }
                  />
                  <span>{item?.unit ?? ""} / sale</span>
                </div>
                <small>
                  {item
                    ? `On hand ${item.current} ${item.unit} · pack ₱${Math.round(item.packPrice).toLocaleString("en-PH")}`
                    : "Inventory item unavailable"}
                </small>
                <button
                  type="button"
                  data-danger
                  onClick={() =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            ingredients: current.ingredients.filter(
                              (_, lineIndex) => lineIndex !== index,
                            ),
                          }
                        : current,
                    )
                  }
                  aria-label={`Remove ${item?.name ?? "ingredient"}`}
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            );
          })}

          {!draft.ingredients.length ? (
            <div className={styles.recipeBuilderEmpty}>
              Add ingredients from Inventory to build this recipe.
            </div>
          ) : null}
        </div>
      </div>

      <footer className={styles.entityEditorActions}>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" data-primary onClick={onSave}>
          <Save size={14} aria-hidden /> Save recipe
        </button>
      </footer>
    </section>
  );
}

function OperationHeader({
  businessId,
  moduleLabel,
  description,
}: {
  businessId: string;
  moduleLabel: string;
  description: string;
}) {
  return (
    <header className={styles.pageIntro}>
      <a
        className={styles.backLink}
        href={`/command-center/${businessId}/operations`}
      >
        <ArrowLeft size={14} /> Operations
      </a>
      <span>BUSINESS OPERATION</span>
      <h1>{moduleLabel}</h1>
      <p>{description}</p>
    </header>
  );
}

function PanelEmpty({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className={styles.panelHeading}>
      <span className={styles.panelIcon}>{icon}</span>
      <div><strong>{title}</strong><span>{body}</span></div>
    </div>
  );
}
