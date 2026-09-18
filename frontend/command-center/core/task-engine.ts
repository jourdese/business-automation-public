import {
  estimatedPurchaseTotal,
  evaluatePurchaseAuthority,
  inventoryPercent,
  isPurchaseActive,
  suggestedPurchaseQuantity,
  taskPriorityValue,
  type CommandCenterRuntimeState,
  type JourvisRuntimeTask,
} from "./runtime";

export function deriveJourvisTasks(
  state: CommandCenterRuntimeState,
): JourvisRuntimeTask[] {
  const tasks: JourvisRuntimeTask[] = [];
  const activeItemIds = new Set(
    state.purchases
      .filter((purchase) => isPurchaseActive(purchase.status))
      .map((purchase) => purchase.itemId),
  );

  state.purchases.forEach((purchase) => {
    const item = state.inventory.find((candidate) => candidate.id === purchase.itemId);
    if (!item) return;

    if (purchase.status === "requested" && purchase.origin === "jourvis") {
      const authority = evaluatePurchaseAuthority(item, purchase);
      const reasons = [
        purchase.automationMode === "auto_contact"
          ? "Your rule lets Jourvis contact the supplier, but not approve the purchase."
          : null,
        authority.total > item.maxAutoOrderSpend
          ? `The known order total is ₱${Math.round(authority.total).toLocaleString("en-PH")}, above your ₱${Math.round(item.maxAutoOrderSpend).toLocaleString("en-PH")} automatic limit.`
          : null,
        authority.packPrice > item.autoAcceptPackPrice
          ? `The pack price is ₱${Math.round(authority.packPrice).toLocaleString("en-PH")}, above your ₱${Math.round(item.autoAcceptPackPrice).toLocaleString("en-PH")} automatic price limit.`
          : null,
        authority.quantity > item.maxAutoOrderQty
          ? `The requested quantity ${authority.quantity} ${item.unit} is above your automatic quantity limit of ${item.maxAutoOrderQty} ${item.unit}.`
          : null,
        authority.etaDays > item.maxLeadDays
          ? `The expected lead time is ${authority.etaDays} days, above your ${item.maxLeadDays}-day automatic limit.`
          : null,
      ].filter(Boolean);

      if (purchase.automationMode === "auto_contact" || !authority.withinAutoAccept) {
        tasks.push({
          id: `decision-fixed-${purchase.id}`,
          businessId: state.business.id,
          module: "purchasing",
          entityId: item.id,
          requestId: purchase.id,
          priority: authority.withinAutoAccept ? "medium" : "high",
          state: "needs_owner",
          title: `${item.name} purchase needs approval`,
          whatHappened: `Jourvis prepared a fixed-price purchase for ₱${Math.round(purchase.estimatedTotal).toLocaleString("en-PH")}.`,
          why: reasons.join(" ") || "The purchase requires owner authority before Jourvis can continue.",
          whatJourvisDid: "Jourvis prepared the supplier request but stopped before approving terms outside its authority.",
          whyOwnerIsNeeded: "The owner must approve the purchase or update Jourvis' authority.",
          actions: ["approve", "reject", "update"],
        });
      }
    }

    if (purchase.status === "quote_received") {
      const authority = evaluatePurchaseAuthority(item, purchase);
      const autonomousWithinAuthority =
        purchase.origin === "jourvis" &&
        purchase.automationMode === "autobuy" &&
        authority.withinAutoAccept;
      const autonomousNegotiationPending =
        purchase.origin === "jourvis" &&
        purchase.automationMode === "autobuy" &&
        state.automationMasterOn &&
        authority.canNegotiate;

      if (autonomousWithinAuthority || autonomousNegotiationPending) return;

      const reasons = [
        authority.total > item.maxAutoOrderSpend
          ? `The quote total is ₱${Math.round(authority.total).toLocaleString("en-PH")}, above your ₱${Math.round(item.maxAutoOrderSpend).toLocaleString("en-PH")} automatic order limit.`
          : null,
        authority.packPrice > item.autoAcceptPackPrice
          ? `The pack price is ₱${Math.round(authority.packPrice).toLocaleString("en-PH")}, above your ₱${Math.round(item.autoAcceptPackPrice).toLocaleString("en-PH")} auto-accept limit.`
          : null,
        authority.packPrice > item.hardMaxPackPrice
          ? `The pack price also exceeds your absolute ceiling of ₱${Math.round(item.hardMaxPackPrice).toLocaleString("en-PH")}.`
          : null,
        authority.quantity > item.maxAutoOrderQty
          ? `The requested quantity ${authority.quantity} ${item.unit} exceeds your ${item.maxAutoOrderQty} ${item.unit} automatic limit.`
          : null,
        authority.deliveryFee > item.maxDeliveryFee
          ? `The delivery fee is ₱${Math.round(authority.deliveryFee).toLocaleString("en-PH")}, above your ₱${Math.round(item.maxDeliveryFee).toLocaleString("en-PH")} limit.`
          : null,
        authority.etaDays > item.maxLeadDays
          ? `The quoted lead time is ${authority.etaDays} days, above your ${item.maxLeadDays}-day limit.`
          : null,
        !item.autoNegotiate && !authority.withinAutoAccept
          ? "Automatic negotiation is turned off."
          : null,
        item.autoNegotiate && authority.counteroffersUsed >= item.maxCounteroffers && !authority.withinAutoAccept
          ? `Jourvis has already used the configured maximum of ${item.maxCounteroffers} counteroffer${item.maxCounteroffers === 1 ? "" : "s"}.`
          : null,
        purchase.origin === "owner"
          ? "You asked Jourvis to request the quote, but did not authorize Jourvis to accept the final price automatically."
          : null,
        purchase.automationMode === "auto_contact"
          ? "Your rule is Contact supplier, so Jourvis may request the quote but may not approve the purchase automatically."
          : null,
      ].filter(Boolean).join(" ");

      tasks.push({
        id: `decision-quote-${purchase.id}`,
        businessId: state.business.id,
        module: "purchasing",
        entityId: item.id,
        requestId: purchase.id,
        priority: authority.withinAutoAccept ? "medium" : "high",
        state: "needs_owner",
        title: `${item.name} quote needs a decision`,
        whatHappened: `The supplier returned a quote of ₱${Math.round(authority.total).toLocaleString("en-PH")}.`,
        why: reasons || "The quote requires owner authority before Jourvis can continue.",
        whatJourvisDid: "Jourvis stopped the purchase instead of accepting terms outside its current authority.",
        whyOwnerIsNeeded: "Only the owner can approve this exception or update the rule.",
        actions: ["approve", "reject", "update"],
      });
    }

    if (purchase.status === "in_transit" || purchase.status === "partial_received") {
      tasks.push({
        id: `receive-${purchase.id}`,
        businessId: state.business.id,
        module: "purchasing",
        entityId: item.id,
        requestId: purchase.id,
        priority: "medium",
        state: "needs_owner",
        title: `${item.name} delivery needs receiving`,
        whatHappened: "The supplier delivery is in transit or partially received.",
        why: "Jourvis can track the purchase, but the physical quantity that arrived must be confirmed.",
        whatJourvisDid: "Jourvis kept the quantity as incoming rather than adding it to on-hand stock.",
        whyOwnerIsNeeded: "A person must confirm the actual physical delivery count.",
        actions: ["receive", "update"],
      });
    }
  });

  state.inventory.forEach((item) => {
    if (state.pausedItemIds.includes(item.id) || activeItemIds.has(item.id)) return;

    const percent = inventoryPercent(item);
    const lowPercent = Math.round(
      (item.reorderAt / Math.max(item.fullLevel, 0.01)) * 100,
    );
    if (item.current > item.reorderAt) return;

    const quantity = suggestedPurchaseQuantity(item);
    const estimatedTotal = estimatedPurchaseTotal(item, quantity);

    if (
      !item.automationEnabled ||
      item.automationMode === "assist"
    ) {
      tasks.push({
        id: `restock-${item.id}`,
        businessId: state.business.id,
        module: "inventory",
        entityId: item.id,
        priority: percent <= Math.max(10, Math.floor(lowPercent * 0.65)) ? "high" : "medium",
        state: "needs_owner",
        title: `${item.name} is below its low-stock level`,
        whatHappened: `${item.name} is at ${percent}%, below the ${lowPercent}% warning level.`,
        why: item.automationEnabled
          ? "This item is configured as Watch only, so Jourvis is not allowed to purchase it automatically."
          : "This task is set to Manual, so Jourvis will observe it but will not start purchasing automatically.",
        whatJourvisDid: `Jourvis calculated a suggested purchase of ${quantity} ${item.unit}, estimated at ₱${Math.round(estimatedTotal).toLocaleString("en-PH")}.`,
        whyOwnerIsNeeded: "Jourvis does not currently have enough authority to start this purchase automatically.",
        actions: ["approve", "reject", "update"],
      });
    }
  });

  return tasks.sort((a, b) => {
    const priority = taskPriorityValue(b.priority) - taskPriorityValue(a.priority);
    if (priority) return priority;
    return a.title.localeCompare(b.title);
  });
}
