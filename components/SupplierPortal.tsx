"use client";
import Dialog from "./Dialog";
import { useEffect, useState } from "react";
import type { SupplierSnapshot, SupplierProduct } from "@/lib/types";
import SignOut from "./SignOut";
import { send, ApiClientError } from "@/lib/client-api";
import { money, centavos, quantity, friendlyStatus } from "@/lib/format";
import { Plus } from "lucide-react";
import CompanionMark from "./jourvis/CompanionMark";
export default function SupplierPortal({
  initial,
  inviteToken,
}: {
  initial: SupplierSnapshot;
  inviteToken?: string;
}) {
  const [accessLost, setAccessLost] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (document.visibilityState === "visible")
        try {
          const latest = await send<SupplierSnapshot>("supplier_snapshot");
          if (active) setData(latest);
        } catch (e) {
          if (active && e instanceof ApiClientError && [401, 403].includes(e.status))
            setAccessLost(true);
        }
    };
    const timer = setInterval(() => void refresh(), 15000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const [data, setData] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<SupplierProduct | "new" | null>(null);
  const [quote, setQuote] = useState<string | null>(null);
  const supplier = data.suppliers[0];
  const request = data.requests.find((r) => r.id === quote);
  async function run(op: string, p: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const result = await send(op, p);
      setData(await send("supplier_snapshot"));
      return result;
    } catch (e) {
      if (e instanceof ApiClientError && [401, 403].includes(e.status)) setAccessLost(true);
      setError(e instanceof Error ? e.message : "Could not save.");
      throw e;
    } finally {
      setBusy(false);
    }
  }
  async function register(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await run("register_supplier", {
        name: f.get("name"),
        phone: f.get("phone"),
        areas: f.get("areas"),
        leadDays: Number(f.get("leadDays")),
        minimumOrder: centavos(String(f.get("minimumOrder"))),
        terms: f.get("terms"),
      });
    } catch {
      /* Visible error. */
    }
  }
  if (accessLost)
    return (
      <main id="main" className="auth-page">
        <h1>Access has changed.</h1>
        <p>Sign in again to open your supplier workspace.</p>
        <a href="/account?next=/suppliers">Sign in</a>
      </main>
    );
  return (
    <div className="supplier-portal">
      <header className="portal-header">
        <a className="cc-brand" href="/">
          <CompanionMark size={36} />
          <span>
            Jourvis<small>SUPPLIER PORTAL</small>
          </span>
        </a>
        <a href="/command-center">Your businesses ↗</a>
        <SignOut />
      </header>
      <main id="main" className="portal-main">
        <p className="eyebrow">GOOD PARTNERS. CLEAR DETAILS.</p>
        <h1>{supplier ? `Hello, ${supplier.name}.` : "Let’s bring your business to the table."}</h1>
        <p className="portal-intro">
          Keep your catalog current, respond to quotes, and build approved restaurant connections.
          Your restaurant partners’ private records stay private.
        </p>
        {error && (
          <div className="notice" role="alert">
            {error}
          </div>
        )}
        {!supplier ? (
          <form className="surface supplier-register" onSubmit={register}>
            <h2>Your supplier business</h2>
            <div className="form-grid">
              <label>
                Company name
                <input name="name" required minLength={2} maxLength={150} />
              </label>
              <label>
                Contact phone
                <input name="phone" autoComplete="tel" maxLength={40} />
              </label>
              <label>
                Delivery areas
                <input
                  name="areas"
                  required
                  maxLength={500}
                  placeholder="Cities or service areas"
                />
              </label>
              <label>
                Lead time (days)
                <input name="leadDays" type="number" min="0" max="365" required />
              </label>
              <label>
                Minimum order (PHP)
                <input
                  name="minimumOrder"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  required
                />
              </label>
            </div>
            <label>
              Notes / payment and delivery terms
              <textarea name="terms" maxLength={1000} />
            </label>
            <p className="form-note">
              Contact email is taken from your verified account. Registration gives access only to
              your supplier business, not to restaurant data.
            </p>
            <button disabled={busy}>Create supplier account</button>
          </form>
        ) : (
          <>
            {inviteToken && (
              <section className="surface spaced">
                <h2>A restaurant invited you.</h2>
                <p>
                  Accept the connection request using the verified email they invited. The
                  restaurant reviews the connection before sharing quote requests.
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run("accept_supplier_invite", {
                      supplierId: supplier.id,
                      token: inviteToken,
                    }).catch(() => {})
                  }
                >
                  Accept invitation
                </button>
              </section>
            )}
            <div className="section-heading spaced">
              <h2>Your catalog</h2>
              <button onClick={() => setEdit("new")}>
                <Plus size={16} />
                Add product
              </button>
            </div>
            <div className="surface table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Pack</th>
                    <th>Price</th>
                    <th>Available</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                        <small>
                          {p.sku} · {p.category}
                        </small>
                      </td>
                      <td>
                        {quantity(p.pack_size)} {p.unit}
                      </td>
                      <td>{money(p.pack_price)}</td>
                      <td>{p.available ? "Available" : "Paused"}</td>
                      <td>
                        <button className="text-button" onClick={() => setEdit(p)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.products.length && (
                <p className="empty">Add your first product, with its unit, pack size and price.</p>
              )}
            </div>
            <section className="spaced">
              <h2>Quotation requests</h2>
              <div className="surface table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Restaurant</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.requests.map((r) => (
                      <tr key={r.id}>
                        <td>{r.restaurant}</td>
                        <td>{data.products.find((p) => p.id === r.product_id)?.name}</td>
                        <td>
                          {r.packs} packs × {quantity(r.pack_size)}
                        </td>
                        <td>
                          <span className="pill">{friendlyStatus(r.status)}</span>
                        </td>
                        <td>
                          {["QUOTE_REQUESTED", "QUOTED", "APPROVED"].includes(r.status) && (
                            <button className="text-button" onClick={() => setQuote(r.id)}>
                              Respond
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.requests.length && (
                  <p className="empty">
                    Requests from approved restaurant connections will appear here.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </main>
      {edit && (
        <Dialog title={edit === "new" ? "Add a product" : edit.name} close={() => setEdit(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                await run("save_supplier_product", {
                  supplierId: supplier.id,
                  id: edit === "new" ? undefined : edit.id,
                  expectedVersion: edit === "new" ? undefined : edit.version,
                  name: f.get("name"),
                  sku: edit === "new" ? f.get("sku") : edit.sku,
                  category: f.get("category"),
                  unit: f.get("unit"),
                  packSize: Number(f.get("packSize")),
                  packPrice: centavos(String(f.get("price"))),
                  available: f.get("available") === "on",
                });
                setEdit(null);
              } catch {
                /* Visible error. */
              }
            }}
          >
            <label>
              Product name
              <input
                name="name"
                required
                minLength={2}
                maxLength={150}
                defaultValue={edit === "new" ? "" : edit.name}
              />
            </label>
            <label>
              SKU
              <input
                name="sku"
                required
                disabled={edit !== "new"}
                defaultValue={edit === "new" ? "" : edit.sku}
              />
            </label>
            <label>
              Category
              <input name="category" required defaultValue={edit === "new" ? "" : edit.category} />
            </label>
            <div className="form-grid">
              <label>
                Base unit
                <select
                  name="unit"
                  disabled={edit !== "new"}
                  defaultValue={edit === "new" ? "kg" : edit.unit}
                >
                  <option value="kg">Kilograms</option>
                  <option value="L">Liters</option>
                  <option value="each">Each</option>
                </select>
              </label>
              <label>
                Units per pack
                <input
                  name="packSize"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  required
                  disabled={edit !== "new"}
                  defaultValue={edit === "new" ? 1 : edit.pack_size}
                />
              </label>
            </div>
            <label>
              Pack price (PHP)
              <input
                type="number"
                name="price"
                min="0.01"
                step="0.01"
                required
                defaultValue={edit === "new" ? "" : edit.pack_price / 100}
              />
            </label>
            <label className="check-label">
              <input
                name="available"
                type="checkbox"
                defaultChecked={edit === "new" || edit.available}
              />
              Available
            </label>
            <button disabled={busy}>Save product</button>
            <small>
              Use a new SKU for a different pack size. Existing purchase terms remain unchanged.
            </small>
          </form>
          {error && <p role="alert">{error}</p>}
        </Dialog>
      )}
      {request && (
        <Dialog title={`Quote for ${request.restaurant}`} close={() => setQuote(null)}>
          <p>
            {request.packs} packs · current version {request.version}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                await run("submit_quote", {
                  supplierId: supplier.id,
                  id: request.id,
                  expectedVersion: request.version,
                  packPrice: centavos(String(f.get("price"))),
                  deliveryFee: centavos(String(f.get("delivery"))),
                  terms: f.get("terms"),
                });
                setQuote(null);
              } catch {
                /* Visible error. */
              }
            }}
          >
            <label>
              Price per pack (PHP)
              <input
                type="number"
                min="0.01"
                step="0.01"
                name="price"
                required
                defaultValue={request.pack_price / 100}
              />
            </label>
            <label>
              Delivery fee (PHP)
              <input
                type="number"
                min="0"
                step="0.01"
                name="delivery"
                required
                defaultValue={request.delivery_fee / 100}
              />
            </label>
            <label>
              Terms
              <textarea name="terms" maxLength={1000} defaultValue={request.terms} />
            </label>
            <button disabled={busy}>Submit current terms</button>
            <p className="form-note">
              Revised prices or terms invalidate earlier approval. The restaurant must review the
              new version.
            </p>
          </form>
          {error && <p role="alert">{error}</p>}
        </Dialog>
      )}
    </div>
  );
}
