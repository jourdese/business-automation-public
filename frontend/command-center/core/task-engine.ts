import {
  estimatedPurchaseTotal,
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
      const overSpend = purchase.estimatedTotal > item.maxAutoOrderSpend;
      const overPrice = item.packPrice > item.autoAcceptPackPrice;
      if (purchase.automationMode === "auto_contact" || overSpend || overPrice) {
        const why = purchase.automationMode === "auto_contact"
          ? "Your rule lets Jourvis contact the supplier, but not approve the purchase."
          : [
              overSpend
                ? `The known order total is ₱${Math.round(purchase.estimatedTotal).toLocaleString("en-PH")}, above your ₱${Math.round(item.maxAutoOrderSpend).toLocaleString("en-PH")} automatic limit.`
                : null,
              overPrice
                ? `The pack price is ₱${Math.round(item.packPrice).toLocaleString("en-PH")}, above your ₱${Math.round(item.autoAcceptPackPrice).toLocaleString("en-PH")} automatic price limit.`
                : null,
            ].filter(Boolean).join(" ");

        tasks.push({
          id: `decision-fixed-${purchase.id}`,
          businessId: state.business.id,
          module: "purchasing",
          entityId: item.id,
          requestId: purchase.id,
          priority: overSpend || overPrice ? "high" : "medium",
          state: "needs_owner",
          title: `${item.name} purchase needs approval`,
          whatHappened: `Jourvis prepared a fixed-price purchase for ₱${Math.round(purchase.estimatedTotal).toLocaleString("en-PH")}.`,
          why,
          whatJourvisDid: "Jourvis prepared the supplier request but stopped before approving terms outside its authority.",
          whyOwnerIsNeeded: "The owner must approve the purchase or update Jourvis' authority.",
          actions: ["approve", "reject", "update"],
        });
      }
    }

    if (purchase.status === "quote_received") {
      const quotedTotal = purchase.quotedTotal ?? purchase.estimatedTotal;
      const quotedPackPrice = purchase.quotedPackPrice ?? item.packPrice;
      const totalOver = quotedTotal - item.maxAutoOrderSpend;
      const packOver = quotedPackPrice - item.autoAcceptPackPrice;
      const autonomousWithinAuthority =
        purchase.origin === "jourvis" &&
        purchase.automationMode === "autobuy" &&
        totalOver <= 0 &&
        packOver <= 0;

      if (autonomousWithinAuthority) return;

      const reasons = [
        totalOver > 0
          ? `The quote is ₱${Math.round(totalOver).toLocaleString("en-PH")} above your automatic order limit.`
          : null,
        packOver > 0
          ? `The pack price is ₱${Math.round(packOver).toLocaleString("en-PH")} above your automatic price limit.`
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
        priority: totalOver > 0 || packOver > 0 ? "high" : "medium",
        state: "needs_owner",
        title: `${item.name} quote needs a decision`,
        whatHappened: `The supplier returned a quote of ₱${Math.round(quotedTotal).toLocaleString("en-PH")}.`,
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
