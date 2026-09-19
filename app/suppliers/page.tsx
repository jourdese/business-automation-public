import SupplierPortal from "@/components/SupplierPortal";
import { command } from "@/lib/api";
import type { SupplierSnapshot } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function Suppliers({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  try {
    const initial = await command<SupplierSnapshot>("supplier_snapshot");
    return <SupplierPortal initial={initial} inviteToken={invite} />;
  } catch {
    return (
      <main id="main" className="auth-page">
        <p className="eyebrow">JOURVIS · SUPPLIER PORTAL</p>
        <h1>
          Good partners.
          <br />
          Clear details.
        </h1>
        <p>
          Sign in with your verified email to register your business, maintain your catalog and
          respond to approved restaurant requests.
        </p>
        <a
          className="button"
          href={`/account?next=${encodeURIComponent(`/suppliers${invite ? `?invite=${invite}` : ""}`)}`}
        >
          Sign in or register
        </a>
        <a href="/">Back to Jourvis</a>
      </main>
    );
  }
}
