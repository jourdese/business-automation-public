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
  automationModeLabel,
  getContact,
  getSupplier,
  initialIngredients,
  loadConfiguredIngredients,
  resetInventoryRuntime,
  saveConfiguredIngredients,
  saveInventoryRuntime,
  suppliers,
} from "./inventory-config";
import StockIcon from "./StockIcon";
import JourvisPresence from "@/components/jourvis/JourvisPresence";
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

type StockAdjustment = {
  itemId: string;
  change: number;
  reason: "external_delivery" | "physical_count" | "waste" | "transfer" | "other";
};

type ProcurementStatus =
  | "requested"
  | "supplier_viewed"
  | "quote_received"
  | "counter_sent"
  | "awaiting_confirmation"
  | "confirmed"
  | "in_transit"
  | "partial_received"
  | "received"
  | "declined";

type ProcurementLine = {
  itemId: string;
  requestedQty: number;
  agreedQty?: number;
  quotedPackPrice?: number;
  receivedTotal?: number;
  deliveryQty?: number;
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
  origin: "manual" | "automation";
  previewOnly: boolean;
  automationMode?: Ingredient["automationMode"];
  counteroffersUsed: number;
  automationNote?: string;
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
const PROCUREMENT_RUNTIME_KEY = "jourvis:marinara:procurements:v2";
const ACTIVITY_RUNTIME_KEY = "jourvis:marinara:activity:v1";
const AUTOMATION_REJECTED_KEY = "jourvis:marinara:automation-rejected:v1";

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function percent(item: Ingredient) {
  return Math.max(0, Math.min(100, Math.round((item.current / Math.max(item.fullLevel, 0.01)) * 100)));
}

function automationTriggered(item: Ingredient) {
  return percent(item) <= Math.max(0, Math.min(100, item.automationTriggerPercent));
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

function automationGroupsForItems(items: Ingredient[]) {
  // Keep automated rules item-scoped. Manual Group Restock can still consolidate
  // suppliers, but Jourvis should not silently combine products with different
  // owner limits into one autonomous approval decision.
  return items.map((item) => [item]);
}

function procurementStatusLabel(status: ProcurementStatus) {
  if (status === "requested") return "Request sent";
  if (status === "supplier_viewed") return "Supplier viewed";
  if (status === "quote_received") return "Quote received";
  if (status === "counter_sent") return "Counter sent";
  if (status === "awaiting_confirmation") return "Awaiting confirmation";
  if (status === "confirmed") return "Confirmed";
  if (status === "in_transit") return "In transit";
  if (status === "partial_received") return "Partially received";
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
  const [automationMasterOn, setAutomationMasterOn] = useState(false);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [jourvisUpdateItemId, setJourvisUpdateItemId] = useState<string | null>(null);
  const [jourvisOpenKey, setJourvisOpenKey] = useState(0);
  const [automationAlerts, setAutomationAlerts] = useState<Record<string, string>>({});
  const [automationRejected, setAutomationRejected] = useState<Record<string, string>>({});
  const [contactDraft, setContactDraft] = useState<ContactDraft | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<StockAdjustment | null>(null);
  const [procurements, setProcurements] = useState<ProcurementRequest[]>([]);
  const [activity, setActivity] = useState([
    "Jourvis finished the morning inventory scan.",
    "42 guests are forecast for tonight's dinner service.",
  ]);

  useEffect(() => {
    const refreshConfiguration = () => setIngredients(loadConfiguredIngredients());

    const savedLabels = window.localStorage.getItem("jourvis-autoinventory-summary-labels");
    if (savedLabels !== null) setShowSummaryLabels(savedLabels === "true");

    const savedAutomation = window.localStorage.getItem("jourvis-autoinventory-automation-master");
    if (savedAutomation !== null) setAutomationMasterOn(savedAutomation === "true");

    try {
      const savedProcurements = window.localStorage.getItem(PROCUREMENT_RUNTIME_KEY);
      if (savedProcurements) setProcurements(JSON.parse(savedProcurements) as ProcurementRequest[]);
      const savedActivity = window.localStorage.getItem(ACTIVITY_RUNTIME_KEY);
      if (savedActivity) setActivity(JSON.parse(savedActivity) as string[]);
      const savedRejected = window.localStorage.getItem(AUTOMATION_REJECTED_KEY);
      if (savedRejected) setAutomationRejected(JSON.parse(savedRejected) as Record<string, string>);
    } catch {
      // Corrupt demo runtime data falls back to the seeded preview.
    }

    refreshConfiguration();

    const params = new URLSearchParams(window.location.search);
    const requestedStock = params.get("stock");
    if (requestedStock && initialIngredients.some((item) => item.id === requestedStock)) {
      setSelectedId(requestedStock);
    }
    if (params.get("jourvis") === "update") {
      const targetId = requestedStock && initialIngredients.some((item) => item.id === requestedStock)
        ? requestedStock
        : "shrimp";
      setJourvisUpdateItemId(targetId);
      setJourvisOpenKey((value) => value + 1);
      window.history.replaceState({}, "", window.location.pathname);
    }

    setRuntimeReady(true);
    window.addEventListener("focus", refreshConfiguration);
    return () => window.removeEventListener("focus", refreshConfiguration);
  }, []);

  useEffect(() => {
    if (!runtimeReady) return;
    saveInventoryRuntime(ingredients);
  }, [ingredients, runtimeReady]);

  useEffect(() => {
    if (!runtimeReady) return;
    window.localStorage.setItem(PROCUREMENT_RUNTIME_KEY, JSON.stringify(procurements));
  }, [procurements, runtimeReady]);

  useEffect(() => {
    if (!runtimeReady) return;
    window.localStorage.setItem(ACTIVITY_RUNTIME_KEY, JSON.stringify(activity));
  }, [activity, runtimeReady]);

  useEffect(() => {
    if (!runtimeReady) return;
    window.localStorage.setItem(AUTOMATION_REJECTED_KEY, JSON.stringify(automationRejected));
  }, [automationRejected, runtimeReady]);

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
        !automationRejected[item.id] &&
        !activeProcurementItemIds.has(item.id),
    ),
    [ingredients, activeProcurementItemIds, automationRejected],
  );

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

  const selectedAutomationAlert = automationAlerts[selected.id];
  const selectedAutomationPaused = Boolean(automationRejected[selected.id]);
  const selectedNeedsRestock = selected.current <= selected.reorderAt;
  const selectedAutomationTriggered =
    selected.automationEnabled && automationTriggered(selected);

  type DashboardTask = {
    id: string;
    kind:
      | "automation_exception"
      | "quote_approval"
      | "fixed_approval"
      | "automation_paused"
      | "manual_restock";
    priority: number;
    itemId: string;
    requestId?: string;
  };

  const jourvisTasks = useMemo(() => {
    const tasks: DashboardTask[] = [];
    const activeIds = new Set(
      procurements
        .filter((request) => activeProcurementStatus(request.status))
        .flatMap((request) => request.lines.map((line) => line.itemId)),
    );

    Object.keys(automationAlerts).forEach((itemId) => {
      tasks.push({
        id: `exception-${itemId}`,
        kind: "automation_exception",
        priority: 100,
        itemId,
      });
    });

    procurements.forEach((request) => {
      const firstItemId = request.lines[0]?.itemId;
      if (!firstItemId) return;
      if (request.status === "quote_received") {
        tasks.push({
          id: `quote-${request.id}`,
          kind: "quote_approval",
          priority: 95,
          itemId: firstItemId,
          requestId: request.id,
        });
        return;
      }
      if (
        request.status === "supplier_viewed" &&
        request.mode === "fixed" &&
        !request.buyerConfirmed
      ) {
        tasks.push({
          id: `fixed-${request.id}`,
          kind: "fixed_approval",
          priority: 90,
          itemId: firstItemId,
          requestId: request.id,
        });
      }
    });

    ingredients.forEach((item) => {
      if (
        item.automationEnabled &&
        automationTriggered(item) &&
        !automationMasterOn &&
        !automationRejected[item.id] &&
        !activeIds.has(item.id)
      ) {
        tasks.push({
          id: `paused-${item.id}`,
          kind: "automation_paused",
          priority: 80,
          itemId: item.id,
        });
        return;
      }
      if (
        item.current <= item.reorderAt &&
        !automationRejected[item.id] &&
        !activeIds.has(item.id) &&
        (!item.automationEnabled || item.automationMode === "assist")
      ) {
        tasks.push({
          id: `restock-${item.id}`,
          kind: "manual_restock",
          priority: 60,
          itemId: item.id,
        });
      }
    });

    return tasks.sort((a, b) => b.priority - a.priority);
  }, [automationAlerts, automationMasterOn, ingredients, procurements]);

  const jourvisTask = jourvisTasks[0];
  const jourvisTaskItem = jourvisTask
    ? ingredients.find((item) => item.id === jourvisTask.itemId)
    : undefined;
  const jourvisTaskRequest = jourvisTask?.requestId
    ? procurements.find((request) => request.id === jourvisTask.requestId)
    : undefined;
  const jourvisWorkingRequest = !jourvisTask
    ? activeProcurements.find((request) =>
        ["requested", "supplier_viewed", "counter_sent", "awaiting_confirmation", "confirmed", "in_transit", "partial_received"].includes(request.status),
      )
    : undefined;
  const jourvisWorkingItem = jourvisWorkingRequest
    ? ingredients.find((item) => item.id === jourvisWorkingRequest.lines[0]?.itemId)
    : undefined;

  const jourvisAttention = Boolean(jourvisTask);
  const jourvisFocusTarget = jourvisTask
    ? jourvisTask.kind === "automation_exception"
      ? activeTab === "overview"
        ? jourvisTask.itemId === selected.id
          ? "#jourvis-automation-decision"
          : `#summary-item-${jourvisTask.itemId}`
        : "#autoinventory-tab-overview"
      : jourvisTask.kind === "quote_approval" || jourvisTask.kind === "fixed_approval"
        ? activeTab === "orders" && jourvisTaskRequest
          ? `#procurement-${jourvisTaskRequest.id}`
          : "#autoinventory-tab-orders"
        : jourvisTask.kind === "automation_paused"
          ? activeTab === "overview"
            ? "#jourvis-auto-master"
            : "#autoinventory-tab-overview"
          : activeTab === "overview"
            ? `#summary-item-${jourvisTask.itemId}`
            : "#autoinventory-tab-overview"
    : undefined;

  const jourvisFocusLabel = jourvisTask
    ? jourvisTask.kind === "automation_exception"
      ? "Approve or reject"
      : jourvisTask.kind === "quote_approval"
        ? "Quote needs you"
        : jourvisTask.kind === "fixed_approval"
          ? "Approve this order"
          : jourvisTask.kind === "automation_paused"
            ? "Turn me on"
            : "Restock needed"
    : undefined;

  const jourvisMessage = jourvisTask && jourvisTaskItem
    ? jourvisTask.kind === "automation_exception"
      ? `${jourvisTaskItem.name} is outside one of my automatic limits.`
      : jourvisTask.kind === "quote_approval"
        ? `${jourvisTaskItem.name} has a supplier quote that needs your decision.`
        : jourvisTask.kind === "fixed_approval"
          ? `${jourvisTaskItem.name} has a purchase order ready for approval.`
          : jourvisTask.kind === "automation_paused"
            ? `${jourvisTaskItem.name} reached my ${jourvisTaskItem.automationTriggerPercent}% trigger, but Jourvis Auto is paused.`
            : `${jourvisTaskItem.name} is low and needs restocking.`
    : jourvisWorkingRequest && jourvisWorkingItem
      ? jourvisWorkingRequest.status === "requested"
        ? `I sent the ${jourvisWorkingItem.name} request. I’m waiting for the supplier to open it.`
        : jourvisWorkingRequest.status === "supplier_viewed"
          ? `The supplier opened the ${jourvisWorkingItem.name} request. I’m waiting for their response.`
          : jourvisWorkingRequest.status === "counter_sent"
            ? `I sent the ${jourvisWorkingItem.name} counteroffer. I’m waiting for the supplier.`
            : jourvisWorkingRequest.status === "awaiting_confirmation"
              ? `The ${jourvisWorkingItem.name} price is agreed. I’m waiting for final supplier confirmation.`
              : jourvisWorkingRequest.status === "confirmed"
                ? `${jourvisWorkingItem.name} is confirmed. I’m waiting for dispatch.`
                : jourvisWorkingRequest.status === "partial_received"
                  ? `${jourvisWorkingItem.name} was only partially received. The remainder is still open.`
                  : `${jourvisWorkingItem.name} is in transit.`
      : selected.automationEnabled
        ? `I’m watching ${selected.name} at ${percent(selected)}%.`
        : `I’m here. ${selected.name} is at ${percent(selected)}%.`;

  const jourvisDetail = jourvisTask && jourvisTaskItem
    ? jourvisTask.kind === "automation_exception"
      ? automationAlerts[jourvisTaskItem.id]
      : jourvisTask.kind === "quote_approval" && jourvisTaskRequest
        ? `${getSupplier(jourvisTaskItem).name} quoted ${formatMoney(procurementTotal(jourvisTaskRequest, ingredients))}. Approve, reject, or review the quote.`
        : jourvisTask.kind === "fixed_approval" && jourvisTaskRequest
          ? `The known order total is ${formatMoney(procurementTotal(jourvisTaskRequest, ingredients))}. Jourvis is waiting for your approval before supplier confirmation.`
          : jourvisTask.kind === "automation_paused"
            ? "Turn Jourvis Auto on if you want me to start handling configured items again."
            : `Current stock is ${percent(jourvisTaskItem)}%. You can contact the supplier or configure automation.`
    : jourvisWorkingRequest?.automationNote
      ? jourvisWorkingRequest.automationNote
      : jourvisWorkingRequest
        ? "I’m handling the supplier-side demo automatically. I’ll interrupt you only when a decision belongs to you."
        : selectedAutomationPaused
          ? `You paused automation for ${selected.name} after rejecting a purchase. I will not try again until you resume it.`
          : selected.automationEnabled
            ? `I act at ${selected.automationTriggerPercent}% or lower in ${selected.automationMode === "assist" ? "watch only" : selected.automationMode === "auto_contact" ? "contact supplier" : "buy within limits"} mode.`
            : "Configure this supply if you want me to watch it or handle purchasing within your limits.";

  const automationEnabledCount = ingredients.filter((item) => item.automationEnabled).length;

  useEffect(() => {
    if (!automationMasterOn) return;

    const activeItemIds = new Set(
      procurements
        .filter((request) => activeProcurementStatus(request.status))
        .flatMap((request) => request.lines.map((line) => line.itemId)),
    );

    const candidates = ingredients.filter(
      (item) =>
        item.automationEnabled &&
        item.automationMode !== "assist" &&
        automationTriggered(item) &&
        !automationRejected[item.id] &&
        !activeItemIds.has(item.id),
    );

    if (!candidates.length) return;

    const eligible: Ingredient[] = [];
    const blocked: Record<string, string> = {};

    candidates.forEach((item) => {
      const quantity = suggestedOrder(item);
      const packPrice = item.purchasingMode === "fixed" ? item.packPrice : item.targetPackPrice;
      const estimatedSpend = Math.ceil(quantity / Math.max(item.packSize, 0.01)) * packPrice;

      if (quantity > item.maxAutoOrderQty) {
        blocked[item.id] = `Jourvis paused: suggested ${quantity} ${item.unit} exceeds the automatic quantity limit of ${item.maxAutoOrderQty} ${item.unit}.`;
        return;
      }

      if (item.purchasingMode === "fixed") {
        if (estimatedSpend > item.maxAutoOrderSpend) {
          blocked[item.id] = `Jourvis paused: the known order total ${formatMoney(estimatedSpend)} exceeds your automatic order cap of ${formatMoney(item.maxAutoOrderSpend)}.`;
          return;
        }
        if (item.packPrice > item.hardMaxPackPrice) {
          blocked[item.id] = `Jourvis paused: configured pack price ${formatMoney(item.packPrice)} is above the hard maximum of ${formatMoney(item.hardMaxPackPrice)}.`;
          return;
        }
      }

      if (item.leadDays > item.maxLeadDays) {
        blocked[item.id] = `Jourvis paused: supplier lead time of ${item.leadDays} days exceeds the allowed ${item.maxLeadDays} days.`;
        return;
      }

      eligible.push(item);
    });

    if (Object.keys(blocked).length) {
      Object.entries(blocked)
        .filter(([id]) => !automationAlerts[id])
        .forEach(([, message]) => log(message));
      setAutomationAlerts((current) => ({ ...current, ...blocked }));
    }

    if (!eligible.length) return;

    const groups = automationGroupsForItems(eligible);
    const approvedGroups: Ingredient[][] = [];
    const groupedBlocks: Record<string, string> = {};

    groups.forEach((items) => {
      if (items[0]?.purchasingMode !== "fixed") {
        approvedGroups.push(items);
        return;
      }

      const knownTotal = items.reduce((sum, item) => {
        const quantity = suggestedOrder(item);
        return sum + Math.ceil(quantity / Math.max(item.packSize, 0.01)) * item.packPrice;
      }, 0);
      const groupCap = Math.min(...items.map((item) => item.maxAutoOrderSpend));

      if (knownTotal > groupCap) {
        items.forEach((item) => {
          groupedBlocks[item.id] =
            `Jourvis paused: the combined order from ${getSupplier(item).name} is ${formatMoney(knownTotal)}, above the automatic order cap of ${formatMoney(groupCap)}.`;
        });
        return;
      }

      approvedGroups.push(items);
    });

    if (Object.keys(groupedBlocks).length) {
      Object.entries(groupedBlocks)
        .filter(([id]) => !automationAlerts[id])
        .forEach(([, message]) => log(message));
      setAutomationAlerts((current) => ({ ...current, ...groupedBlocks }));
    }

    const startIndex = procurements.length;

    const automaticRequests: ProcurementRequest[] = approvedGroups.map((items, index) => {
      const first = items[0];
      const supplier = getSupplier(first);
      const contact = getContact(first);
      return {
        id: `AUTO-${String(startIndex + index + 1).padStart(3, "0")}`,
        supplierId: supplier.id,
        contactId: contact.id,
        mode: first.purchasingMode,
        status: "requested",
        lines: items.map((item) => ({
          itemId: item.id,
          requestedQty: Math.min(suggestedOrder(item), item.maxAutoOrderQty),
        })),
        deliveryFee: 0,
        etaDays: Math.max(...items.map((item) => item.leadDays)),
        buyerConfirmed:
          first.purchasingMode === "fixed" && first.automationMode === "autobuy",
        supplierConfirmed: false,
        incomingApplied: false,
        origin: "automation",
        previewOnly: items.some((item) => item.automationPreview),
        automationMode: first.automationMode,
        counteroffersUsed: 0,
        automationNote:
          first.automationMode === "autobuy"
            ? "Jourvis started this request automatically under the configured buying rules."
            : "Jourvis contacted the supplier automatically. Owner approval remains required.",
      };
    });

    setProcurements((current) => [...automaticRequests, ...current]);
    const approvedItemIds = new Set(
      approvedGroups.flatMap((items) => items.map((item) => item.id)),
    );
    setAutomationAlerts((current) => {
      const next = { ...current };
      approvedItemIds.forEach((itemId) => delete next[itemId]);
      return next;
    });

    automaticRequests.forEach((request) => {
      const supplier = suppliers.find((candidate) => candidate.id === request.supplierId) ?? suppliers[0];
      log(
        request.previewOnly
          ? `${request.id}: PREVIEW — Jourvis would contact ${supplier.name} automatically because configured stock reached its trigger.`
          : `${request.id}: Jourvis automatically contacted ${supplier.name} because configured stock reached its trigger.`,
      );
    });
  }, [automationMasterOn, ingredients, procurements, automationRejected]);

  useEffect(() => {
    if (!runtimeReady) return;

    const request = procurements.find((candidate) => {
      if (candidate.status === "requested") return true;
      if (candidate.status === "supplier_viewed" && candidate.mode === "quote") return true;
      if (
        candidate.status === "supplier_viewed" &&
        candidate.mode === "fixed" &&
        candidate.buyerConfirmed
      ) return true;
      if (candidate.status === "counter_sent") return true;
      if (candidate.status === "awaiting_confirmation") return true;
      if (candidate.status === "confirmed") return true;
      return false;
    });

    if (!request) return;

    const timer = window.setTimeout(() => {
      if (request.status === "requested") {
        supplierViewsRequest(request);
        return;
      }
      if (request.status === "supplier_viewed" && request.mode === "quote") {
        supplierSubmitsQuote(request);
        return;
      }
      if (
        request.status === "supplier_viewed" &&
        request.mode === "fixed" &&
        request.buyerConfirmed
      ) {
        confirmProcurement(request, "acknowledgment");
        return;
      }
      if (request.status === "counter_sent") {
        confirmProcurement(request, "counter");
        return;
      }
      if (request.status === "awaiting_confirmation") {
        confirmProcurement(request, "quote");
        return;
      }
      if (request.status === "confirmed") {
        markProcurementInTransit(request);
      }
    }, request.status === "requested" ? 700 : 900);

    return () => window.clearTimeout(timer);
  }, [procurements, runtimeReady]);

  function log(message: string) {
    setActivity((current) => [message, ...current].slice(0, 12));
  }

  function updateIngredient(id: string, updater: (item: Ingredient) => Ingredient) {
    setIngredients((current) => current.map((item) => (item.id === id ? updater(item) : item)));
  }

  function openJourvisUpdate(item: Ingredient) {
    setSelectedId(item.id);
    setJourvisUpdateItemId(item.id);
    setJourvisOpenKey((value) => value + 1);
  }

  function updateJourvisConfig(id: string, patch: Partial<Ingredient>) {
    setIngredients((current) => {
      const next = current.map((item) => item.id === id ? { ...item, ...patch } : item);
      saveConfiguredIngredients(next);
      return next;
    });
  }

  function changeJourvisSupplier(item: Ingredient, supplierId: string) {
    const supplier = suppliers.find((candidate) => candidate.id === supplierId) ?? suppliers[0];
    updateJourvisConfig(item.id, { supplierId: supplier.id, contactId: supplier.contacts[0].id });
  }

  function recordWaste(item: Ingredient) {
    const amount = Math.min(item.current, Math.max(0.05, item.fullLevel * 0.05));
    updateIngredient(item.id, (current) => ({
      ...current,
      current: round(Math.max(0, current.current - amount)),
    }));
    log(`Recorded ${round(amount)} ${item.unit} of ${item.name} as demo waste/spoilage.`);
  }

  function openStockAdjustment(item: Ingredient) {
    setStockAdjustment({
      itemId: item.id,
      change: item.packSize,
      reason: "external_delivery",
    });
  }

  function applyStockAdjustment() {
    if (!stockAdjustment) return;
    const item = ingredients.find((candidate) => candidate.id === stockAdjustment.itemId);
    if (!item) return;
    const change = round(stockAdjustment.change);
    if (!change) {
      setStockAdjustment(null);
      return;
    }

    const nextCurrent = round(Math.max(0, item.current + change));
    const appliedChange = round(nextCurrent - item.current);

    updateIngredient(item.id, (current) => ({
      ...current,
      current: nextCurrent,
    }));

    const labels: Record<StockAdjustment["reason"], string> = {
      external_delivery: "external delivery",
      physical_count: "physical count correction",
      waste: "waste/spoilage adjustment",
      transfer: "stock transfer",
      other: "manual adjustment",
    };

    log(
      `Stock adjusted: ${item.name} ${appliedChange > 0 ? "+" : ""}${appliedChange} ${item.unit} · ${labels[stockAdjustment.reason]}.`,
    );
    setStockAdjustment(null);
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
    resetInventoryRuntime();
    window.localStorage.removeItem(PROCUREMENT_RUNTIME_KEY);
    window.localStorage.removeItem(ACTIVITY_RUNTIME_KEY);
    window.localStorage.removeItem(AUTOMATION_REJECTED_KEY);
    setIngredients(loadConfiguredIngredients());
    setSelectedId("shrimp");
    setActiveTab("overview");
    setStockFilter("All");
    setSearchTerm("");
    setAutomationAlerts({});
    setAutomationRejected({});
    setContactDraft(null);
    setStockAdjustment(null);
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
        origin: "manual",
        previewOnly: false,
        counteroffersUsed: 0,
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

  function approveRestockItem(item: Ingredient) {
    const quantity = suggestedOrder(item);
    if (quantity <= 0) return;
    const supplier = getSupplier(item);
    const contact = getContact(item);
    const request: ProcurementRequest = {
      id: `REQ-${String(procurements.length + 1).padStart(3, "0")}`,
      supplierId: supplier.id,
      contactId: contact.id,
      mode: item.purchasingMode,
      status: "requested",
      lines: [{ itemId: item.id, requestedQty: quantity }],
      deliveryFee: 0,
      etaDays: item.leadDays,
      buyerConfirmed: item.purchasingMode === "fixed",
      supplierConfirmed: false,
      incomingApplied: false,
      origin: "manual",
      previewOnly: true,
      counteroffersUsed: 0,
      automationNote: "Owner approved the suggested restock through Jourvis.",
    };
    setAutomationRejected((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    setProcurements((current) => [request, ...current]);
    log(`${request.id}: approved ${quantity} ${item.unit} of ${item.name}. Jourvis started the supplier flow.`);
  }

  function rejectItem(item: Ingredient, reason = "purchase") {
    setAutomationRejected((current) => ({ ...current, [item.id]: "owner_paused" }));
    setAutomationAlerts((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    log(`Jourvis paused ${reason} automation for ${item.name} after your rejection. It will not try again until you resume it.`);
  }

  function approveAutomationException(item: Ingredient) {
    const quantity = suggestedOrder(item);
    if (quantity <= 0) {
      setAutomationAlerts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      return;
    }

    const supplier = getSupplier(item);
    const contact = getContact(item);
    const request: ProcurementRequest = {
      id: `AUTO-OVR-${String(procurements.length + 1).padStart(3, "0")}`,
      supplierId: supplier.id,
      contactId: contact.id,
      mode: item.purchasingMode,
      status: "requested",
      lines: [{ itemId: item.id, requestedQty: quantity }],
      deliveryFee: 0,
      etaDays: item.leadDays,
      buyerConfirmed: item.purchasingMode === "fixed",
      supplierConfirmed: false,
      incomingApplied: false,
      origin: "automation",
      previewOnly: item.automationPreview,
      automationMode: item.automationMode,
      counteroffersUsed: 0,
      automationNote:
        "Owner approved a one-time override for this automation limit. Normal limits remain unchanged for future requests.",
    };

    setProcurements((current) => [request, ...current]);
    setAutomationAlerts((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    setAutomationRejected((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    log(
      `${request.id}: owner approved the automation exception for ${item.name}. Jourvis continued with ${quantity} ${item.unit} without changing the saved spending limits.`,
    );
    setActiveTab("orders");
  }

  function rejectAutomationException(item: Ingredient) {
    setAutomationRejected((current) => ({ ...current, [item.id]: "owner_paused" }));
    setAutomationAlerts((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    log(
      `Jourvis automation paused for ${item.name} after your rejection. It will not try again until you resume it.`,
    );
  }

  function resumeAutomation(item: Ingredient) {
    setAutomationRejected((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    log(`Jourvis automation resumed for ${item.name}.`);
  }

  function supplierViewsRequest(request: ProcurementRequest) {
    updateProcurement(request.id, (current) => ({ ...current, status: "supplier_viewed" }));
    log(`${request.id}: supplier viewed the request.`);
  }

  function supplierSubmitsQuote(request: ProcurementRequest) {
    const quotedLines = request.lines.map((line) => {
      const item = ingredients.find((candidate) => candidate.id === line.itemId);
      return {
        ...line,
        agreedQty: line.requestedQty,
        quotedPackPrice: item ? Math.round(item.packPrice * 1.05) : 0,
      };
    });

    const quotedRequest: ProcurementRequest = {
      ...request,
      status: "quote_received",
      deliveryFee: 150,
      lines: quotedLines,
    };

    if (request.origin === "automation" && request.automationMode === "autobuy") {
      const items = quotedLines
        .map((line) => ingredients.find((candidate) => candidate.id === line.itemId))
        .filter((item): item is Ingredient => Boolean(item));
      const quotedTotal = procurementTotal(quotedRequest, ingredients);
      const groupSpendCap = items.length
        ? Math.min(...items.map((item) => item.maxAutoOrderSpend))
        : 0;

      const withinAutoAccept =
        quotedTotal <= groupSpendCap &&
        quotedLines.every((line) => {
        const item = ingredients.find((candidate) => candidate.id === line.itemId);
        if (!item) return false;
        const quantity = line.agreedQty ?? line.requestedQty;
        const price = line.quotedPackPrice ?? Number.POSITIVE_INFINITY;
        const lineSpend = Math.ceil(quantity / Math.max(item.packSize, 0.01)) * price;
        return (
          price <= item.autoAcceptPackPrice &&
          price <= item.hardMaxPackPrice &&
          lineSpend <= item.maxAutoOrderSpend &&
          quantity <= item.maxAutoOrderQty &&
          quotedRequest.deliveryFee <= item.maxDeliveryFee &&
          quotedRequest.etaDays <= item.maxLeadDays
        );
      });

      if (withinAutoAccept) {
        updateProcurement(request.id, () => ({
          ...quotedRequest,
          status: "awaiting_confirmation",
          buyerConfirmed: true,
          automationNote: "Jourvis auto-accepted the supplier quote because every term stayed inside the configured limits.",
        }));
        log(`${request.id}: Jourvis auto-accepted the quote within the configured price, spend, delivery-fee and lead-time limits.`);
        return;
      }

      const targetTotal = quotedLines.reduce((sum, line) => {
        const item = ingredients.find((candidate) => candidate.id === line.itemId);
        if (!item) return sum;
        const quantity = line.agreedQty ?? line.requestedQty;
        return sum +
          Math.ceil(quantity / Math.max(item.packSize, 0.01)) * item.targetPackPrice;
      }, quotedRequest.deliveryFee);

      const canAutoCounter =
        targetTotal <= groupSpendCap &&
        quotedLines.every((line) => {
        const item = ingredients.find((candidate) => candidate.id === line.itemId);
        if (!item) return false;
        const price = line.quotedPackPrice ?? Number.POSITIVE_INFINITY;
        const quantity = line.agreedQty ?? line.requestedQty;
        const targetSpend =
          Math.ceil(quantity / Math.max(item.packSize, 0.01)) * item.targetPackPrice;
        return (
          item.autoNegotiate &&
          price <= item.hardMaxPackPrice &&
          request.counteroffersUsed < item.maxCounteroffers &&
          targetSpend <= item.maxAutoOrderSpend &&
          quotedRequest.deliveryFee <= item.maxDeliveryFee &&
          quotedRequest.etaDays <= item.maxLeadDays
        );
      });

      if (canAutoCounter && items.length) {
        updateProcurement(request.id, () => ({
          ...quotedRequest,
          status: "counter_sent",
          buyerConfirmed: true,
          counteroffersUsed: request.counteroffersUsed + 1,
          automationNote: "Jourvis automatically countered at the configured target price.",
          lines: quotedLines.map((line) => {
            const item = ingredients.find((candidate) => candidate.id === line.itemId);
            return {
              ...line,
              quotedPackPrice: item?.targetPackPrice ?? line.quotedPackPrice,
            };
          }),
        }));
        log(`${request.id}: supplier quote exceeded the auto-accept ceiling, so Jourvis automatically countered at the configured target price.`);
        return;
      }

      const firstItem = items[0];
      const overOrderCap = quotedTotal > groupSpendCap;
      const maxQuotedPack = Math.max(...quotedLines.map((line) => line.quotedPackPrice ?? 0));
      const note = overOrderCap
        ? `Supplier quoted ${formatMoney(quotedTotal)}, which is ${formatMoney(quotedTotal - groupSpendCap)} above the automatic order limit of ${formatMoney(groupSpendCap)}.`
        : firstItem && maxQuotedPack > firstItem.autoAcceptPackPrice
          ? `Supplier price is above Jourvis' automatic price limit. Approve this quote once, reject it, or review it in Orders.`
          : "Supplier terms are outside Jourvis' automatic delivery rules. Owner approval is required.";

      updateProcurement(request.id, () => ({
        ...quotedRequest,
        automationNote: note,
      }));
      log(`${request.id}: Jourvis paused for owner approval because the supplier quote falls outside the configured automation limits.`);
      return;
    }

    updateProcurement(request.id, () => quotedRequest);
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
      counteroffersUsed: current.counteroffersUsed + 1,
      automationNote: undefined,
      lines: current.lines.map((line) => {
        const item = ingredients.find((candidate) => candidate.id === line.itemId);
        return {
          ...line,
          quotedPackPrice: item?.targetPackPrice ?? item?.packPrice ?? line.quotedPackPrice,
          agreedQty: line.agreedQty ?? line.requestedQty,
        };
      }),
    }));
    log(`${request.id}: buyer sent a counteroffer using the configured target price.`);
  }

  function buyerApprovesFixedAutomation(request: ProcurementRequest) {
    updateProcurement(request.id, (current) => ({
      ...current,
      status: "supplier_viewed",
      buyerConfirmed: true,
      automationNote: "Owner approved the prepared fixed-price order. Jourvis is waiting for supplier acknowledgment.",
    }));
    log(`${request.id}: owner approved the prepared fixed-price order. Awaiting supplier acknowledgment.`);
  }

  function declineProcurement(request: ProcurementRequest) {
    updateProcurement(request.id, (current) => ({ ...current, status: "declined" }));
    const itemIds = request.lines.map((line) => line.itemId);
    setAutomationRejected((current) => {
      const next = { ...current };
      itemIds.forEach((itemId) => {
        next[itemId] = "owner_paused";
      });
      return next;
    });
    const names = itemIds
      .map((itemId) => ingredients.find((item) => item.id === itemId)?.name)
      .filter(Boolean)
      .join(", ");
    log(`${request.id}: rejected by owner. Jourvis is paused for ${names || "this supply"} until you resume it.`);
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
        receivedTotal: line.receivedTotal ?? 0,
        deliveryQty: line.agreedQty ?? line.requestedQty,
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
      lines: current.lines.map((line) => {
        if (line.itemId !== itemId) return line;
        const agreed = line.agreedQty ?? line.requestedQty;
        const alreadyReceived = line.receivedTotal ?? 0;
        const remaining = Math.max(0, agreed - alreadyReceived);
        return {
          ...line,
          deliveryQty: Math.max(0, Math.min(remaining, round(quantity))),
        };
      }),
    }));
  }

  function receiveProcurement(request: ProcurementRequest) {
    const receiptByItem = new Map(
      request.lines.map((line) => {
        const agreed = line.agreedQty ?? line.requestedQty;
        const alreadyReceived = line.receivedTotal ?? 0;
        const remaining = Math.max(0, agreed - alreadyReceived);
        const receivedNow = Math.max(
          0,
          Math.min(remaining, line.deliveryQty ?? remaining),
        );
        return [line.itemId, { agreed, alreadyReceived, remaining, receivedNow }] as const;
      }),
    );

    const nextLines = request.lines.map((line) => {
      const receipt = receiptByItem.get(line.itemId);
      if (!receipt) return line;
      const receivedTotal = round(receipt.alreadyReceived + receipt.receivedNow);
      const remainingAfter = round(Math.max(0, receipt.agreed - receivedTotal));
      return {
        ...line,
        receivedTotal,
        deliveryQty: remainingAfter,
      };
    });
    const completed = nextLines.every((line) => {
      const agreed = line.agreedQty ?? line.requestedQty;
      return (line.receivedTotal ?? 0) >= agreed;
    });

    setIngredients((current) =>
      current.map((item) => {
        const receipt = receiptByItem.get(item.id);
        if (!receipt) return item;
        return {
          ...item,
          current: round(item.current + receipt.receivedNow),
          incoming: round(Math.max(0, item.incoming - receipt.receivedNow)),
        };
      }),
    );

    updateProcurement(request.id, (current) => ({
      ...current,
      status: completed ? "received" : "partial_received",
      lines: nextLines,
    }));

    log(
      completed
        ? `${request.id}: delivery fully received and procurement closed.`
        : `${request.id}: partial delivery recorded. The remaining quantity stays incoming and the order remains open.`,
    );
  }

  const tabCounts: Record<PrimaryTab, number> = {
    overview: urgent.length,
    stock: ingredients.length,
    recipes: recipes.length,
    orders: suggested.length + activeProcurements.length,
    activity: activity.length,
  };

  const jourvisUpdateItem = jourvisUpdateItemId
    ? ingredients.find((item) => item.id === jourvisUpdateItemId)
    : undefined;
  const jourvisUpdateSupplier = jourvisUpdateItem
    ? getSupplier(jourvisUpdateItem)
    : undefined;
  const jourvisUpdateContact = jourvisUpdateItem
    ? getContact(jourvisUpdateItem)
    : undefined;

  const jourvisUpdatePanel = jourvisUpdateItem && jourvisUpdateSupplier && jourvisUpdateContact ? (
    <div className={styles.jourvisUpdatePanel}>
      <div className={styles.jourvisUpdateTitle}>
        <StockIcon stockId={jourvisUpdateItem.id} className={styles.stockIconSmall} size={24} />
        <div>
          <span>UPDATE {jourvisUpdateItem.name.toUpperCase()}</span>
          <strong>{jourvisUpdateItem.current} {jourvisUpdateItem.unit} · {percent(jourvisUpdateItem)}%</strong>
        </div>
      </div>

      {automationRejected[jourvisUpdateItem.id] ? (
        <div className={styles.jourvisPausedInline}>
          <strong>Paused by you</strong>
          <p>I will not start another automatic purchase for this item until you resume me.</p>
          <button type="button" onClick={() => resumeAutomation(jourvisUpdateItem)}>Resume Jourvis</button>
        </div>
      ) : null}

      <div className={styles.jourvisUpdateSection}>
        <span>JOURVIS CONTROL</span>
        <label className={styles.jourvisInlineToggle}>
          <span>
            <strong>Manage this supply</strong>
            <small>Let Jourvis watch this item and act according to the rules below.</small>
          </span>
          <input
            type="checkbox"
            checked={jourvisUpdateItem.automationEnabled}
            onChange={(event) => updateJourvisConfig(jourvisUpdateItem.id, { automationEnabled: event.target.checked })}
          />
        </label>
        <label className={styles.jourvisInlineToggle}>
          <span>
            <strong>Global automation</strong>
            <small>Pause or resume all configured Jourvis automation.</small>
          </span>
          <input
            type="checkbox"
            checked={automationMasterOn}
            onChange={(event) => {
              const next = event.target.checked;
              setAutomationMasterOn(next);
              window.localStorage.setItem("jourvis-autoinventory-automation-master", String(next));
            }}
          />
        </label>
        <div className={styles.jourvisUpdateGrid}>
          <label>
            <span>Act at</span>
            <div><input type="number" min="0" max="100" value={jourvisUpdateItem.automationTriggerPercent} onChange={(event) => updateJourvisConfig(jourvisUpdateItem.id, { automationTriggerPercent: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /><b>%</b></div>
          </label>
          <label>
            <span>Jourvis may</span>
            <select value={jourvisUpdateItem.automationMode} onChange={(event) => updateJourvisConfig(jourvisUpdateItem.id, { automationMode: event.target.value as Ingredient["automationMode"] })}>
              <option value="assist">Watch only</option>
              <option value="auto_contact">Contact supplier</option>
              <option value="autobuy">Buy within limits</option>
            </select>
          </label>
          <label>
            <span>Ask me above</span>
            <div><b>₱</b><input type="number" min="0" value={jourvisUpdateItem.maxAutoOrderSpend} onChange={(event) => updateJourvisConfig(jourvisUpdateItem.id, { maxAutoOrderSpend: Math.max(0, Number(event.target.value) || 0) })} /></div>
          </label>
          <label>
            <span>Max pack price</span>
            <div><b>₱</b><input type="number" min="0" value={jourvisUpdateItem.autoAcceptPackPrice} onChange={(event) => {
              const value = Math.max(0, Number(event.target.value) || 0);
              updateJourvisConfig(jourvisUpdateItem.id, {
                autoAcceptPackPrice: value,
                hardMaxPackPrice: Math.max(jourvisUpdateItem.hardMaxPackPrice, value),
              });
            }} /></div>
          </label>
        </div>
      </div>

      <details className={styles.jourvisUpdateDetails}>
        <summary>Stock settings</summary>
        <div className={styles.jourvisUpdateGrid}>
          <label>
            <span>Full level / 100%</span>
            <div><input type="number" min="0.01" step="0.1" value={jourvisUpdateItem.fullLevel} onChange={(event) => {
              const value = Math.max(0.01, Number(event.target.value) || 0.01);
              updateJourvisConfig(jourvisUpdateItem.id, { fullLevel: value, reorderAt: Math.min(jourvisUpdateItem.reorderAt, value) });
            }} /><b>{jourvisUpdateItem.unit}</b></div>
          </label>
          <label>
            <span>Low-stock warning</span>
            <div><input type="number" min="0" step="0.1" value={jourvisUpdateItem.reorderAt} onChange={(event) => updateJourvisConfig(jourvisUpdateItem.id, { reorderAt: Math.max(0, Math.min(jourvisUpdateItem.fullLevel, Number(event.target.value) || 0)) })} /><b>{jourvisUpdateItem.unit}</b></div>
          </label>
        </div>
      </details>

      <details className={styles.jourvisUpdateDetails}>
        <summary>Supplier & purchasing</summary>
        <div className={styles.jourvisUpdateGrid}>
          <label>
            <span>Supplier</span>
            <select value={jourvisUpdateItem.supplierId} onChange={(event) => changeJourvisSupplier(jourvisUpdateItem, event.target.value)}>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </label>
          <label>
            <span>Contact</span>
            <select value={jourvisUpdateItem.contactId} onChange={(event) => updateJourvisConfig(jourvisUpdateItem.id, { contactId: event.target.value })}>
              {jourvisUpdateSupplier.contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name} · {contact.role}</option>)}
            </select>
          </label>
          <label>
            <span>Purchase mode</span>
            <select value={jourvisUpdateItem.purchasingMode} onChange={(event) => updateJourvisConfig(jourvisUpdateItem.id, { purchasingMode: event.target.value as Ingredient["purchasingMode"] })}>
              <option value="fixed">Fixed / contracted price</option>
              <option value="quote">Quote required</option>
            </select>
          </label>
          <label>
            <span>Pack quantity</span>
            <div><input type="number" min="0.01" step="0.1" value={jourvisUpdateItem.packSize} onChange={(event) => updateJourvisConfig(jourvisUpdateItem.id, { packSize: Math.max(0.01, Number(event.target.value) || 0.01) })} /><b>{jourvisUpdateItem.unit}</b></div>
          </label>
          <label>
            <span>Pack price / estimate</span>
            <div><b>₱</b><input type="number" min="0" value={jourvisUpdateItem.packPrice} onChange={(event) => updateJourvisConfig(jourvisUpdateItem.id, { packPrice: Math.max(0, Number(event.target.value) || 0) })} /></div>
          </label>
          <label>
            <span>Lead time</span>
            <div><input type="number" min="0" step="0.5" value={jourvisUpdateItem.leadDays} onChange={(event) => updateJourvisConfig(jourvisUpdateItem.id, { leadDays: Math.max(0, Number(event.target.value) || 0) })} /><b>days</b></div>
          </label>
        </div>
      </details>

      <details className={styles.jourvisUpdateDetails}>
        <summary>Advanced limits</summary>
        <div className={styles.jourvisUpdateGrid}>
          <label><span>Negotiation target</span><div><b>₱</b><input type="number" min="0" value={jourvisUpdateItem.targetPackPrice} onChange={(event) => updateJourvisConfig(jourvisUpdateItem.id, { targetPackPrice: Math.max(0, Number(event.target.value) || 0) })} /></div></label>
          <label><span>Absolute ceiling</span><div><b>₱</b><input type="number" min="0" value={jourvisUpdateItem.hardMaxPackPrice} onChange={(event) => updateJourvisConfig(jourvisUpdateItem.id, { hardMaxPackPrice: Math.max(jourvisUpdateItem.autoAcceptPackPrice, Number(event.target.value) || 0) })} /></div></label>
          <label><span>Max quantity</span><div><input type="number" min="0" step="0.1" value={jourvisUpdateItem.maxAutoOrderQty} onChange={(event) => updateJourvisConfig(jourvisUpdateItem.id, { maxAutoOrderQty: Math.max(0, Number(event.target.value) || 0) })} /><b>{jourvisUpdateItem.unit}</b></div></label>
          <label><span>Max delivery fee</span><div><b>₱</b><input type="number" min="0" value={jourvisUpdateItem.maxDeliveryFee} onChange={(event) => updateJourvisConfig(jourvisUpdateItem.id, { maxDeliveryFee: Math.max(0, Number(event.target.value) || 0) })} /></div></label>
          <label><span>Max lead time</span><div><input type="number" min="0" step="0.5" value={jourvisUpdateItem.maxLeadDays} onChange={(event) => updateJourvisConfig(jourvisUpdateItem.id, { maxLeadDays: Math.max(0, Number(event.target.value) || 0) })} /><b>days</b></div></label>
          <label><span>Auto-negotiate</span><select value={jourvisUpdateItem.autoNegotiate ? "yes" : "no"} onChange={(event) => updateJourvisConfig(jourvisUpdateItem.id, { autoNegotiate: event.target.value === "yes" })}><option value="yes">Yes</option><option value="no">No</option></select></label>
        </div>
      </details>

      <p className={styles.jourvisUpdateSaved}>Changes save immediately in this browser.</p>
    </div>
  ) : null;

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
              <strong>
                {jourvisTasks.length
                  ? `${jourvisTasks.length} decision${jourvisTasks.length === 1 ? "" : "s"} need you.`
                  : activeProcurements.length
                    ? `I’m handling ${activeProcurements.length} supplier flow${activeProcurements.length === 1 ? "" : "s"}.`
                    : urgent.length
                      ? `${urgent.length} supplies are low, but no approval is waiting.`
                      : "Inventory is inside the safe range."}
              </strong>
              <small>
                {jourvisTasks.length
                  ? jourvisMessage
                  : activeProcurements.length
                    ? "Supplier-side demo updates move automatically. I’ll interrupt only when you need to decide."
                    : urgent[0]
                      ? `${urgent[0].name} is the lowest-stock ingredient right now.`
                      : "Nothing needs your attention."}
              </small>
            </div>
          </div>
        </header>

        <section className={styles.statusStrip} aria-label="Inventory summary">
          <div><span>Readiness</span><strong>{metrics.readiness}%</strong></div>
          <div><span>Critical</span><strong>{metrics.critical}</strong></div>
          <div><span>Low</span><strong>{metrics.low}</strong></div>
          <div><span>Confirmed incoming</span><strong>{metrics.incoming}</strong></div>
          <div className={styles.headerActions}>
            <button id="jourvis-global-configure" type="button" onClick={() => openJourvisUpdate(selected)}><Settings2 size={14} aria-hidden /> Update with Jourvis</button>
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

                  <button
                    id="jourvis-auto-master"
                    type="button"
                    className={`${styles.automationMasterSwitch} ${automationMasterOn ? styles.automationMasterOn : ""}`}
                    onClick={() => openJourvisUpdate(selected)}
                    aria-label="Update Jourvis automation settings"
                  >
                    <span>Automation</span>
                    <i data-on={automationMasterOn}><b /></i>
                    <strong>{automationMasterOn ? "ON" : "OFF"}</strong>
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
                            id={`summary-item-${item.id}`}
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

                            {item.automationEnabled ? (
                              <span
                                className={styles.summaryAutomationMark}
                                data-active={automationMasterOn}
                                title={`Jourvis automation: ${item.automationMode} · trigger at ${item.automationTriggerPercent}%`}
                              >
                                A
                              </span>
                            ) : null}

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
                            ) : automationAlerts[item.id] ? (
                              <span className={styles.summaryAutomationAlert}>Ask owner</span>
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
                    <div><span>Low-stock warning</span><strong>{selected.reorderAt} {selected.unit}</strong></div>
                    <div><span>Days cover</span><strong>{round(daysRemaining)} days</strong></div>
                    <div><span>Confirmed incoming</span><strong>{selected.incoming} {selected.unit}</strong></div>
                    <div><span>Stock level</span><strong>{percent(selected)}%</strong></div>
                  </div>

                  <div className={styles.summarySupplier}>
                    <span>SUPPLIER</span>
                    <strong>{selectedSupplier.name}</strong>
                    <small>{selectedContact.name} · {selectedContact.role}</small>
                    <small>{selectedContact.channel} · {selectedContact.email}</small>
                  </div>

                  <div id="jourvis-automation-card" className={styles.summaryAutomationCard} data-enabled={selected.automationEnabled}>
                    <div>
                      <span>JOURVIS AUTOMATION</span>
                      <strong>{selected.automationEnabled ? automationModeLabel(selected.automationMode) : "Off for this supply"}</strong>
                    </div>
                    <small>
                      {selected.automationEnabled
                        ? selected.automationMode === "autobuy"
                          ? `Acts at ${selected.automationTriggerPercent}% · asks you above ${formatMoney(selected.maxAutoOrderSpend)} total or ${formatMoney(selected.autoAcceptPackPrice)} / pack`
                          : selected.automationMode === "auto_contact"
                            ? `Acts at ${selected.automationTriggerPercent}% · contacts the supplier, then brings purchase decisions to you`
                            : `Watches from ${selected.automationTriggerPercent}% · alerts you but never contacts the supplier automatically`
                        : "Off for this supply. Configure when Jourvis should act and how much authority it has."}
                    </small>
                    {selectedAutomationPaused ? (
                      <div className={styles.automationPausedNotice}>
                        <span>PAUSED BY YOU</span>
                        <p>Jourvis will not create another automatic purchase for {selected.name} until you resume it.</p>
                        <button type="button" onClick={() => openJourvisUpdate(selected)}>
                          Update
                        </button>
                      </div>
                    ) : automationAlerts[selected.id] ? (
                      <>
                        <p>{automationAlerts[selected.id]}</p>
                        <div id="jourvis-automation-decision" className={styles.automationDecisionActions}>
                          <button
                            type="button"
                            className={styles.automationApprove}
                            onClick={() => approveAutomationException(selected)}
                          >
                            <Check size={14} aria-hidden /> Approve
                          </button>
                          <button
                            type="button"
                            className={styles.automationReject}
                            onClick={() => rejectAutomationException(selected)}
                          >
                            <X size={14} aria-hidden /> Reject
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div className={styles.summaryAdvice}>
                    <CompanionMark className={styles.summaryCompanion} />
                    <div>
                      <span>JOURVIS</span>
                      <p>
                        {selectedAutomationAlert
                          ? "This request is outside my automatic limit. Approve this one-time exception or reject it."
                          : selectedProcurement
                            ? `${selectedProcurement.id}: ${procurementStatusLabel(selectedProcurement.status)}. Requested stock does not count as incoming until both sides confirm.`
                            : orderAmount > 0
                              ? `Suggested request: ${orderAmount} ${selected.unit}. You can change the quantity and contact before sending.`
                              : "Current and confirmed incoming stock cover the configured target."}
                      </p>
                    </div>
                  </div>

                  {!selectedAutomationAlert && !selectedAutomationPaused ? (
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
                        id="jourvis-supplier-action"
                        type="button"
                        className={styles.primaryButton}
                        disabled={orderAmount <= 0}
                        onClick={() => openContact([selected], `Contact ${selectedSupplier.name}`)}
                      >
                        <Mail size={15} aria-hidden /> Contact supplier
                      </button>
                    )}
                    <button type="button" className={styles.secondaryButton} onClick={() => openStockAdjustment(selected)}>
                      <PackageCheck size={15} aria-hidden /> Adjust stock
                    </button>
                    <button type="button" className={styles.textAction} onClick={() => openJourvisUpdate(selected)}>
                      <Settings2 size={15} aria-hidden /> Update
                    </button>
                  </div>
                  ) : null}

                  <div className={styles.statusLegend} aria-label="Stock status legend">
                    <span>LEVEL COLORS</span>
                    <div><i className={styles.legendReady} /><b>Ready</b><small>Above watch level</small></div>
                    <div><i className={styles.legendWatch} /><b>Watch</b><small>60% or lower</small></div>
                    <div><i className={styles.legendLow} /><b>Low</b><small>At low-stock warning</small></div>
                    <div><i className={styles.legendCritical} /><b>Critical</b><small>Well below warning level</small></div>
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
                  <div className={styles.thresholdLine}><span style={{ left: `${Math.min(100, Math.round((selected.reorderAt / selected.fullLevel) * 100))}%` }} /><small>Low-stock warning at {selected.reorderAt} {selected.unit}</small></div>

                  <div className={styles.factGrid}>
                    <div><span>On hand</span><strong>{selected.current} {selected.unit}</strong></div>
                    <div><span>Full level</span><strong>{selected.fullLevel} {selected.unit}</strong></div>
                    <div><span>Low-stock warning</span><strong>{selected.reorderAt} {selected.unit}</strong></div>
                    <div><span>Days cover</span><strong>{round(daysRemaining)} days</strong></div>
                    <div><span>Confirmed incoming</span><strong>{selected.incoming} {selected.unit}</strong></div>
                    <div><span>After delivery</span><strong>{projectedPercent(selected)}%</strong></div>
                  </div>

                  <div className={styles.contactCard}>
                    <div><span>SUPPLIER CONTACT</span><strong>{selectedContact.name}</strong><small>{selectedContact.role}</small></div>
                    <div><span>{selectedSupplier.name}</span><small>{selectedContact.channel} · {selectedContact.email}</small><small>{selectedContact.phone}</small></div>
                  </div>

                  <div className={styles.recommendation}>
                    <Sparkles size={17} aria-hidden />
                    <div>
                      <span>JOURVIS</span>
                      <p>
                        {selectedProcurement
                          ? `${selectedProcurement.id} is ${procurementStatusLabel(selectedProcurement.status).toLowerCase()}. No receiving step unlocks until the supplier and buyer reach agreement and the supplier confirms the order.`
                          : orderAmount > 0
                            ? `Suggested: ${orderAmount} ${selected.unit}. Based on ${selected.fullLevel} ${selected.unit} full level, ${selected.leadDays}-day lead time and expected usage.`
                            : "Current and confirmed incoming stock cover the configured full level."}
                      </p>
                    </div>
                  </div>

                  <div className={styles.detailActions}>
                    {selectedProcurement ? (
                      <button type="button" className={styles.primaryButton} onClick={() => setActiveTab("orders")}><ChevronRight size={16} aria-hidden /> View purchase flow</button>
                    ) : (
                      <button type="button" className={styles.primaryButton} disabled={orderAmount <= 0} onClick={() => openContact([selected], `Contact ${selectedSupplier.name}`)}><Mail size={16} aria-hidden /> Contact supplier</button>
                    )}
                    <button type="button" className={styles.textAction} onClick={() => openJourvisUpdate(selected)}><Settings2 size={15} aria-hidden /> Update</button>
                    <button type="button" className={styles.textAction} onClick={() => openStockAdjustment(selected)}><PackageCheck size={15} aria-hidden /> Adjust stock</button>
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
                <div><span>PROCUREMENT FLOW</span><h2>Jourvis handles the back-and-forth. You handle decisions and receiving.</h2></div>
                {suggested.length ? <button type="button" className={styles.primaryButton} onClick={() => openContact(suggested, "Group restock")}>Group restock · {suggested.length}</button> : null}
              </div>

              <div className={styles.procurementColumns}>
                <div className={styles.procurementNeeds}>
                  <div className={styles.orderColumnTitle}><span>RESTOCK SUGGESTIONS</span><strong>{suggested.length}</strong></div>
                  {supplierGroups.length ? supplierGroups.map((items) => {
                    const first = items[0];
                    const supplier = getSupplier(first);
                    const contact = getContact(first);
                    const total = items.reduce((sum, item) => sum + Math.ceil(suggestedOrder(item) / item.packSize) * item.packPrice, 0);
                    return (
                      <article className={styles.supplierGroup} key={`${supplier.id}-${first.purchasingMode}`}>
                        <div className={styles.supplierGroupHead}>
                          <div>
                            <span>{supplier.name}</span>
                            <strong>{contact.name}</strong>
                            <small>{contact.role} · {contact.channel}</small>
                          </div>
                          <div className={styles.modeStack}>
                            {first.purchasingMode === "quote" ? (
                              <>
                                <b>Quote needed</b>
                                <small>Estimate {formatMoney(total)}</small>
                              </>
                            ) : (
                              <>
                                <b>{formatMoney(total)}</b>
                                <small>Known fixed-price order</small>
                              </>
                            )}
                          </div>
                        </div>
                        {items.map((item) => (
                          <div className={styles.orderItem} key={item.id}>
                            <span className={styles.orderItemName}>
                              <StockIcon stockId={item.id} className={styles.stockIconSmall} size={18} />
                              <span><strong>{item.name}</strong><small>{item.current}/{item.fullLevel} {item.unit} · warning at {item.reorderAt}</small></span>
                            </span>
                            <b>{suggestedOrder(item)} {item.unit}</b>
                          </div>
                        ))}
                        <button type="button" className={styles.secondaryButton} onClick={() => openContact(items, `Contact ${supplier.name}`)}>
                          <Mail size={15} aria-hidden /> {first.purchasingMode === "quote" ? "Request quote" : "Send purchase order"}
                        </button>
                      </article>
                    );
                  }) : <div className={styles.emptyState}><Check size={18} aria-hidden /> No new supplier contact is needed.</div>}
                </div>

                <div className={styles.procurementFlow}>
                  <div className={styles.orderColumnTitle}><span>PURCHASE FLOW</span><strong>{procurements.length}</strong></div>

                  {procurements.length ? procurements.map((request) => {
                    const supplier = suppliers.find((candidate) => candidate.id === request.supplierId) ?? suppliers[0];
                    const contact = supplier.contacts.find((candidate) => candidate.id === request.contactId) ?? supplier.contacts[0];
                    const total = procurementTotal(request, ingredients);
                    const requestItem = ingredients.find((item) => item.id === request.lines[0]?.itemId);

                    return (
                      <article id={`procurement-${request.id}`} className={styles.procurementCard} key={request.id} data-status={request.status}>
                        <div className={styles.procurementCardHead}>
                          <div>
                            <span>{request.id} · {request.mode === "quote" ? "QUOTE REQUIRED" : "FIXED PRICE PO"}</span>
                            <h3>{supplier.name}</h3>
                            <small>{contact.name} · {contact.role}</small>
                            <b className={styles.procurementOriginBadge} data-auto={request.origin === "automation"}>
                              {request.origin === "automation" ? `Jourvis ${request.previewOnly ? "preview" : request.automationMode ? automationModeLabel(request.automationMode) : "automation"}` : "Manual"}
                            </b>
                          </div>
                          <div className={styles.procurementStatus}>
                            <b>{procurementStatusLabel(request.status)}</b>
                            <small>{formatMoney(total)}</small>
                          </div>
                        </div>

                        {request.automationNote ? <div className={styles.procurementAutomationNote}>{request.automationNote}</div> : null}

                        <div className={styles.procurementProgress} aria-label={`${request.id} progress`}>
                          {[
                            ["requested", "Request"],
                            ["supplier", "Supplier"],
                            ["agreement", "Agreement"],
                            ["confirmed", "Confirmed"],
                            ["receive", "Receive"],
                          ].map(([key, label]) => {
                            const reached =
                              key === "requested" ||
                              (key === "supplier" && request.status !== "requested") ||
                              (key === "agreement" && ["quote_received", "counter_sent", "awaiting_confirmation", "confirmed", "in_transit", "partial_received", "received"].includes(request.status)) ||
                              (key === "confirmed" && ["confirmed", "in_transit", "partial_received", "received"].includes(request.status)) ||
                              (key === "receive" && request.status === "received");
                            return <span key={key} data-reached={reached}><i />{label}</span>;
                          })}
                        </div>

                        <div className={styles.procurementConfirmations}>
                          <span><i data-confirmed={request.buyerConfirmed} /> Buyer {request.buyerConfirmed ? "confirmed" : "pending"}</span>
                          <span><i data-confirmed={request.supplierConfirmed} /> Supplier {request.supplierConfirmed ? "confirmed" : "pending"}</span>
                        </div>

                        <div className={styles.procurementLines}>
                          {request.lines.map((line) => {
                            const item = ingredients.find((candidate) => candidate.id === line.itemId);
                            if (!item) return null;
                            const quantity = line.agreedQty ?? line.requestedQty;
                            return (
                              <div className={styles.procurementLine} key={line.itemId}>
                                <span className={styles.orderItemName}>
                                  <StockIcon stockId={item.id} className={styles.stockIconSmall} size={18} />
                                  <span>
                                    <strong>{item.name}</strong>
                                    <small>Requested {line.requestedQty} {item.unit}{line.agreedQty !== undefined ? ` · agreed ${line.agreedQty} ${item.unit}` : ""}</small>
                                  </span>
                                </span>
                                <span>
                                  {line.quotedPackPrice !== undefined ? (
                                    <>
                                      <small>Previous {formatMoney(item.packPrice)} / {item.purchaseUnit}</small>
                                      <b>Quote {formatMoney(line.quotedPackPrice)}</b>
                                    </>
                                  ) : (
                                    <>
                                      <small>{request.mode === "fixed" ? "Configured price" : "Awaiting quote"}</small>
                                      <b>{request.mode === "fixed" ? formatMoney(item.packPrice) : "—"}</b>
                                    </>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {request.status === "quote_received" ? (
                          <div className={styles.quoteSummary}>
                            <span>SUPPLIER QUOTE</span>
                            <strong>{formatMoney(total)}</strong>
                            <small>Includes {formatMoney(request.deliveryFee)} demo delivery fee · ETA {request.etaDays} day{request.etaDays === 1 ? "" : "s"}</small>
                          </div>
                        ) : null}

                        {request.status === "in_transit" || request.status === "partial_received" ? (
                          <div className={styles.receivingEditor}>
                            <span>ACTUAL DELIVERY COUNT</span>
                            {request.lines.map((line) => {
                              const item = ingredients.find((candidate) => candidate.id === line.itemId);
                              if (!item) return null;
                              const agreed = line.agreedQty ?? line.requestedQty;
                              const receivedTotal = line.receivedTotal ?? 0;
                              const remaining = Math.max(0, agreed - receivedTotal);
                              return (
                                <label key={line.itemId}>
                                  <span>
                                    {item.name}
                                    <small>
                                      Agreed {agreed} {item.unit} · received {receivedTotal} · remaining {round(remaining)}
                                    </small>
                                  </span>
                                  <div>
                                    <input
                                      type="number"
                                      min="0"
                                      max={remaining}
                                      step="0.1"
                                      value={line.deliveryQty ?? remaining}
                                      onChange={(event) => changeReceivedQuantity(request.id, line.itemId, Number(event.target.value) || 0)}
                                    />
                                    <b>{item.unit}</b>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        ) : null}

                        <div className={styles.procurementActions}>
                          {request.status === "requested" ? (
                            <span className={styles.procurementClosed}><Clock3 size={15} aria-hidden /> Sent · waiting for supplier to open the request</span>
                          ) : null}

                          {request.status === "supplier_viewed" && request.mode === "quote" ? (
                            <span className={styles.procurementClosed}><Clock3 size={15} aria-hidden /> Supplier viewed it · waiting for quote</span>
                          ) : null}

                          {request.status === "supplier_viewed" && request.mode === "fixed" && !request.buyerConfirmed ? (
                            <>
                              <button type="button" className={styles.primaryButton} onClick={() => buyerApprovesFixedAutomation(request)}>Approve</button>
                              <button type="button" className={styles.textAction} onClick={() => declineProcurement(request)}>Reject</button>
                              {requestItem ? <button type="button" className={styles.secondaryButton} onClick={() => openJourvisUpdate(requestItem)}>Update</button> : null}
                            </>
                          ) : null}

                          {request.status === "supplier_viewed" && request.mode === "fixed" && request.buyerConfirmed ? (
                            <span className={styles.procurementClosed}><Clock3 size={15} aria-hidden /> Approved · waiting for supplier confirmation</span>
                          ) : null}

                          {request.status === "quote_received" ? (
                            <>
                              <button type="button" className={styles.primaryButton} onClick={() => buyerAcceptsQuote(request)}>Approve</button>
                              <button type="button" className={styles.textAction} onClick={() => declineProcurement(request)}>Reject</button>
                              {requestItem ? <button type="button" className={styles.secondaryButton} onClick={() => openJourvisUpdate(requestItem)}>Update</button> : null}
                            </>
                          ) : null}

                          {request.status === "counter_sent" ? (
                            <span className={styles.procurementClosed}><Clock3 size={15} aria-hidden /> Counter sent · waiting for supplier</span>
                          ) : null}

                          {request.status === "awaiting_confirmation" ? (
                            <span className={styles.procurementClosed}><Clock3 size={15} aria-hidden /> Price agreed · waiting for supplier confirmation</span>
                          ) : null}

                          {request.status === "confirmed" ? (
                            <span className={styles.procurementClosed}><Truck size={15} aria-hidden /> Confirmed · supplier is preparing dispatch</span>
                          ) : null}

                          {request.status === "in_transit" || request.status === "partial_received" ? (
                            <button type="button" className={styles.primaryButton} onClick={() => receiveProcurement(request)}>
                              <PackageCheck size={15} aria-hidden /> {request.status === "partial_received" ? "Receive remaining delivery" : "Receive actual delivery"}
                            </button>
                          ) : null}

                          {request.status === "received" ? <span className={styles.procurementClosed}><Check size={15} aria-hidden /> Received and closed</span> : null}
                          {request.status === "declined" ? <span className={styles.procurementClosed}><X size={15} aria-hidden /> Declined / cancelled</span> : null}
                        </div>
                      </article>
                    );
                  }) : (
                    <div className={styles.emptyState}><Clock3 size={18} aria-hidden /> No purchase requests yet. Contact a supplier to start the flow.</div>
                  )}
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

        <div className={styles.previewNotice}><TriangleAlert size={16} aria-hidden /><p><strong>Preview only.</strong> Live stock, purchase flows and approvals persist in this browser so Summary and Configure stay consistent. Supplier replies are simulated automatically; Jourvis brings only owner decisions forward. No real email, SMS, database, purchasing or accounting action occurs.</p></div>
      </div>

      {stockAdjustment ? (() => {
        const item = ingredients.find((candidate) => candidate.id === stockAdjustment.itemId) ?? selected;
        const after = round(Math.max(0, item.current + stockAdjustment.change));
        return (
          <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setStockAdjustment(null); }}>
            <section className={styles.contactModal} role="dialog" aria-modal="true" aria-labelledby="stock-adjustment-title">
              <div className={styles.modalHeader}>
                <div>
                  <span>STOCK ADJUSTMENT</span>
                  <h2 id="stock-adjustment-title">{item.name}</h2>
                  <p>Use this when stock changes outside a Jourvis purchase, such as a walk-in purchase, physical count correction, transfer, or waste.</p>
                </div>
                <button type="button" onClick={() => setStockAdjustment(null)} aria-label="Close stock adjustment"><X size={19} aria-hidden /></button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.requestItem}>
                  <div className={styles.requestItemTitle}>
                    <div className={styles.requestItemName}>
                      <StockIcon stockId={item.id} className={styles.stockIconSmall} size={18} />
                      <div><strong>{item.name}</strong><small>Current {item.current} {item.unit}</small></div>
                    </div>
                    <span>After adjustment {after} {item.unit}</span>
                  </div>
                  <div className={styles.quantityEditor}>
                    <label>
                      <span>Change by</span>
                      <div>
                        <input
                          type="number"
                          step="0.1"
                          value={stockAdjustment.change}
                          onChange={(event) => setStockAdjustment({ ...stockAdjustment, change: Number(event.target.value) || 0 })}
                        />
                        <b>{item.unit}</b>
                      </div>
                    </label>
                  </div>
                  <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
                    <span style={{ color: "#aab8c2", fontSize: 12 }}>Reason</span>
                    <select
                      value={stockAdjustment.reason}
                      onChange={(event) => setStockAdjustment({ ...stockAdjustment, reason: event.target.value as StockAdjustment["reason"] })}
                      style={{ minHeight: 40, padding: "6px 9px", background: "#08141f", color: "#f7f4ee", border: "1px solid #2a3a44" }}
                    >
                      <option value="external_delivery">Bought / received outside Jourvis</option>
                      <option value="physical_count">Physical count correction</option>
                      <option value="waste">Waste / spoilage</option>
                      <option value="transfer">Stock transfer</option>
                      <option value="other">Other adjustment</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.secondaryButton} onClick={() => setStockAdjustment(null)}>Cancel</button>
                <button type="button" className={styles.primaryButton} onClick={applyStockAdjustment}>Apply adjustment</button>
              </div>
            </section>
          </div>
        );
      })() : null}

      {contactDraft ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setContactDraft(null); }}>
          <section className={styles.contactModal} role="dialog" aria-modal="true" aria-labelledby="contact-modal-title">
            <div className={styles.modalHeader}>
              <div><span>SUPPLIER REQUEST</span><h2 id="contact-modal-title">{contactDraft.title}</h2><p>Change the contact person and quantity before sending. Quote-mode requests must be priced and mutually confirmed before they become incoming stock.</p></div>
              <button type="button" onClick={() => setContactDraft(null)} aria-label="Close supplier request"><X size={19} aria-hidden /></button>
            </div>

            <div className={styles.modalBody}>
              {supplierGroupsForItems(ingredients.filter((item) => contactDraft.itemIds.includes(item.id))).map((items) => {
                const first = items[0];
                const supplier = getSupplier(first);
                const selectedContactId = contactDraft.contactBySupplier[supplier.id] ?? first.contactId;
                const contact = supplier.contacts.find((candidate) => candidate.id === selectedContactId) ?? supplier.contacts[0];
                return (
                  <div className={styles.modalSupplier} key={`${supplier.id}-${first.purchasingMode}`}>
                    <div className={styles.modalSupplierHead}>
                      <div><span>{supplier.name}</span><strong>{contact.name}</strong><small>{contact.role}</small><small>{first.purchasingMode === "quote" ? "Quote required before agreement" : "Fixed-price PO · supplier acknowledgment required"}</small></div>
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
                          <div className={styles.requestItemTitle}><div className={styles.requestItemName}><StockIcon stockId={item.id} className={styles.stockIconSmall} size={18} /><div><strong>{item.name}</strong><small>Jourvis suggests {suggestedOrder(item)} {item.unit} · {item.purchaseUnit}</small></div></div><span>If confirmed ~{Math.min(100, Math.round(((item.current + item.incoming + quantity) / item.fullLevel) * 100))}%</span></div>
                          <div className={styles.quantityEditor}>
                            <button type="button" onClick={() => changeDraftQuantity(item, quantity - item.packSize)} aria-label={`Decrease ${item.name} quantity`}>−</button>
                            <label><span>Quantity to request</span><div><input type="number" min="0" step={item.packSize} value={quantity} onChange={(event) => changeDraftQuantity(item, Number(event.target.value) || 0)} /><b>{item.unit}</b></div></label>
                            <button type="button" onClick={() => changeDraftQuantity(item, quantity + item.packSize)} aria-label={`Increase ${item.name} quantity`}>+</button>
                          </div>
                          <div className={styles.requestMeta}>
                            <span>{quantity > 0 ? `${round(quantity / item.packSize)} purchase unit${quantity / item.packSize === 1 ? "" : "s"}` : "Not included"}</span>
                            <strong>{quantity > 0 ? (item.purchasingMode === "quote" ? `Est. ${formatMoney(estimatedCost)}` : formatMoney(estimatedCost)) : "—"}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className={styles.modalFooter}><button type="button" className={styles.secondaryButton} onClick={() => setContactDraft(null)}>Cancel</button><button type="button" className={styles.primaryButton} onClick={sendContactRequests}><Mail size={16} aria-hidden /> Send supplier request{supplierGroupsForItems(ingredients.filter((item) => contactDraft.itemIds.includes(item.id))).length > 1 ? "s" : ""}</button></div>
          </section>
        </div>
      ) : null}

      <JourvisPresence
        eyebrow={jourvisUpdateItem ? "JOURVIS · UPDATE" : jourvisTasks.length ? `JOURVIS · ${jourvisTasks.length} NEED${jourvisTasks.length === 1 ? "S" : ""} YOU` : "JOURVIS"}
        status={jourvisUpdateItem ? `Updating ${jourvisUpdateItem.name}` : jourvisTasks.length ? `Needs you · ${jourvisTasks.length}` : jourvisWorkingRequest ? "Working" : automationMasterOn ? "Watching" : "Available"}
        message={jourvisUpdateItem ? `Update ${jourvisUpdateItem.name} here.` : jourvisMessage}
        detail={jourvisUpdateItem ? "All configuration for this supply is inside this chat. Changes save immediately." : jourvisDetail}
        attention={jourvisUpdateItem ? false : jourvisAttention}
        focusTarget={jourvisUpdateItem ? undefined : jourvisFocusTarget}
        focusLabel={jourvisUpdateItem ? undefined : jourvisFocusLabel}
        wide={Boolean(jourvisUpdateItem)}
        openRequestKey={jourvisOpenKey}
        actions={
          jourvisUpdateItem
            ? [
                { label: "Update", onClick: () => setJourvisUpdateItemId(null), primary: true, keepOpen: true },
              ]
            : jourvisTask && jourvisTaskItem
              ? [
                  {
                    label: "Approve",
                    primary: true,
                    onClick: () => {
                      if (jourvisTask.kind === "automation_exception") {
                        approveAutomationException(jourvisTaskItem);
                        return;
                      }
                      if (jourvisTask.kind === "quote_approval" && jourvisTaskRequest) {
                        buyerAcceptsQuote(jourvisTaskRequest);
                        return;
                      }
                      if (jourvisTask.kind === "fixed_approval" && jourvisTaskRequest) {
                        buyerApprovesFixedAutomation(jourvisTaskRequest);
                        return;
                      }
                      if (jourvisTask.kind === "automation_paused") {
                        setAutomationMasterOn(true);
                        window.localStorage.setItem("jourvis-autoinventory-automation-master", "true");
                        log(`Jourvis Automation switched ON. Watching ${automationEnabledCount} configured supplies.`);
                        return;
                      }
                      approveRestockItem(jourvisTaskItem);
                    },
                  },
                  {
                    label: "Reject",
                    danger: true,
                    onClick: () => {
                      if (jourvisTaskRequest) {
                        declineProcurement(jourvisTaskRequest);
                        return;
                      }
                      rejectItem(jourvisTaskItem);
                    },
                  },
                  {
                    label: "Update",
                    keepOpen: true,
                    onClick: () => openJourvisUpdate(jourvisTaskItem),
                  },
                ]
              : [
                  {
                    label: "Update",
                    primary: true,
                    keepOpen: true,
                    onClick: () => openJourvisUpdate(jourvisWorkingItem ?? selected),
                  },
                ]
        }
      >
        {jourvisUpdatePanel}
      </JourvisPresence>
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
