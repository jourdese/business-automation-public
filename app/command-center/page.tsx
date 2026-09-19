import SignOut from "@/components/SignOut";
import { command } from "@/lib/api";
import type { Business } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function Businesses() {
  let businesses: Business[] = [];
  let error = "";
  try {
    businesses = await command<Business[]>("my_businesses");
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
      <p>One account. Only the businesses you have permission to manage.</p>
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
          Your verified account has no business memberships yet. Open your owner’s invitation to
          join.
        </p>
      )}
      {!error && <SignOut />}
      <a href="/suppliers">Supplier portal →</a>
      <a href="/command-center-v1">Open V1 reference →</a>
    </main>
  );
}
