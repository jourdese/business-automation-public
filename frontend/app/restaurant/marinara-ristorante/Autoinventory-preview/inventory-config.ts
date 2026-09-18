export type Zone = "Pantry" | "Cold storage" | "Seafood freezer" | "Produce";

export type SupplierContact = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  channel: "Email" | "SMS";
};

export type Supplier = {
  id: string;
  name: string;
  contacts: SupplierContact[];
};

export type PurchasingMode = "fixed" | "quote";
export type AutomationMode = "assist" | "auto_contact" | "autobuy";

export type Ingredient = {
  id: string;
  name: string;
  unit: string;
  current: number;
  fullLevel: number;
  reorderAt: number;
  dailyUse: number;
  incoming: number;
  supplierId: string;
  contactId: string;
  packSize: number;
  packPrice: number;
  purchaseUnit: string;
  leadDays: number;
  purchasingMode: PurchasingMode;
  automationEnabled: boolean;
  automationMode: AutomationMode;
  automationTriggerPercent: number;
  targetPackPrice: number;
  autoAcceptPackPrice: number;
  hardMaxPackPrice: number;
  maxAutoOrderQty: number;
  maxAutoOrderSpend: number;
  autoNegotiate: boolean;
  maxCounteroffers: number;
  maxDeliveryFee: number;
  maxLeadDays: number;
  automationPreview: boolean;
  zone: Zone;
};

export const INVENTORY_CONFIG_STORAGE_KEY = "jourvis:marinara:autoinventory-config:v1";
export const INVENTORY_RUNTIME_STORAGE_KEY = "jourvis:marinara:autoinventory-runtime:v1";

export const suppliers: Supplier[] = [
  {
    id: "davao-provisions",
    name: "Davao Pasta & Provisions",
    contacts: [
      { id: "paolo", name: "Paolo Reyes", role: "Wholesale account", email: "paolo@davaoprovisions.example", phone: "+63 917 555 0198", channel: "Email" },
      { id: "trina", name: "Trina Yu", role: "Order desk", email: "trina@davaoprovisions.example", phone: "+63 917 555 0199", channel: "SMS" },
    ],
  },
  {
    id: "casa-rosso",
    name: "Casa Rosso Foods",
    contacts: [
      { id: "lia", name: "Lia Cruz", role: "Orders desk", email: "lia@casarosso.example", phone: "+63 917 555 0181", channel: "Email" },
      { id: "nico", name: "Nico Garcia", role: "Account support", email: "nico@casarosso.example", phone: "+63 917 555 0182", channel: "SMS" },
    ],
  },
  {
    id: "italian-pantry",
    name: "Italian Pantry Davao",
    contacts: [
      { id: "marco", name: "Marco Dela Torre", role: "Account manager", email: "marco@italianpantry.example", phone: "+63 917 555 0130", channel: "Email" },
      { id: "gia", name: "Gia Mendoza", role: "Sales desk", email: "gia@italianpantry.example", phone: "+63 917 555 0131", channel: "Email" },
    ],
  },
  {
    id: "davao-dairy",
    name: "Davao Dairy Supply",
    contacts: [
      { id: "anne", name: "Anne Lim", role: "Sales contact", email: "anne@davaodairy.example", phone: "+63 917 555 0116", channel: "SMS" },
      { id: "joel", name: "Joel Tan", role: "Dispatch", email: "joel@davaodairy.example", phone: "+63 917 555 0117", channel: "SMS" },
    ],
  },
  {
    id: "davao-seafood",
    name: "Davao Fresh Seafood",
    contacts: [
      { id: "maria", name: "Maria Santos", role: "Sales contact", email: "maria@davaofresh.example", phone: "+63 917 555 0142", channel: "Email" },
      { id: "jun", name: "Jun Bautista", role: "Wholesale orders", email: "jun@davaofresh.example", phone: "+63 917 555 0143", channel: "SMS" },
    ],
  },
  {
    id: "green-basket",
    name: "Green Basket Produce",
    contacts: [
      { id: "mika", name: "Mika Villanueva", role: "Produce orders", email: "mika@greenbasket.example", phone: "+63 917 555 0164", channel: "SMS" },
      { id: "rhea", name: "Rhea Flores", role: "Morning dispatch", email: "rhea@greenbasket.example", phone: "+63 917 555 0165", channel: "Email" },
    ],
  },
];

export const initialIngredients: Ingredient[] = [
  { id: "pasta", name: "Pasta", unit: "kg", current: 10.2, fullLevel: 12, reorderAt: 4, dailyUse: 1.7, incoming: 0, supplierId: "davao-provisions", contactId: "paolo", packSize: 5, packPrice: 860, purchaseUnit: "5 kg case", leadDays: 1, purchasingMode: "fixed", automationEnabled: false, automationMode: "auto_contact", automationTriggerPercent: 33, targetPackPrice: 860, autoAcceptPackPrice: 900, hardMaxPackPrice: 950, maxAutoOrderQty: 15, maxAutoOrderSpend: 5000, autoNegotiate: false, maxCounteroffers: 0, maxDeliveryFee: 250, maxLeadDays: 2, automationPreview: true, zone: "Pantry" },
  { id: "tomato", name: "Tomato sauce", unit: "L", current: 7.4, fullLevel: 10, reorderAt: 3, dailyUse: 1.45, incoming: 0, supplierId: "casa-rosso", contactId: "lia", packSize: 4, packPrice: 980, purchaseUnit: "4 L case", leadDays: 1, purchasingMode: "fixed", automationEnabled: false, automationMode: "auto_contact", automationTriggerPercent: 30, targetPackPrice: 980, autoAcceptPackPrice: 1030, hardMaxPackPrice: 1080, maxAutoOrderQty: 12, maxAutoOrderSpend: 5000, autoNegotiate: false, maxCounteroffers: 0, maxDeliveryFee: 250, maxLeadDays: 2, automationPreview: true, zone: "Pantry" },
  { id: "olive-oil", name: "Olive oil", unit: "L", current: 4.5, fullLevel: 5, reorderAt: 1.5, dailyUse: 0.38, incoming: 0, supplierId: "casa-rosso", contactId: "lia", packSize: 2, packPrice: 1220, purchaseUnit: "2 L case", leadDays: 2, purchasingMode: "fixed", automationEnabled: false, automationMode: "auto_contact", automationTriggerPercent: 30, targetPackPrice: 1220, autoAcceptPackPrice: 1280, hardMaxPackPrice: 1350, maxAutoOrderQty: 6, maxAutoOrderSpend: 5000, autoNegotiate: false, maxCounteroffers: 0, maxDeliveryFee: 250, maxLeadDays: 3, automationPreview: true, zone: "Pantry" },
  { id: "flour", name: "Pizza flour", unit: "kg", current: 13, fullLevel: 15, reorderAt: 5, dailyUse: 2.1, incoming: 0, supplierId: "davao-provisions", contactId: "paolo", packSize: 10, packPrice: 760, purchaseUnit: "10 kg sack", leadDays: 1, purchasingMode: "fixed", automationEnabled: false, automationMode: "auto_contact", automationTriggerPercent: 33, targetPackPrice: 760, autoAcceptPackPrice: 800, hardMaxPackPrice: 850, maxAutoOrderQty: 30, maxAutoOrderSpend: 5000, autoNegotiate: false, maxCounteroffers: 0, maxDeliveryFee: 250, maxLeadDays: 2, automationPreview: true, zone: "Pantry" },
  { id: "parmesan", name: "Parmigiano", unit: "kg", current: 1.45, fullLevel: 5, reorderAt: 2, dailyUse: 0.62, incoming: 0, supplierId: "italian-pantry", contactId: "marco", packSize: 2, packPrice: 2380, purchaseUnit: "2 kg wheel", leadDays: 2, purchasingMode: "fixed", automationEnabled: false, automationMode: "auto_contact", automationTriggerPercent: 40, targetPackPrice: 2380, autoAcceptPackPrice: 2500, hardMaxPackPrice: 2650, maxAutoOrderQty: 6, maxAutoOrderSpend: 7000, autoNegotiate: false, maxCounteroffers: 0, maxDeliveryFee: 300, maxLeadDays: 3, automationPreview: true, zone: "Cold storage" },
  { id: "mozzarella", name: "Mozzarella", unit: "kg", current: 6.1, fullLevel: 8, reorderAt: 3, dailyUse: 1.15, incoming: 0, supplierId: "italian-pantry", contactId: "marco", packSize: 3, packPrice: 1650, purchaseUnit: "3 kg case", leadDays: 1, purchasingMode: "fixed", automationEnabled: false, automationMode: "auto_contact", automationTriggerPercent: 38, targetPackPrice: 1650, autoAcceptPackPrice: 1750, hardMaxPackPrice: 1850, maxAutoOrderQty: 9, maxAutoOrderSpend: 7000, autoNegotiate: false, maxCounteroffers: 0, maxDeliveryFee: 300, maxLeadDays: 2, automationPreview: true, zone: "Cold storage" },
  { id: "cream", name: "Cooking cream", unit: "L", current: 2.25, fullLevel: 5, reorderAt: 2, dailyUse: 0.72, incoming: 0, supplierId: "davao-dairy", contactId: "anne", packSize: 2, packPrice: 720, purchaseUnit: "2 L case", leadDays: 1, purchasingMode: "fixed", automationEnabled: false, automationMode: "auto_contact", automationTriggerPercent: 40, targetPackPrice: 720, autoAcceptPackPrice: 760, hardMaxPackPrice: 800, maxAutoOrderQty: 6, maxAutoOrderSpend: 4000, autoNegotiate: false, maxCounteroffers: 0, maxDeliveryFee: 250, maxLeadDays: 2, automationPreview: true, zone: "Cold storage" },
  { id: "shrimp", name: "Shrimp", unit: "kg", current: 2.2, fullLevel: 10, reorderAt: 3, dailyUse: 1.95, incoming: 0, supplierId: "davao-seafood", contactId: "maria", packSize: 5, packPrice: 2800, purchaseUnit: "5 kg pack", leadDays: 1, purchasingMode: "quote", automationEnabled: false, automationMode: "autobuy", automationTriggerPercent: 30, targetPackPrice: 2800, autoAcceptPackPrice: 2950, hardMaxPackPrice: 3100, maxAutoOrderQty: 15, maxAutoOrderSpend: 10000, autoNegotiate: true, maxCounteroffers: 2, maxDeliveryFee: 300, maxLeadDays: 2, automationPreview: true, zone: "Seafood freezer" },
  { id: "salmon", name: "Salmon", unit: "kg", current: 4.9, fullLevel: 8, reorderAt: 3, dailyUse: 1.05, incoming: 0, supplierId: "davao-seafood", contactId: "maria", packSize: 4, packPrice: 3440, purchaseUnit: "4 kg case", leadDays: 1, purchasingMode: "quote", automationEnabled: false, automationMode: "autobuy", automationTriggerPercent: 38, targetPackPrice: 3440, autoAcceptPackPrice: 3600, hardMaxPackPrice: 3800, maxAutoOrderQty: 12, maxAutoOrderSpend: 12000, autoNegotiate: true, maxCounteroffers: 2, maxDeliveryFee: 300, maxLeadDays: 2, automationPreview: true, zone: "Seafood freezer" },
  { id: "squid", name: "Squid", unit: "kg", current: 1.7, fullLevel: 6, reorderAt: 2.2, dailyUse: 1, incoming: 0, supplierId: "davao-seafood", contactId: "maria", packSize: 3, packPrice: 1380, purchaseUnit: "3 kg pack", leadDays: 1, purchasingMode: "quote", automationEnabled: false, automationMode: "autobuy", automationTriggerPercent: 37, targetPackPrice: 1380, autoAcceptPackPrice: 1450, hardMaxPackPrice: 1550, maxAutoOrderQty: 9, maxAutoOrderSpend: 7000, autoNegotiate: true, maxCounteroffers: 2, maxDeliveryFee: 300, maxLeadDays: 2, automationPreview: true, zone: "Seafood freezer" },
  { id: "basil", name: "Fresh basil", unit: "kg", current: 0.48, fullLevel: 2, reorderAt: 0.7, dailyUse: 0.31, incoming: 0, supplierId: "green-basket", contactId: "mika", packSize: 1, packPrice: 410, purchaseUnit: "1 kg bundle", leadDays: 0.5, purchasingMode: "quote", automationEnabled: false, automationMode: "autobuy", automationTriggerPercent: 35, targetPackPrice: 410, autoAcceptPackPrice: 440, hardMaxPackPrice: 470, maxAutoOrderQty: 3, maxAutoOrderSpend: 2500, autoNegotiate: true, maxCounteroffers: 1, maxDeliveryFee: 200, maxLeadDays: 1, automationPreview: true, zone: "Produce" },
  { id: "mushroom", name: "Mushrooms", unit: "kg", current: 2.8, fullLevel: 5, reorderAt: 1.8, dailyUse: 0.74, incoming: 0, supplierId: "green-basket", contactId: "mika", packSize: 2, packPrice: 540, purchaseUnit: "2 kg crate", leadDays: 0.5, purchasingMode: "quote", automationEnabled: false, automationMode: "autobuy", automationTriggerPercent: 36, targetPackPrice: 540, autoAcceptPackPrice: 570, hardMaxPackPrice: 620, maxAutoOrderQty: 6, maxAutoOrderSpend: 3500, autoNegotiate: true, maxCounteroffers: 1, maxDeliveryFee: 200, maxLeadDays: 1, automationPreview: true, zone: "Produce" },
];

export function getSupplier(item: Pick<Ingredient, "supplierId">) {
  return suppliers.find((supplier) => supplier.id === item.supplierId) ?? suppliers[0];
}

export function getContact(item: Pick<Ingredient, "supplierId" | "contactId">) {
  const supplier = getSupplier(item);
  return supplier.contacts.find((contact) => contact.id === item.contactId) ?? supplier.contacts[0];
}

export function loadConfiguredIngredients() {
  if (typeof window === "undefined") return initialIngredients;
  try {
    const storedConfig = window.localStorage.getItem(INVENTORY_CONFIG_STORAGE_KEY);
    const storedRuntime = window.localStorage.getItem(INVENTORY_RUNTIME_STORAGE_KEY);
    const configured = storedConfig
      ? JSON.parse(storedConfig) as Array<Partial<Ingredient> & { id: string }>
      : [];
    const runtime = storedRuntime
      ? JSON.parse(storedRuntime) as Array<Pick<Ingredient, "id" | "current" | "incoming">>
      : [];

    return initialIngredients.map((base) => ({
      ...base,
      ...(configured.find((item) => item.id === base.id) ?? {}),
      ...(runtime.find((item) => item.id === base.id) ?? {}),
    }));
  } catch {
    return initialIngredients;
  }
}

export function saveConfiguredIngredients(items: Ingredient[]) {
  if (typeof window === "undefined") return;
  const configOnly = items.map(({
    id,
    fullLevel,
    reorderAt,
    supplierId,
    contactId,
    packSize,
    packPrice,
    purchaseUnit,
    leadDays,
    purchasingMode,
    automationEnabled,
    automationMode,
    automationTriggerPercent,
    targetPackPrice,
    autoAcceptPackPrice,
    hardMaxPackPrice,
    maxAutoOrderQty,
    maxAutoOrderSpend,
    autoNegotiate,
    maxCounteroffers,
    maxDeliveryFee,
    maxLeadDays,
    automationPreview,
  }) => ({
    id,
    fullLevel,
    reorderAt,
    supplierId,
    contactId,
    packSize,
    packPrice,
    purchaseUnit,
    leadDays,
    purchasingMode,
    automationEnabled,
    automationMode,
    automationTriggerPercent,
    targetPackPrice,
    autoAcceptPackPrice,
    hardMaxPackPrice,
    maxAutoOrderQty,
    maxAutoOrderSpend,
    autoNegotiate,
    maxCounteroffers,
    maxDeliveryFee,
    maxLeadDays,
    automationPreview,
  }));
  window.localStorage.setItem(INVENTORY_CONFIG_STORAGE_KEY, JSON.stringify(configOnly));
}


export function saveInventoryRuntime(items: Ingredient[]) {
  if (typeof window === "undefined") return;
  const runtime = items.map(({ id, current, incoming }) => ({
    id,
    current,
    incoming,
  }));
  window.localStorage.setItem(INVENTORY_RUNTIME_STORAGE_KEY, JSON.stringify(runtime));
}

export function resetInventoryRuntime() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(INVENTORY_RUNTIME_STORAGE_KEY);
}


export function automationModeLabel(mode: AutomationMode) {
  if (mode === "assist") return "Watch only";
  if (mode === "auto_contact") return "Contact supplier";
  return "Buy within limits";
}
