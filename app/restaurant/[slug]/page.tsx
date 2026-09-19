import { notFound } from "next/navigation";
import Restaurant from "@/components/Restaurant";
import { restaurantMenu } from "@/lib/restaurant-menu";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your private Marinara demo",
  robots: { index: false, follow: false },
};
export default async function PrivateRestaurant({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^private-[a-f0-9-]{36}$/.test(slug)) notFound();
  try {
    const props = await restaurantMenu(slug);
    return <Restaurant {...props} />;
  } catch {
    return (
      <main id="main" className="auth-page">
        <h1>This practice menu is private.</h1>
        <p>
          Return to your workspace using the same verified account. Trial access ends after seven
          days.
        </p>
        <a href="/command-center">Your workspace →</a>
      </main>
    );
  }
}
