import { notFound } from "next/navigation";
import { command } from "@/lib/api";
import type { Business, Snapshot } from "@/lib/types";
import CommandCenter from "@/components/CommandCenter";
export const dynamic = "force-dynamic";
export default async function Center({
  params,
}: {
  params: Promise<{ businessId: string; section?: string[] }>;
}) {
  const { businessId, section } = await params;
  const active = section?.[0] || "overview";
  if (
    (section?.length || 0) > 1 ||
    ![
      "overview",
      "orders",
      "menu",
      "inventory",
      "purchasing",
      "reports",
      "settings",
      "activity",
    ].includes(active)
  )
    notFound();
  let snapshot: Snapshot;
  try {
    const businesses = await command<Business[]>("my_businesses");
    const business = businesses.find((b) => b.businessId === businessId);
    if (!business)
      return (
        <main id="main" className="auth-page">
          <h1>This business is private.</h1>
          <p>Open a business you have permission to manage.</p>
          <a href="/command-center">Your businesses</a>
        </main>
      );
    snapshot = await command<Snapshot>("snapshot", { restaurantId: business.id });
  } catch {
    return (
      <main id="main" className="auth-page">
        <h1>Let’s get you connected.</h1>
        <p>
          Sign in with your verified business account. If you are already signed in, the database
          connection may be temporarily unavailable.
        </p>
        <a className="button" href="/account">
          Sign in
        </a>
        <a href="/command-center">Your businesses</a>
      </main>
    );
  }
  return <CommandCenter initial={snapshot} section={active} />;
}
