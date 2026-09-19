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
  if (
    (slug !== "marinara-ristorante" && !/^private-[a-f0-9-]{36}$/.test(slug)) ||
    !/^[a-f0-9-]{36}$/i.test(stationToken)
  )
    notFound();
  try {
    const props = await restaurantMenu(slug);
    return <Restaurant {...props} stationToken={stationToken} />;
  } catch {
    return (
      <main id="main" className="auth-page">
        <h1>This practice table is private.</h1>
        <p>Open it from your active private demo while signed in to the same account.</p>
        <a href="/command-center">Your workspace →</a>
      </main>
    );
  }
}
