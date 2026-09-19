import { command } from "./api";
import type { PublicMenu } from "./types";
import catalog from "@/data/marinara.json";
export async function restaurantMenu(): Promise<{ menu: PublicMenu; connected: boolean }> {
  try {
    const menu = await command<PublicMenu>("menu", { slug: "marinara-ristorante" });
    if (menu) return { menu, connected: true };
  } catch {
    /* The editorial page remains readable when ordering is unavailable. */
  }
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
