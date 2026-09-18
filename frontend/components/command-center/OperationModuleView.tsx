"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  PackageCheck,
  PlusCircle,
  ReceiptText,
  ShoppingBasket,
  Trash2,
  Truck,
} from "lucide-react";
import { operationCatalog } from "@/command-center/core/business-registry";
import {
  inventoryPercent,
  isPurchaseActive,
  projectedInventoryAtDelivery,
  purchaseProgressStage,
  projectedInventoryPercentAtDelivery,
  type CommandCenterStockAdjustmentReason,
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
  const [purchaseFilter, setPurchaseFilter] = useState<"active" | "history" | "all">("active");

  const {
    state,
    tasks,
    adjustInventory,
    receivePurchase,
    updatePurchaseQuantity,
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
    if (!Number.isFinite(amount) || amount <= 0) return;

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
                </div>

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
                        This manual action will be written to Activity with its reason and timestamp.
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

  if (moduleId === "menu" && state.menuItems.length) {
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
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
    const mappedCount = state.menuItems.filter((item) => item.recipeId).length;
    const referenceYear =
      state.menuItems.find((item) => item.referencePublicationDate)
        ?.referencePublicationDate?.slice(0, 4) ?? "archived";

    return (
      <section className={styles.sectionPage}>
        <OperationHeader
          businessId={businessId}
          moduleLabel={operationModule.label}
          description={operationModule.description}
        />

        <div className={styles.operationModuleHero}>
          <div>
            <span>MENU ECONOMICS</span>
            <h2>Separate what the menu says from what Jourvis can actually operate.</h2>
            <p>
              Marinara&apos;s archived menu references are visible here without being
              presented as current pricing. Items with an inventory recipe mapping can
              also expose ingredient cost, stock risk, possible servings, and simulated
              POS deductions.
            </p>
          </div>
          <ChefHat size={36} aria-hidden />
        </div>

        <div className={styles.activitySummary}>
          <article>
            <span>ARCHIVED REFERENCES</span>
            <strong>{state.menuItems.length}</strong>
            <small>menu entries and variants from {referenceYear}</small>
          </article>
          <article>
            <span>RECIPE MAPPED</span>
            <strong>{mappedCount}</strong>
            <small>items currently connected to inventory usage</small>
          </article>
          <article>
            <span>CURRENT PRICE VERIFIED</span>
            <strong>0</strong>
            <small>live POS/menu pricing is not connected yet</small>
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
          <span>{visibleMenuItems.length} of {state.menuItems.length} references</span>
        </div>

        <article className={styles.migrationCard}>
          <div>
            <span>REFERENCE DATA</span>
            <strong>Archived menu amounts are context, not current selling prices</strong>
            <p>
              Jourvis keeps the archived reference separate from the current-price field.
              A real POS or owner-approved menu source can replace the current-price value
              later without losing the historical reference.
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

            return (
              <article className={styles.menuCard} key={menuItem.id}>
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
                      <h3>{menuItem.printedName}</h3>
                    </div>
                    <b data-risk={Boolean(recipe) && riskyIngredients.length > 0}>
                      {recipe
                        ? riskyIngredients.length
                          ? riskyIngredients.length + " stock risk"
                          : "Recipe mapped"
                        : "Reference only"}
                    </b>
                  </div>

                  <p>
                    {recipe
                      ? recipe.description
                      : "Archived menu reference only. Ingredient quantities and inventory recipe mapping are not connected for this item yet."}
                  </p>

                  <div className={styles.menuEconomics}>
                    <div>
                      <ReceiptText size={15} aria-hidden />
                      <span>
                        <small>Archived {referenceYear} reference</small>
                        <strong>
                          {menuItem.referencePrice !== undefined
                            ? "₱" + Math.round(menuItem.referencePrice).toLocaleString("en-PH")
                            : "Not legible"}
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
                      <ShoppingBasket size={15} aria-hidden />
                      <span>
                        <small>{recipe ? "Possible servings" : "Current selling price"}</small>
                        <strong>
                          {recipe
                            ? possibleServings ?? 0
                            : menuItem.currentPriceVerified
                              ? "Verified"
                              : "Not connected"}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {recipe ? (
                    <>
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

                      <button
                        type="button"
                        className={styles.recipeSaleButton}
                        onClick={() => recordRecipeSale(recipe.id, 1)}
                      >
                        Simulate mapped POS sale
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  if (moduleId === "recipes" && state.recipes.length) {
    return (
      <section className={styles.sectionPage}>
        <OperationHeader
          businessId={businessId}
          moduleLabel={operationModule.label}
          description={operationModule.description}
        />

        <div className={styles.operationModuleHero}>
          <div>
            <span>RECIPE CONSUMPTION</span>
            <h2>Sales can flow directly into inventory usage.</h2>
            <p>
              The demo below simulates a POS sale. Jourvis deducts the configured recipe
              quantities automatically and records the reason in Activity.
            </p>
          </div>
          <ReceiptText size={36} aria-hidden />
        </div>

        <div className={styles.recipeGrid}>
          {state.recipes.map((recipe) => (
            <article className={styles.recipeCard} key={recipe.id}>
              <MenuPhoto
                menuId={recipe.id}
                className={styles.recipeDishPhoto}
              />
              <header>
                <div>
                  <span>RECIPE</span>
                  <h3>{recipe.name}</h3>
                  <p>{recipe.description}</p>
                </div>
                <ShoppingBasket size={20} aria-hidden />
              </header>

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

              <button
                type="button"
                className={styles.recipeSaleButton}
                onClick={() => recordRecipeSale(recipe.id, 1)}
              >
                Simulate POS sale
              </button>
            </article>
          ))}
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
