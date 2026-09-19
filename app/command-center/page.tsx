import SignOut from "@/components/SignOut";
import { command } from "@/lib/api";
import type { Business, PrivateDemo } from "@/lib/types";
import PrivateDemoCard from "@/components/PrivateDemoCard";
export const dynamic = "force-dynamic";
export default async function Businesses() {
  let businesses: Business[] = [];
  let error = "";
  let demo: PrivateDemo | null = null;
  try {
    businesses = await command<Business[]>("my_businesses");
    demo = await command<PrivateDemo | null>("private_demo_status");
  } catch (e) {
    error = e instanceof Error ? e.message : "Sign in to continue.";
  }
  return (
    <main id="main" className="auth-page">
      <a className="brand-link" href="/">
        Jourvis
      </a>
      <p className="eyebrow">COMMAND-CENTER</p>
      <h1>Where shall we begin?</h1>
      <p>
        Marinara owners and staff: open your invited workspace below. Your verified account only
        opens businesses you have permission to manage.
      </p>
      {error ? (
        <>
          <p role="status">{error}</p>
          <a className="button" href="/account">
            Sign in
          </a>
        </>
      ) : businesses.length ? (
        businesses.map((b) => (
          <a key={b.id} className="business-link" href={`/command-center/${b.businessId}`}>
            <span>{b.name}</span>
            <small>{b.role} →</small>
          </a>
        ))
      ) : (
        <p>
          You have no business invitations yet. You can still explore your own private practice
          space below.
        </p>
      )}
      {!error && (
        <>
          <PrivateDemoCard initial={demo} />
          <SignOut />
        </>
      )}
      <a href="/suppliers">Supplier portal →</a>
      <a href="/command-center-v1">Open V1 reference →</a>
    </main>
  );
}
