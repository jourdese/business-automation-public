import Restaurant from "@/components/Restaurant";
import { restaurantMenu } from "@/lib/restaurant-menu";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Marinara Ristorante — A table worth lingering at",
  description:
    "Pasta, pizza, and a little room for something sweet. Explore the Marinara demonstration menu.",
};
export default async function Marinara() {
  const props = await restaurantMenu();
  return <Restaurant {...props} />;
}
