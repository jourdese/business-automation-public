import { marinaraResearchStatus } from "./sources";

/** Website direction derived from supplied assets + archived menu research; not an owner-approved brand guide. */
export const marinaraDesignBrief = {
  status: "proposal",
  name: "Marinara Ristorante",
  fullName: "Marinara Ristorante Bistro & Pub",
  descriptor: "Italian-American bistro · Davao City",
  proposedHeadline: "A little theatre. A lot of comfort.",
  heroKicker: "Pasta, pizza, tableside moments.",
  intro:
    "A warm bistro built around generous plates, shared tables and the small rituals that make dinner feel like an occasion.",
  visualDirection:
    "Light, warm and sociable: cream paper, muted terracotta, dusty blush, warm brown and restrained gold. Food photography carries the emotion; the script identity stays prominent.",
  palette: {
    cream: "#F8F1E7",
    terracotta: "#A75E52",
    blush: "#DDB4A6",
    brown: "#49352D",
    gold: "#BE9A61",
    wine: "#7D3D38",
  },
  location: marinaraResearchStatus.location.value,
  locationNotice:
    "Published location reference; confirm directly with the restaurant before visiting.",
  instagram: marinaraResearchStatus.instagram.url,
  facebook: marinaraResearchStatus.facebook.url,
  menuNotice:
    "Menu planning uses archived 2025 references plus clearly marked demo concepts. Current prices, availability, fees and ingredients require confirmation.",
  imageryNotice:
    "Supplied Marinara imagery is used throughout this concept to preserve the restaurant’s food-first, convivial feeling.",
  proposedSections: [
    "Editorial hero",
    "Pasta and pizza ritual",
    "Visual table story",
    "Menu + meal planner + Jourvis",
    "Dining-room mood",
    "Visit and enquiry",
  ],
  mustNotInvent: [
    "Current opening hours or promotions",
    "Official owner-approved tagline",
    "Confirmed booking availability",
    "Current ingredient or allergen guarantees",
    "Current menu pricing",
  ],
} as const;
