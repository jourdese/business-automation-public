import { command } from "./api";
import type { PublicMenu } from "./types";
import catalog from "@/data/marinara.json";
export async function restaurantMenu(
  slug = "marinara-ristorante",
): Promise<{ menu: PublicMenu; connected: boolean }> {
  try {
    const menu = await command<PublicMenu>("menu", { slug });
    if (menu) return { menu, connected: true };
  } catch {
    if (slug !== "marinara-ristorante")
      throw new Error("This private demo requires its owner's active sign-in.");
    /* The editorial page remains readable when ordering is unavailable. */
  }
  if (slug !== "marinara-ristorante") throw new Error("Private demo not found.");
  return {
    connected: false,
    menu: {
      id: "preview",
      slug: catalog.slug,
      name: catalog.name,
      demo: true,
      acceptingOrders: false,
      items: catalog.items.map((i) => ({
        ...i,
        id: i.code,
        available: true,
        image: `/marinara/food/${i.image}`,
      })),
    },
  };
}
