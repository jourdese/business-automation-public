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
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bot,
  CheckCircle2,
  ChefHat,
  Copy,
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
import { buildCommandCenterMenuEconomics } from "@/command-center/core/menu-economics";
import { buildCommandCenterRecipeImpact } from "@/command-center/core/recipe-impact";
import { buildCommandCenterSupplierPerformance } from "@/command-center/core/supplier-performance-engine";
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

type SupplierEditorDraft = {
  id?: string;
  name: string;
  contactId?: string;
  contactName: string;
  role: string;
  channel: string;
  email: string;
  phone: string;
};

const MARINARA_DEMO_MENU_IDS = new Set([
  "spicy_grilled_octopus",
  "garlic_shrimp_jalapeno",
  "seafood_marinara_solo",
  "shrimp_mushroom_alfredo_solo",
  "quattro_formaggi_pizza_12",
  "classic_margherita_pizza_12",
  "truffle_mushroom_burger",
  "braised_beef_shortribs",
  "grilled_salmon",
  "key_lime_cheesecake",
  "mango_shake",
  "cappuccino",
]);

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
  const [menuScope, setMenuScope] = useState<"demo" | "all">("demo");
  const [menuCategory, setMenuCategory] = useState("All");
  const [menuStatus, setMenuStatus] = useState<
    "all" | "active" | "unavailable" | "archived"
  >("active");
  const [menuDetailId, setMenuDetailId] = useState<string | null>(null);
  const [menuCategoryEditor, setMenuCategoryEditor] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [menuEditor, setMenuEditor] = useState<MenuEditorDraft | null>(null);
  const [recipeEditor, setRecipeEditor] = useState<RecipeEditorDraft | null>(null);
  const [recipeStatus, setRecipeStatus] = useState<
    "active" | "archived" | "all"
  >("active");
  const [supplierEditor, setSupplierEditor] =
    useState<SupplierEditorDraft | null>(null);
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
    duplicateMenuItem,
    setMenuAvailability,
    renameMenuCategory,
    moveMenuItem,
    saveRecipe,
    archiveRecipe,
    duplicateRecipe,
    createInventoryItem,
    saveSupplier,
    recordRecipeSale,
  } = useCommandCenterRuntime();

  const operationModule = operationCatalog[moduleId] ?? {
    label: moduleId,
    description: "Business operation managed by Jourvis.",
  };
  const moduleTasks = tasks.filter((task) => task.module === moduleId);
  const supplierById = useMemo(
    () => new Map(state.suppliers.map((supplier) => [supplier.id, supplier])),
    [state.suppliers],
  );

  function supplierDraftFrom(
    supplier?: CommandCenterSupplier,
  ): SupplierEditorDraft {
    const contact = supplier?.contacts[0];
    return {
      id: supplier?.id,
      name: supplier?.name ?? "",
      contactId: contact?.id,
      contactName: contact?.name ?? "",
      role: contact?.role ?? "Sales",
      channel: contact?.channel ?? "Email",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
    };
  }

  function submitSupplierEditor(
    draft: SupplierEditorDraft,
  ) {
    const saved = saveSupplier({
      id: draft.id,
      name: draft.name,
      contacts: [
        {
          id: draft.contactId,
          name: draft.contactName,
          role: draft.role,
          channel: draft.channel,
          email: draft.email,
          phone: draft.phone,
        },
      ],
    });
    if (saved) setSupplierEditor(null);
    return saved;
  }

  function openNewMenuItem() {
    setMenuDetailId(null);
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
    setMenuDetailId(item.id);
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
    const supplierPerformance =
      buildCommandCenterSupplierPerformance(state);
    const supplierPerformanceById = new Map(
      supplierPerformance.suppliers.map((entry) => [
        entry.supplierId,
        entry,
      ]),
    );
    const formatMinutes = (value: number | null) =>
      value === null ? "—" : value < 60 ? `${value} min` : `${Math.round((value / 60) * 10) / 10} hr`;

    return (
      <section className={styles.sectionPage}>
        <OperationHeader
          businessId={businessId}
          moduleLabel={operationModule.label}
          description={operationModule.description}
        />

        <div className={styles.entityToolbar}>
          <div>
            <button
              type="button"
              data-primary
              onClick={() => setSupplierEditor(supplierDraftFrom())}
            >
              <PlusCircle size={15} aria-hidden /> Add supplier
            </button>
          </div>
          <span>{state.suppliers.length} configured suppliers</span>
        </div>

        {supplierEditor ? (
          <div
            className={styles.entityDrawerBackdrop}
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSupplierEditor(null);
              }
            }}
          >
            <dialog
              open
              className={styles.entityDrawer}
              aria-label={
                supplierEditor.id ? "Edit supplier" : "Add supplier"
              }
            >
              <SupplierEditorPanel
                draft={supplierEditor}
                setDraft={setSupplierEditor}
                onSave={() => submitSupplierEditor(supplierEditor)}
                onCancel={() => setSupplierEditor(null)}
              />
            </dialog>
          </div>
        ) : null}

        <div className={styles.activitySummary}>
          <article>
            <span>REQUESTS OBSERVED</span>
            <strong>{supplierPerformance.requestCount}</strong>
            <small>supplier workflows in runtime history</small>
          </article>
          <article>
            <span>COMPLETION</span>
            <strong>
              {supplierPerformance.completionRatePercent === null
                ? "—"
                : supplierPerformance.completionRatePercent + "%"}
            </strong>
            <small>received ÷ closed requests</small>
          </article>
          <article>
            <span>AVG SUPPLIER VIEW</span>
            <strong>{formatMinutes(supplierPerformance.averageViewMinutes)}</strong>
            <small>request created → supplier viewed</small>
          </article>
          <article>
            <span>AVG QUOTE RESPONSE</span>
            <strong>{formatMinutes(supplierPerformance.averageQuoteMinutes)}</strong>
            <small>quote-mode request → quote received</small>
          </article>
        </div>

        <div className={styles.supplierRuntimeGrid}>
          {state.suppliers.map((supplier) => {
            const performance =
              supplierPerformanceById.get(supplier.id);
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
                  <div className={styles.supplierHeaderActions}>
                    <b>{activeSupplierPurchases.length} active</b>
                    <button
                      type="button"
                      onClick={() =>
                        setSupplierEditor(supplierDraftFrom(supplier))
                      }
                    >
                      <Pencil size={13} aria-hidden /> Edit
                    </button>
                  </div>
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

                <div className={styles.supplierPerformanceFacts}>
                  <span>
                    <small>Requests</small>
                    <strong>{performance?.requestCount ?? 0}</strong>
                  </span>
                  <span>
                    <small>Completion</small>
                    <strong>
                      {performance?.completionRatePercent === null ||
                      performance?.completionRatePercent === undefined
                        ? "—"
                        : performance.completionRatePercent + "%"}
                    </strong>
                  </span>
                  <span>
                    <small>Avg viewed</small>
                    <strong>{formatMinutes(performance?.averageViewMinutes ?? null)}</strong>
                  </span>
                  <span>
                    <small>Avg quote</small>
                    <strong>{formatMinutes(performance?.averageQuoteMinutes ?? null)}</strong>
                  </span>
                  <span>
                    <small>Avg confirmation</small>
                    <strong>{formatMinutes(performance?.averageConfirmationMinutes ?? null)}</strong>
                  </span>
                  <span>
                    <small>Avg receipt</small>
                    <strong>
                      {performance?.averageReceiptHours === null ||
                      performance?.averageReceiptHours === undefined
                        ? "—"
                        : performance.averageReceiptHours + " hr"}
                    </strong>
                  </span>
                  <span>
                    <small>Received spend</small>
                    <strong>
                      ₱{Math.round(performance?.receivedSpend ?? 0).toLocaleString("en-PH")}
                    </strong>
                  </span>
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
    const scopedMenuItems =
      businessId === "marinara-ristorante" && menuScope === "demo"
        ? state.menuItems.filter(
            (item) =>
              MARINARA_DEMO_MENU_IDS.has(item.id) ||
              item.referenceSource === "demo",
          )
        : state.menuItems;
    const categories = [
      "All",
      ...Array.from(
        new Set(scopedMenuItems.map((item) => item.category)),
      ),
    ];
    const normalizedSearch = menuSearch.trim().toLowerCase();
    const visibleMenuItems = scopedMenuItems
      .filter((item) => {
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
        const matchesStatus =
          menuStatus === "all" ||
          (menuStatus === "active" && item.active) ||
          (menuStatus === "unavailable" && item.active && !item.available) ||
          (menuStatus === "archived" && !item.active);
        return matchesCategory && matchesSearch && matchesStatus;
      })
      .sort(
        (left, right) =>
          (left.displayOrder ?? state.menuItems.indexOf(left)) -
          (right.displayOrder ?? state.menuItems.indexOf(right)),
      );
    const mappedCount = scopedMenuItems.filter(
      (item) => item.recipeId,
    ).length;
    const pricedCount = scopedMenuItems.filter(
      (item) => item.currentPrice !== undefined,
    ).length;
    const editingMenuItem = menuEditor?.id
      ? state.menuItems.find((item) => item.id === menuEditor.id)
      : undefined;
    const bulkItemIds = visibleMenuItems
      .filter((item) => item.active)
      .map((item) => item.id);
    const selectedMenuItem = menuDetailId
      ? state.menuItems.find((item) => item.id === menuDetailId)
      : undefined;
    const selectedMenuRecipe = selectedMenuItem?.recipeId
      ? state.recipes.find(
          (recipe) => recipe.id === selectedMenuItem.recipeId,
        )
      : undefined;
    const selectedMenuEconomics = selectedMenuItem
      ? buildCommandCenterMenuEconomics(
          selectedMenuItem,
          selectedMenuRecipe,
          state.inventory,
        )
      : undefined;
    const selectedMenuStatus = selectedMenuItem
      ? !selectedMenuItem.active
        ? "Archived"
        : !selectedMenuItem.available
          ? "Unavailable"
          : selectedMenuEconomics?.riskyIngredientIds.length
            ? selectedMenuEconomics.riskyIngredientIds.length + " stock risk"
            : selectedMenuRecipe?.active
              ? "Ready"
              : "No recipe"
      : "";

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
            <h2>Compact menu library with actions one click away.</h2>
            <p>
              The Marinara demo opens with a curated selection instead of the full
              archived catalog. Use Full catalog only when you need to inspect the complete
              reference menu.
            </p>
          </div>
          <ChefHat size={36} aria-hidden />
        </div>

        <div className={styles.entityToolbar}>
          <div>
            <button type="button" data-primary onClick={openNewMenuItem}>
              <PlusCircle size={15} aria-hidden /> Add menu item
            </button>
            <button
              type="button"
              disabled={!bulkItemIds.length}
              onClick={() => setMenuAvailability(bulkItemIds, true)}
            >
              Mark visible available
            </button>
            <button
              type="button"
              disabled={!bulkItemIds.length}
              onClick={() => setMenuAvailability(bulkItemIds, false)}
            >
              Mark visible unavailable
            </button>
            {menuCategory !== "All" ? (
              <button
                type="button"
                onClick={() =>
                  setMenuCategoryEditor({
                    from: menuCategory,
                    to: menuCategory,
                  })
                }
              >
                Rename category
              </button>
            ) : null}
          </div>
          <span>
            {state.menuItems.filter((item) => item.active).length} active ·{" "}
            {state.menuItems.length} total
          </span>
        </div>

        {menuCategoryEditor ? (
          <section className={styles.categoryManager}>
            <div>
              <span>CATEGORY MANAGEMENT</span>
              <strong>{menuCategoryEditor.from}</strong>
              <small>
                Rename this category across every menu item that currently uses it.
              </small>
            </div>
            <input
              value={menuCategoryEditor.to}
              onChange={(event) =>
                setMenuCategoryEditor((current) =>
                  current ? { ...current, to: event.target.value } : current,
                )
              }
            />
            <button
              type="button"
              onClick={() => setMenuCategoryEditor(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              data-primary
              onClick={() => {
                const nextCategory = menuCategoryEditor.to.trim();
                if (!nextCategory) return;
                renameMenuCategory(
                  menuCategoryEditor.from,
                  nextCategory,
                );
                setMenuCategory(nextCategory);
                setMenuCategoryEditor(null);
              }}
            >
              Save category
            </button>
          </section>
        ) : null}

        {menuEditor && !menuEditor.id ? (
          <div
            className={styles.entityDrawerBackdrop}
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setMenuEditor(null);
              }
            }}
          >
            <dialog
              open
              className={styles.entityDrawer}
              aria-label={
                menuEditor.id ? "Edit menu item" : "Add menu item"
              }
            >
              <MenuEditorPanel
                draft={menuEditor}
                setDraft={setMenuEditor}
                existing={editingMenuItem}
                recipes={state.recipes}
                onSave={submitMenuEditor}
                onCancel={() => setMenuEditor(null)}
              />
            </dialog>
          </div>
        ) : null}

        {selectedMenuItem && selectedMenuEconomics ? (
          <div
            className={styles.menuModalBackdrop}
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setMenuDetailId(null);
                setMenuEditor(null);
              }
            }}
          >
            <dialog
              open
              className={styles.menuDetailModal}
              aria-label={
                menuEditor?.id === selectedMenuItem.id
                  ? `Edit ${selectedMenuItem.name}`
                  : `${selectedMenuItem.name} menu details`
              }
            >
              {menuEditor?.id === selectedMenuItem.id ? (
                <MenuEditorPanel
                  draft={menuEditor}
                  setDraft={setMenuEditor}
                  existing={selectedMenuItem}
                  recipes={state.recipes}
                  onSave={submitMenuEditor}
                  onCancel={() => setMenuEditor(null)}
                />
              ) : (
                <>
              <header className={styles.menuModalHeader}>
                <div className={styles.menuModalThumb}>
                  {selectedMenuRecipe ? (
                    <MenuPhoto
                      menuId={selectedMenuRecipe.id}
                      className={styles.menuCompactPhoto}
                    />
                  ) : (
                    <span className={styles.menuCompactPlaceholder} aria-hidden>
                      <ChefHat size={26} />
                    </span>
                  )}
                </div>
                <div>
                  <span>
                    {selectedMenuItem.category}
                    {selectedMenuItem.variant
                      ? " · " + selectedMenuItem.variant
                      : ""}
                  </span>
                  <h3>{selectedMenuItem.name}</h3>
                  <small>{selectedMenuStatus}</small>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuDetailId(null);
                    setMenuEditor(null);
                  }}
                  aria-label="Close menu details"
                >
                  <X size={16} aria-hidden />
                </button>
              </header>

              <div className={styles.menuQuickStats}>
                <span>
                  <small>Food cost</small>
                  <strong>
                    {selectedMenuEconomics.foodCostPercent !== null
                      ? selectedMenuEconomics.foodCostPercent + "%"
                      : "—"}
                  </strong>
                </span>
                <span>
                  <small>Gross profit</small>
                  <strong>
                    {selectedMenuEconomics.grossProfit !== null
                      ? "₱" +
                        Math.round(
                          selectedMenuEconomics.grossProfit,
                        ).toLocaleString("en-PH")
                      : "—"}
                  </strong>
                </span>
                <span>
                  <small>Gross margin</small>
                  <strong>
                    {selectedMenuEconomics.grossMarginPercent !== null
                      ? selectedMenuEconomics.grossMarginPercent + "%"
                      : "—"}
                  </strong>
                </span>
                <span>
                  <small>Possible servings</small>
                  <strong>
                    {selectedMenuEconomics.possibleServings ?? "—"}
                  </strong>
                </span>
              </div>

              <div className={styles.menuQuickActions}>
                {selectedMenuRecipe?.active &&
                selectedMenuItem.active &&
                selectedMenuItem.available ? (
                  <button
                    type="button"
                    data-primary
                    onClick={() =>
                      recordRecipeSale(selectedMenuRecipe.id, 1)
                    }
                  >
                    Simulate sale
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openMenuItemEditor(selectedMenuItem)}
                >
                  <Pencil size={14} aria-hidden /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => duplicateMenuItem(selectedMenuItem.id)}
                >
                  <Copy size={14} aria-hidden /> Duplicate
                </button>
                <button
                  type="button"
                  onClick={() =>
                    moveMenuItem(selectedMenuItem.id, "up")
                  }
                  aria-label="Move menu item earlier"
                >
                  <ArrowUp size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    moveMenuItem(selectedMenuItem.id, "down")
                  }
                  aria-label="Move menu item later"
                >
                  <ArrowDown size={14} aria-hidden />
                </button>
                {selectedMenuItem.active ? (
                  <button
                    type="button"
                    data-danger
                    onClick={() => {
                      archiveMenuItem(selectedMenuItem.id);
                      setMenuDetailId(null);
                    }}
                  >
                    <Archive size={14} aria-hidden /> Archive
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      saveMenuItem({
                        id: selectedMenuItem.id,
                        name: selectedMenuItem.name,
                        category: selectedMenuItem.category,
                        variant: selectedMenuItem.variant,
                        currentPrice: selectedMenuItem.currentPrice,
                        description: selectedMenuItem.description,
                        active: true,
                        available: selectedMenuItem.available,
                        recipeId: selectedMenuItem.recipeId,
                        displayOrder: selectedMenuItem.displayOrder,
                      });
                      setMenuDetailId(null);
                    }}
                  >
                    Restore
                  </button>
                )}
              </div>

              {selectedMenuEconomics.warning !== "none" ||
              (selectedMenuEconomics.costDriftSinceRecipeSavePercent ?? 0) > 0 ||
              selectedMenuEconomics.riskyIngredientIds.length ? (
                <div className={styles.menuQuickAlerts}>
                  {selectedMenuEconomics.warning !== "none" ? (
                    <span data-level={selectedMenuEconomics.warning}>
                      {selectedMenuEconomics.foodCostPercent}% food cost
                    </span>
                  ) : null}
                  {(selectedMenuEconomics.costDriftSinceRecipeSavePercent ??
                    0) > 0 ? (
                    <span>
                      Cost +
                      {selectedMenuEconomics.costDriftSinceRecipeSavePercent}%
                      since recipe save
                    </span>
                  ) : null}
                  {selectedMenuEconomics.riskyIngredientIds.length ? (
                    <span>
                      {selectedMenuEconomics.riskyIngredientIds.length} stock
                      risk
                    </span>
                  ) : null}
                </div>
              ) : null}

              <details className={styles.menuMoreDetails}>
                <summary>More details</summary>
                <div className={styles.menuMoreDetailGrid}>
                  <span>
                    <small>Current price</small>
                    <strong>
                      {selectedMenuItem.currentPrice !== undefined
                        ? "₱" +
                          Math.round(
                            selectedMenuItem.currentPrice,
                          ).toLocaleString("en-PH")
                        : "Not set"}
                    </strong>
                  </span>
                  <span>
                    <small>Archived reference</small>
                    <strong>
                      {selectedMenuItem.referencePrice !== undefined
                        ? "₱" +
                          Math.round(
                            selectedMenuItem.referencePrice,
                          ).toLocaleString("en-PH")
                        : "—"}
                    </strong>
                  </span>
                  <span>
                    <small>Ingredient cost</small>
                    <strong>
                      {selectedMenuEconomics.ingredientCost !== null
                        ? "₱" +
                          Math.round(
                            selectedMenuEconomics.ingredientCost,
                          ).toLocaleString("en-PH")
                        : "—"}
                    </strong>
                  </span>
                  <span>
                    <small>Vs archived price</small>
                    <strong>
                      {selectedMenuEconomics.referencePriceDelta !== null
                        ? `${selectedMenuEconomics.referencePriceDelta > 0 ? "+" : ""}₱${Math.round(
                            selectedMenuEconomics.referencePriceDelta,
                          ).toLocaleString("en-PH")}`
                        : "—"}
                    </strong>
                  </span>
                </div>

                <p className={styles.menuDetailDescription}>
                  {selectedMenuItem.description ||
                    selectedMenuRecipe?.description ||
                    "No live description configured."}
                </p>

                {selectedMenuRecipe ? (
                  <div className={styles.menuIngredientStrip}>
                    {Object.entries(selectedMenuRecipe.ingredients).map(
                      ([itemId, amount]) => {
                        const item = state.inventory.find(
                          (entry) => entry.id === itemId,
                        );
                        if (!item) return null;
                        return (
                          <div
                            key={item.id}
                            data-low={item.current <= item.reorderAt}
                          >
                            <SupplyPhoto
                              supplyId={item.id}
                              className={styles.recipeSupplyPhoto}
                              size={38}
                            />
                            <span>
                              <strong>{item.name}</strong>
                              <small>
                                {amount} {item.unit} / sale
                              </small>
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                ) : null}
              </details>
                </>
              )}
            </dialog>
          </div>
        ) : null}

        <div className={styles.activitySummary}>
          <article>
            <span>{menuScope === "demo" ? "DEMO SELECTION" : "FULL CATALOG"}</span>
            <strong>{scopedMenuItems.length}</strong>
            <small>
              {menuScope === "demo"
                ? "curated items for the Marinara demo"
                : "all archived/reference and demo-created items"}
            </small>
          </article>
          <article>
            <span>RECIPE MAPPED</span>
            <strong>{mappedCount}</strong>
            <small>items connected to inventory usage</small>
          </article>
          <article>
            <span>CURRENT PRICE SET</span>
            <strong>{pricedCount}</strong>
            <small>owner-managed selling prices</small>
          </article>
        </div>

        {businessId === "marinara-ristorante" ? (
          <div className={styles.menuScopeBar}>
            <div className={styles.menuStatusFilters}>
              <button
                type="button"
                data-active={menuScope === "demo"}
                onClick={() => {
                  setMenuScope("demo");
                  setMenuCategory("All");
                }}
              >
                Demo selection
              </button>
              <button
                type="button"
                data-active={menuScope === "all"}
                onClick={() => {
                  setMenuScope("all");
                  setMenuCategory("All");
                }}
              >
                Full catalog
              </button>
            </div>
            <span>
              {scopedMenuItems.length} of {state.menuItems.length} items
            </span>
          </div>
        ) : null}

        <div className={styles.menuLibraryToolbar}>
          <input
            type="search"
            value={menuSearch}
            onChange={(event) => setMenuSearch(event.target.value)}
            placeholder="Search menu item or category"
            aria-label="Search menu"
          />
          <div className={styles.menuStatusFilters}>
            {(
              [
                ["active", "Active"],
                ["unavailable", "Unavailable"],
                ["archived", "Archived"],
                ["all", "All"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                data-active={menuStatus === value}
                onClick={() => setMenuStatus(value)}
              >
                {label}
              </button>
            ))}
          </div>
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
          <span>{visibleMenuItems.length} shown</span>
        </div>

        <article className={styles.migrationCard}>
          <div>
            <span>REFERENCE DATA</span>
            <strong>Live price and archived reference stay separate</strong>
            <p>
              Editing a menu item changes live Command Center configuration only.
              Historical source price, date, and printed name remain preserved.
            </p>
          </div>
        </article>

        <div className={styles.menuLibraryGrid}>
          {visibleMenuItems.map((menuItem) => {
            const recipe = menuItem.recipeId
              ? state.recipes.find((entry) => entry.id === menuItem.recipeId)
              : undefined;
            const economics = buildCommandCenterMenuEconomics(
              menuItem,
              recipe,
              state.inventory,
            );
            const statusLabel = !menuItem.active
              ? "Archived"
              : !menuItem.available
                ? "Unavailable"
                : economics.riskyIngredientIds.length
                  ? economics.riskyIngredientIds.length + " stock risk"
                  : recipe?.active
                    ? "Ready"
                    : "No recipe";

            return (
              <article
                className={styles.menuLibraryItem}
                data-inactive={!menuItem.active}
                key={menuItem.id}
              >
                <button
                  type="button"
                  className={styles.menuThumbnailButton}
                  onClick={() => setMenuDetailId(menuItem.id)}
                >
                  <span className={styles.menuThumbnailMedia}>
                    {recipe ? (
                      <MenuPhoto
                        menuId={recipe.id}
                        className={styles.menuCompactPhoto}
                      />
                    ) : (
                      <span className={styles.menuCompactPlaceholder} aria-hidden>
                        <ChefHat size={26} />
                      </span>
                    )}
                    <span className={styles.menuThumbnailShade} />
                    <span className={styles.menuThumbnailStatus}>
                      {statusLabel}
                    </span>
                    {economics.warning !== "none" ? (
                      <span
                        className={styles.menuFoodCostWarning}
                        data-level={economics.warning}
                      >
                        {economics.foodCostPercent}% food cost
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.menuThumbnailCopy}>
                    <span>
                      <small>
                        {menuItem.category}
                        {menuItem.variant ? " · " + menuItem.variant : ""}
                      </small>
                      <strong>{menuItem.name}</strong>
                    </span>
                    <span>
                      <b>
                        {menuItem.currentPrice !== undefined
                          ? "₱" +
                            Math.round(menuItem.currentPrice).toLocaleString(
                              "en-PH",
                            )
                          : "No live price"}
                      </b>
                      <small className={styles.menuOpenLabel}>Open</small>
                    </span>
                  </span>
                </button>

              </article>
            );
          })}

          {!visibleMenuItems.length ? (
            <article className={styles.panelCard}>
              <PanelEmpty
                icon={<ChefHat size={17} />}
                title="No menu items in this view"
                body="Change the search, category, or status filter—or add a new item."
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
    const visibleRecipes = state.recipes.filter((recipe) =>
      recipeStatus === "all"
        ? true
        : recipeStatus === "active"
          ? recipe.active
          : !recipe.active,
    );

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
            {(
              [
                ["active", "Active"],
                ["archived", "Archived"],
                ["all", "All"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                data-active={recipeStatus === value}
                onClick={() => setRecipeStatus(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <span>
            {state.recipes.filter((recipe) => recipe.active).length} active ·{" "}
            {state.recipes.length} total
          </span>
        </div>

        {recipeEditor ? (
          <div
            className={styles.entityDrawerBackdrop}
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setRecipeEditor(null);
              }
            }}
          >
            <dialog
              open
              className={styles.entityDrawer}
              aria-label={recipeEditor.id ? "Edit recipe" : "Add recipe"}
            >
              <RecipeEditorPanel
                draft={recipeEditor}
                setDraft={setRecipeEditor}
                existing={editingRecipe}
                inventory={state.inventory}
                suppliers={state.suppliers}
                menuItems={state.menuItems}
                onCreateInventoryItem={createInventoryItem}
                onSaveSupplier={saveSupplier}
                onSave={submitRecipeEditor}
                onCancel={() => setRecipeEditor(null)}
              />
            </dialog>
          </div>
        ) : null}

        <div className={styles.recipeGrid}>
          {visibleRecipes.map((recipe) => {
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
                  <button
                    type="button"
                    onClick={() => duplicateRecipe(recipe.id)}
                  >
                    <Copy size={14} aria-hidden /> Duplicate
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

          {!visibleRecipes.length ? (
            <article className={styles.panelCard}>
              <PanelEmpty
                icon={<ReceiptText size={17} />}
                title="No recipes in this view"
                body="Change the recipe status filter or create a new recipe."
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

function SupplierEditorPanel({
  draft,
  setDraft,
  onSave,
  onCancel,
}: {
  draft: SupplierEditorDraft;
  setDraft: Dispatch<SetStateAction<SupplierEditorDraft | null>>;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <section className={styles.entityEditor}>
      <header>
        <div>
          <span>{draft.id ? "EDIT SUPPLIER" : "NEW SUPPLIER"}</span>
          <h3>{draft.id ? draft.name || "Supplier" : "Create supplier"}</h3>
          <p>
            Configure the supplier identity and primary purchasing contact used by
            Inventory and Purchasing.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close supplier editor"
        >
          <X size={16} aria-hidden />
        </button>
      </header>

      <div className={styles.entityEditorGrid}>
        <label className={styles.entityEditorWide}>
          <span>Supplier name</span>
          <input
            value={draft.name}
            placeholder="Supplier business name"
            onChange={(event) =>
              setDraft((current) =>
                current
                  ? { ...current, name: event.target.value }
                  : current,
              )
            }
          />
        </label>
        <label>
          <span>Primary contact</span>
          <input
            value={draft.contactName}
            placeholder="Contact person"
            onChange={(event) =>
              setDraft((current) =>
                current
                  ? { ...current, contactName: event.target.value }
                  : current,
              )
            }
          />
        </label>
        <label>
          <span>Role</span>
          <input
            value={draft.role}
            placeholder="Sales"
            onChange={(event) =>
              setDraft((current) =>
                current
                  ? { ...current, role: event.target.value }
                  : current,
              )
            }
          />
        </label>
        <label>
          <span>Channel</span>
          <select
            value={draft.channel}
            onChange={(event) =>
              setDraft((current) =>
                current
                  ? { ...current, channel: event.target.value }
                  : current,
              )
            }
          >
            <option value="Email">Email</option>
            <option value="Phone">Phone</option>
            <option value="SMS">SMS</option>
            <option value="Messenger">Messenger</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Viber">Viber</option>
          </select>
        </label>
        <label>
          <span>Email</span>
          <input
            type="email"
            value={draft.email}
            placeholder="supplier@example.com"
            onChange={(event) =>
              setDraft((current) =>
                current
                  ? { ...current, email: event.target.value }
                  : current,
              )
            }
          />
        </label>
        <label>
          <span>Phone</span>
          <input
            value={draft.phone}
            placeholder="+63…"
            onChange={(event) =>
              setDraft((current) =>
                current
                  ? { ...current, phone: event.target.value }
                  : current,
              )
            }
          />
        </label>
      </div>

      <footer className={styles.entityEditorActions}>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" data-primary onClick={onSave}>
          <Save size={14} aria-hidden /> Save supplier
        </button>
      </footer>
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
  suppliers,
  menuItems,
  onCreateInventoryItem,
  onSaveSupplier,
  onSave,
  onCancel,
}: {
  draft: RecipeEditorDraft;
  setDraft: Dispatch<SetStateAction<RecipeEditorDraft | null>>;
  existing?: CommandCenterRecipe;
  inventory: CommandCenterInventoryItem[];
  suppliers: CommandCenterSupplier[];
  menuItems: CommandCenterMenuItem[];
  onCreateInventoryItem: (
    item: Omit<CommandCenterInventoryItem, "id">,
  ) => string;
  onSaveSupplier: (supplier: {
    id?: string;
    name: string;
    contacts: Array<
      Omit<CommandCenterSupplier["contacts"][number], "id"> & {
        id?: string;
      }
    >;
  }) => { supplierId: string; contactId: string } | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const defaultSupplier = suppliers[0];
  const defaultContact = defaultSupplier?.contacts[0];
  const [inventoryEditor, setInventoryEditor] =
    useState<InventoryEditorDraft | null>(null);
  const [inlineSupplierEditor, setInlineSupplierEditor] =
    useState<SupplierEditorDraft | null>(null);

  const linkedMenuItems = existing
    ? menuItems.filter((item) => item.recipeId === existing.id)
    : [];
  const draftIngredientRecord = Object.fromEntries(
    draft.ingredients
      .map((entry) => [entry.itemId, Number(entry.amount)] as const)
      .filter(
        ([itemId, amount]) =>
          Boolean(itemId) && Number.isFinite(amount) && amount > 0,
      ),
  );
  const recipeImpact = buildCommandCenterRecipeImpact(
    existing,
    draftIngredientRecord,
    inventory,
    linkedMenuItems,
  );
  const linkedCount = linkedMenuItems.length;

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

  function openInventoryEditor() {
    setInventoryEditor({
      name: "",
      unit: "kg",
      zone: "Pantry",
      current: "0",
      fullLevel: "5",
      reorderAt: "1.5",
      dailyUse: "0",
      supplierId: defaultSupplier?.id ?? "",
      contactId: defaultContact?.id ?? "",
      packSize: "1",
      packPrice: "0",
      purchaseUnit: "1 kg pack",
      leadDays: "1",
      purchasingMode: "fixed",
      automationEnabled: false,
      automationMode: "assist",
      automationTriggerPercent: "30",
      maxAutoOrderSpend: "5000",
    });
  }

  function supplierDraftFromInline(
    supplier?: CommandCenterSupplier,
  ): SupplierEditorDraft {
    const contact = supplier?.contacts[0];
    return {
      id: supplier?.id,
      name: supplier?.name ?? "",
      contactId: contact?.id,
      contactName: contact?.name ?? "",
      role: contact?.role ?? "Sales",
      channel: contact?.channel ?? "Email",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
    };
  }

  function saveInlineSupplier() {
    if (!inlineSupplierEditor) return;
    const saved = onSaveSupplier({
      id: inlineSupplierEditor.id,
      name: inlineSupplierEditor.name,
      contacts: [
        {
          id: inlineSupplierEditor.contactId,
          name: inlineSupplierEditor.contactName,
          role: inlineSupplierEditor.role,
          channel: inlineSupplierEditor.channel,
          email: inlineSupplierEditor.email,
          phone: inlineSupplierEditor.phone,
        },
      ],
    });
    if (!saved) return;

    setInventoryEditor((current) =>
      current
        ? {
            ...current,
            supplierId: saved.supplierId,
            contactId: saved.contactId,
          }
        : current,
    );
    setInlineSupplierEditor(null);
  }

  function submitInventoryEditor() {
    if (!inventoryEditor) return;

    const name = inventoryEditor.name.trim();
    const unit = inventoryEditor.unit.trim();
    const fullLevel = Number(inventoryEditor.fullLevel);
    const reorderAt = Number(inventoryEditor.reorderAt);
    const current = Number(inventoryEditor.current);
    const dailyUse = Number(inventoryEditor.dailyUse);
    const packSize = Number(inventoryEditor.packSize);
    const packPrice = Number(inventoryEditor.packPrice);
    const leadDays = Number(inventoryEditor.leadDays);
    const automationTriggerPercent = Number(
      inventoryEditor.automationTriggerPercent,
    );
    const maxAutoOrderSpend = Number(inventoryEditor.maxAutoOrderSpend);

    if (
      !name ||
      !unit ||
      !Number.isFinite(fullLevel) ||
      fullLevel <= 0 ||
      !Number.isFinite(reorderAt) ||
      reorderAt < 0 ||
      !Number.isFinite(current) ||
      current < 0 ||
      !Number.isFinite(dailyUse) ||
      dailyUse < 0 ||
      !Number.isFinite(packSize) ||
      packSize <= 0 ||
      !Number.isFinite(packPrice) ||
      packPrice < 0 ||
      !Number.isFinite(leadDays) ||
      leadDays < 0 ||
      !Number.isFinite(automationTriggerPercent) ||
      !Number.isFinite(maxAutoOrderSpend) ||
      maxAutoOrderSpend < 0
    ) {
      return;
    }

    const selectedSupplier = suppliers.find(
      (supplier) => supplier.id === inventoryEditor.supplierId,
    );
    const selectedContact =
      selectedSupplier?.contacts.find(
        (contact) => contact.id === inventoryEditor.contactId,
      ) ?? selectedSupplier?.contacts[0];
    const safePackPrice = Math.max(0, packPrice);
    const autoAcceptPackPrice =
      Math.round(safePackPrice * 1.05 * 100) / 100;
    const hardMaxPackPrice =
      Math.round(safePackPrice * 1.15 * 100) / 100;

    const itemId = onCreateInventoryItem({
      name,
      unit,
      current,
      fullLevel,
      reorderAt: Math.min(reorderAt, fullLevel),
      incoming: 0,
      supplierId: selectedSupplier?.id ?? "",
      contactId: selectedContact?.id ?? "",
      packSize,
      packPrice: safePackPrice,
      purchaseUnit:
        inventoryEditor.purchaseUnit.trim() || `${packSize} ${unit} pack`,
      leadDays,
      dailyUse,
      zone: inventoryEditor.zone.trim() || undefined,
      purchasingMode: inventoryEditor.purchasingMode,
      automationEnabled: inventoryEditor.automationEnabled,
      automationMode: inventoryEditor.automationMode,
      automationTriggerPercent: Math.max(
        0,
        Math.min(100, automationTriggerPercent),
      ),
      targetPackPrice: safePackPrice,
      autoAcceptPackPrice,
      hardMaxPackPrice,
      maxAutoOrderQty: Math.max(packSize, packSize * 3),
      maxAutoOrderSpend,
      autoNegotiate:
        inventoryEditor.purchasingMode === "quote" &&
        inventoryEditor.automationMode === "autobuy",
      maxCounteroffers:
        inventoryEditor.purchasingMode === "quote" ? 2 : 0,
      maxDeliveryFee: 300,
      maxLeadDays: Math.max(leadDays, 2),
    });

    setDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            ingredients: currentDraft.ingredients.some(
              (entry) => entry.itemId === itemId,
            )
              ? currentDraft.ingredients
              : [
                  ...currentDraft.ingredients,
                  { itemId, amount: "" },
                ],
          }
        : currentDraft,
    );
    setInventoryEditor(null);
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
          <span>INGREDIENT COST</span>
          <strong>
            ₱{Math.round(recipeImpact.beforeCost).toLocaleString("en-PH")}
            {" → "}
            ₱{Math.round(recipeImpact.afterCost).toLocaleString("en-PH")}
          </strong>
          <small>
            {recipeImpact.costChange === 0
              ? "No cost change"
              : `${recipeImpact.costChange > 0 ? "+" : "-"}₱${Math.round(
                  Math.abs(recipeImpact.costChange),
                ).toLocaleString("en-PH")}${recipeImpact.costChangePercent !== null ? ` · ${recipeImpact.costChangePercent > 0 ? "+" : ""}${recipeImpact.costChangePercent}%` : ""}`}
          </small>
        </article>
        <article>
          <span>LINKED MENU FOOD COST</span>
          <strong>
            {recipeImpact.averageLinkedFoodCostBefore === null
              ? "—"
              : recipeImpact.averageLinkedFoodCostBefore + "%"}
            {" → "}
            {recipeImpact.averageLinkedFoodCostAfter === null
              ? "—"
              : recipeImpact.averageLinkedFoodCostAfter + "%"}
          </strong>
          <small>
            {linkedCount
              ? `average across ${linkedCount} linked menu item${linkedCount === 1 ? "" : "s"} with live prices`
              : "link and price menu items to calculate food cost"}
          </small>
        </article>
        <article>
          <span>POSSIBLE SERVINGS</span>
          <strong>
            {recipeImpact.beforeServings ?? 0}
            {" → "}
            {recipeImpact.afterServings ?? 0}
          </strong>
          <small>based on current on-hand inventory</small>
        </article>
        <article>
          <span>LINKED MENU ITEMS</span>
          <strong>{linkedCount}</strong>
          <small>these items use the saved recipe immediately</small>
        </article>
      </div>

      {recipeImpact.ingredientChanges.length ? (
        <section className={styles.recipeChangeImpact}>
          <header>
            <div>
              <span>CHANGE IMPACT</span>
              <strong>How the draft changes inventory pressure</strong>
            </div>
            <small>
              Daily-demand and stockout movement are modeled from each
              ingredient&apos;s configured daily-use baseline. They are not yet
              POS-demand forecasts.
            </small>
          </header>
          <div>
            {recipeImpact.ingredientChanges.map((change) => (
              <article key={change.itemId}>
                <strong>{change.name}</strong>
                <span>
                  <small>Recipe quantity</small>
                  <b>
                    {change.beforeAmount} → {change.afterAmount} {change.unit}
                  </b>
                  <em>
                    {change.quantityChangePercent === null
                      ? "new ingredient"
                      : `${change.quantityChangePercent > 0 ? "+" : ""}${change.quantityChangePercent}%`}
                  </em>
                </span>
                <span>
                  <small>Modeled daily demand</small>
                  <b>
                    {change.configuredDailyUse === null
                      ? "—"
                      : `${change.configuredDailyUse} → ${change.modeledDailyUseAfter} ${change.unit}/day`}
                  </b>
                  <em>
                    {change.dailyUseChangePercent === null
                      ? "no baseline"
                      : `${change.dailyUseChangePercent > 0 ? "+" : ""}${change.dailyUseChangePercent}%`}
                  </em>
                </span>
                <span>
                  <small>Projected stockout</small>
                  <b>
                    {change.stockoutDaysBefore === null
                      ? "—"
                      : `${change.stockoutDaysBefore} → ${change.stockoutDaysAfter} days`}
                  </b>
                  <em>
                    {change.stockoutDaysDelta === null
                      ? "no baseline"
                      : change.stockoutDaysDelta < 0
                        ? `${Math.abs(change.stockoutDaysDelta)} days sooner`
                        : change.stockoutDaysDelta > 0
                          ? `${change.stockoutDaysDelta} days later`
                          : "unchanged"}
                  </em>
                </span>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className={styles.recipeBuilder}>
        <header>
          <div>
            <span>INGREDIENTS</span>
            <strong>{draft.ingredients.length} mapped</strong>
          </div>
          <div className={styles.recipeBuilderActions}>
            <button
              type="button"
              onClick={addIngredient}
              disabled={draft.ingredients.length >= inventory.length}
            >
              <PlusCircle size={14} aria-hidden /> Add existing
            </button>
            <button type="button" onClick={openInventoryEditor}>
              <PlusCircle size={14} aria-hidden /> Create inventory item
            </button>
          </div>
        </header>

        {inventoryEditor ? (
          <section className={styles.inlineInventoryEditor}>
            <header>
              <div>
                <span>NEW INVENTORY ITEM</span>
                <strong>Create the ingredient before adding its recipe quantity.</strong>
                <small>
                  Purchasing starts safely in the mode you choose; advanced authority can still be refined from Inventory.
                </small>
              </div>
              <button
                type="button"
                onClick={() => setInventoryEditor(null)}
                aria-label="Close inventory item editor"
              >
                <X size={14} aria-hidden />
              </button>
            </header>

            <div className={styles.inlineInventoryGrid}>
              <label>
                <span>Name</span>
                <input
                  value={inventoryEditor.name}
                  placeholder="e.g. Truffle oil"
                  onChange={(event) =>
                    setInventoryEditor((current) =>
                      current
                        ? { ...current, name: event.target.value }
                        : current,
                    )
                  }
                />
              </label>
              <label>
                <span>Unit</span>
                <input
                  value={inventoryEditor.unit}
                  placeholder="kg, L, pcs"
                  onChange={(event) =>
                    setInventoryEditor((current) =>
                      current
                        ? { ...current, unit: event.target.value }
                        : current,
                    )
                  }
                />
              </label>
              <label>
                <span>Storage zone</span>
                <input
                  value={inventoryEditor.zone}
                  placeholder="Pantry"
                  onChange={(event) =>
                    setInventoryEditor((current) =>
                      current
                        ? { ...current, zone: event.target.value }
                        : current,
                    )
                  }
                />
              </label>

              <label>
                <span>Current stock</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={inventoryEditor.current}
                  onChange={(event) =>
                    setInventoryEditor((current) =>
                      current
                        ? { ...current, current: event.target.value }
                        : current,
                    )
                  }
                />
              </label>
              <label>
                <span>Full level</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={inventoryEditor.fullLevel}
                  onChange={(event) =>
                    setInventoryEditor((current) =>
                      current
                        ? { ...current, fullLevel: event.target.value }
                        : current,
                    )
                  }
                />
              </label>
              <label>
                <span>Reorder at</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={inventoryEditor.reorderAt}
                  onChange={(event) =>
                    setInventoryEditor((current) =>
                      current
                        ? { ...current, reorderAt: event.target.value }
                        : current,
                    )
                  }
                />
              </label>
              <label>
                <span>Expected daily use</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={inventoryEditor.dailyUse}
                  onChange={(event) =>
                    setInventoryEditor((current) =>
                      current
                        ? { ...current, dailyUse: event.target.value }
                        : current,
                    )
                  }
                />
              </label>

              <label>
                <span>Supplier</span>
                <select
                  value={inventoryEditor.supplierId}
                  disabled={!suppliers.length}
                  onChange={(event) => {
                    const supplier = suppliers.find(
                      (candidate) => candidate.id === event.target.value,
                    );
                    setInventoryEditor((current) =>
                      current
                        ? {
                            ...current,
                            supplierId: event.target.value,
                            contactId: supplier?.contacts[0]?.id ?? "",
                          }
                        : current,
                    );
                  }}
                >
                  {!suppliers.length ? (
                    <option value="">No supplier configured</option>
                  ) : null}
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                <div className={styles.inlineSupplierActions}>
                  <button
                    type="button"
                    onClick={() =>
                      setInlineSupplierEditor(
                        supplierDraftFromInline(),
                      )
                    }
                  >
                    <PlusCircle size={13} aria-hidden /> New supplier
                  </button>
                  {inventoryEditor.supplierId ? (
                    <button
                      type="button"
                      onClick={() =>
                        setInlineSupplierEditor(
                          supplierDraftFromInline(
                            suppliers.find(
                              (supplier) =>
                                supplier.id ===
                                inventoryEditor.supplierId,
                            ),
                          ),
                        )
                      }
                    >
                      <Pencil size={13} aria-hidden /> Edit supplier
                    </button>
                  ) : null}
                </div>
              </label>
              <label>
                <span>Contact</span>
                <select
                  value={inventoryEditor.contactId}
                  disabled={!inventoryEditor.supplierId}
                  onChange={(event) =>
                    setInventoryEditor((current) =>
                      current
                        ? { ...current, contactId: event.target.value }
                        : current,
                    )
                  }
                >
                  {(suppliers.find(
                    (supplier) =>
                      supplier.id === inventoryEditor.supplierId,
                  )?.contacts ?? []).map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} · {contact.role}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Purchase mode</span>
                <select
                  value={inventoryEditor.purchasingMode}
                  onChange={(event) =>
                    setInventoryEditor((current) =>
                      current
                        ? {
                            ...current,
                            purchasingMode: event.target.value as "fixed" | "quote",
                          }
                        : current,
                    )
                  }
                >
                  <option value="fixed">Fixed / contracted price</option>
                  <option value="quote">Supplier quote required</option>
                </select>
              </label>

              <label>
                <span>Pack size</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={inventoryEditor.packSize}
                  onChange={(event) =>
                    setInventoryEditor((current) =>
                      current
                        ? { ...current, packSize: event.target.value }
                        : current,
                    )
                  }
                />
              </label>
              <label>
                <span>Pack price</span>
                <div className={styles.moneyInput}>
                  <b>₱</b>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={inventoryEditor.packPrice}
                    onChange={(event) =>
                      setInventoryEditor((current) =>
                        current
                          ? { ...current, packPrice: event.target.value }
                          : current,
                      )
                    }
                  />
                </div>
              </label>
              <label>
                <span>Purchase unit label</span>
                <input
                  value={inventoryEditor.purchaseUnit}
                  placeholder="1 kg pack"
                  onChange={(event) =>
                    setInventoryEditor((current) =>
                      current
                        ? { ...current, purchaseUnit: event.target.value }
                        : current,
                    )
                  }
                />
              </label>
              <label>
                <span>Lead time</span>
                <div className={styles.numberWithUnit}>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={inventoryEditor.leadDays}
                    onChange={(event) =>
                      setInventoryEditor((current) =>
                        current
                          ? { ...current, leadDays: event.target.value }
                          : current,
                      )
                    }
                  />
                  <span>days</span>
                </div>
              </label>

              <label>
                <span>Automation</span>
                <select
                  value={
                    inventoryEditor.automationEnabled
                      ? inventoryEditor.automationMode
                      : "manual"
                  }
                  onChange={(event) =>
                    setInventoryEditor((current) =>
                      current
                        ? event.target.value === "manual"
                          ? {
                              ...current,
                              automationEnabled: false,
                              automationMode: "assist",
                            }
                          : {
                              ...current,
                              automationEnabled: true,
                              automationMode: event.target.value as
                                | "assist"
                                | "auto_contact"
                                | "autobuy",
                            }
                        : current,
                    )
                  }
                >
                  <option value="manual">Manual</option>
                  <option value="assist">Jourvis · watch only</option>
                  <option value="auto_contact">Jourvis · contact supplier</option>
                  <option value="autobuy">Jourvis · buy within limits</option>
                </select>
              </label>
              <label>
                <span>Action trigger</span>
                <div className={styles.numberWithUnit}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={inventoryEditor.automationTriggerPercent}
                    onChange={(event) =>
                      setInventoryEditor((current) =>
                        current
                          ? {
                              ...current,
                              automationTriggerPercent: event.target.value,
                            }
                          : current,
                      )
                    }
                  />
                  <span>%</span>
                </div>
              </label>
              <label>
                <span>Max automatic spend</span>
                <div className={styles.moneyInput}>
                  <b>₱</b>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={inventoryEditor.maxAutoOrderSpend}
                    onChange={(event) =>
                      setInventoryEditor((current) =>
                        current
                          ? {
                              ...current,
                              maxAutoOrderSpend: event.target.value,
                            }
                          : current,
                      )
                    }
                  />
                </div>
              </label>
            </div>

            {inlineSupplierEditor ? (
              <section className={styles.inlineSupplierEditor}>
                <SupplierEditorPanel
                  draft={inlineSupplierEditor}
                  setDraft={setInlineSupplierEditor}
                  onSave={saveInlineSupplier}
                  onCancel={() => setInlineSupplierEditor(null)}
                />
              </section>
            ) : null}

            <footer>
              <small>
                Target/auto-accept/hard price guards are initialized from the pack price and can be refined in Inventory → Update.
              </small>
              <div>
                <button
                  type="button"
                  onClick={() => setInventoryEditor(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-primary
                  onClick={submitInventoryEditor}
                >
                  <Save size={14} aria-hidden /> Create & add
                </button>
              </div>
            </footer>
          </section>
        ) : null}

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
