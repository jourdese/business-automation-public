import { notFound } from "next/navigation";
import Restaurant from "@/components/Restaurant";
import { restaurantMenu } from "@/lib/restaurant-menu";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your table at Marinara",
  robots: { index: false, follow: false },
};
export default async function TableMenu({
  params,
}: {
  params: Promise<{ slug: string; stationToken: string }>;
}) {
  const { slug, stationToken } = await params;
  if (slug !== "marinara-ristorante" || !/^[a-f0-9-]{36}$/i.test(stationToken)) notFound();
  const props = await restaurantMenu();
  return <Restaurant {...props} stationToken={stationToken} />;
}
