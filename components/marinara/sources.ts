export const MARINARA_REVIEW_URL =
  "https://eatsmejax.com/2025/04/06/davao-marinara-ristorante-food-review/";
export const MARINARA_RESEARCH_DATE = "2026-09-17";
export const MARINARA_SOURCE_PUBLICATION_DATE = "2025-04-06";
/** External reference links only; no permission to republish photography is implied. */
export const marinaraSources: Readonly<
  Record<string, { url: string; sections: readonly string[] }>
> = Object.freeze({
  menu_starters: {
    url: "https://eatsmejax.com/wp-content/uploads/2025/04/20250323_125104.jpg?w=1024",
    sections: ["Starter", "Appetizer", "Salad", "Soup"],
  },
  menu_pasta: {
    url: "https://eatsmejax.com/wp-content/uploads/2025/04/20250323_125116.jpg?w=1024",
    sections: ["Pasta", "Cheese Wheel", "Pizza"],
  },
  menu_mains: {
    url: "https://eatsmejax.com/wp-content/uploads/2025/04/20250323_125131.jpg?w=1024",
    sections: ["Sandwich & Burger", "Sides", "Entree", "Steak"],
  },
  menu_desserts: {
    url: "https://eatsmejax.com/wp-content/uploads/2025/04/20250323_125146.jpg?w=1024",
    sections: ["Desserts", "Mix & Match"],
  },
  menu_drinks: {
    url: "https://eatsmejax.com/wp-content/uploads/2025/04/20250323_125159.jpg?w=1024",
    sections: [
      "Fresh Juices",
      "Fresh Fruit Shake",
      "Frappe",
      "Mocktail",
      "Coffee",
      "Water",
      "Soda",
      "Hot Tea",
    ],
  },
  menu_bundles: {
    url: "https://eatsmejax.com/wp-content/uploads/2025/04/20250323_125054.jpg?w=766",
    sections: ["Food Bundle"],
  },
  menu_promo_platters: {
    url: "https://eatsmejax.com/wp-content/uploads/2025/04/20250323_125213.jpg?w=1024",
    sections: ["Weekdays Special", "Platter Choice"],
  },
  cheese_wheel_photo: {
    url: "https://eatsmejax.com/wp-content/uploads/2025/04/20250323_123144.jpg?w=768",
    sections: ["Cheese-wheel presentation", "Limited dining-room view"],
  },
});
export const marinaraResearchStatus = {
  instagram: {
    url: "https://www.instagram.com/marinararistorante/",
    inspected: false,
    reason: "Profile did not fully load; not used to verify current visual identity or stock.",
  },
  facebook: {
    url: "https://www.facebook.com/profile.php?id=61553975544995",
    inspected: false,
    reason: "Profile did not fully load; restaurant identity is cross-linked in the dated review.",
  },
  menu: {
    source: MARINARA_REVIEW_URL,
    publicationDate: MARINARA_SOURCE_PUBLICATION_DATE,
    pagesInspected: 7,
    currentMenuVerified: false,
    completeTranscription: false,
  },
  location: {
    value: "Ascendido Building, Pryce Business Park, J.P. Laurel Avenue, Davao City, Philippines",
    source:
      "https://www.davaocitydirectory.com/food-and-beverages/restaurants/italian-cuisine/marinara-ristorante-bistro-pub.html",
    corroboratedBy: MARINARA_REVIEW_URL,
    status: "published-reference-not-owner-confirmed",
  },
  contacts: {
    phoneReference: "0956-357-5303",
    sourceId: "menu_starters",
    currentContactVerified: false,
  },
  exclusions: [
    "Archived promotions are not activated.",
    "Unclear or obscured prices are not guessed.",
    "No current hours, tax rate, service charge or dietary guarantee is asserted.",
    "Remy Eats location header conflicts with its Davao address; its Talaingod label is not used.",
  ],
} as const;
