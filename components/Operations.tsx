"use client";
import Dialog from "./Dialog";
import ActionRecovery from "./ActionRecovery";
import AuthoritySettings from "./AuthoritySettings";
import { useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Download, Plus } from "lucide-react";
import type { Ingredient, MenuItem, Purchase, Snapshot } from "@/lib/types";
import {
  centavos,
  dayInManila,
  friendlyStatus,
  money,
  purchaseTotal,
  quantity,
} from "@/lib/format";
import { AreaHeading, Empty, type RunCommand } from "./WorkspaceUI";

export function InventoryArea({
  data,
  run,
  busy,
}: {
  data: Snapshot;
  run: RunCommand;
  busy: boolean;
}) {
  const [search, setSearch] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [selected, setSelected] = useState<Ingredient | null>(null);
  const [kind, setKind] = useState("count");
  const [key, setKey] = useState("");
  const rows = data.ingredients.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) &&
      (!onlyLow || Number(i.on_hand) - Number(i.reserved) < Number(i.reorder_at)),
  );
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await run("adjust_stock", {
        id: selected?.id,
        kind,
        expectedOnHand: Number(selected?.on_hand),
        quantity: Number(f.get("quantity")),
        reason: String(f.get("reason")),
        requestKey: key,
      });
      setSelected(null);
    } catch {
      /* Shared notice. */
    }
  }
  return (
    <>
      <AreaHeading
        eyebrow="READY FOR SERVICE"
        title="Know what’s really on hand."
        description="Physical stock, reservations and incoming deliveries. Kept distinct, always."
      />
      <div className="toolbar">
        <label className="search-label">
          Find an ingredient
          <input
            placeholder="Search ingredients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="check-label">
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
          Below reorder level
        </label>
      </div>
      <div className="surface table-scroll">
        <table>
          <caption className="sr-only">Current ingredient inventory</caption>
          <thead>
            <tr>
              <th>Ingredient</th>
              <th>On hand</th>
              <th>Reserved</th>
              <th>Available</th>
              <th>Incoming</th>
              <th>Reorder at</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                <td>
                  <strong>{i.name}</strong>
                  <small>
                    {i.unit} · average cost {money(i.average_cost)}/{i.unit}
                  </small>
                </td>
                <td>{quantity(i.on_hand)}</td>
                <td>{quantity(i.reserved)}</td>
                <td
                  className={
                    Number(i.on_hand) - Number(i.reserved) < Number(i.reorder_at) ? "low-stock" : ""
                  }
                >
                  {quantity(Number(i.on_hand) - Number(i.reserved))}
                </td>
                <td>
                  {Number(i.incoming) > 0 ? (
                    <span className="pill good">+{quantity(i.incoming)}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{quantity(i.reorder_at)}</td>
                <td>
                  {data.role !== "viewer" && (
                    <button
                      className="text-button"
                      onClick={() => {
                        setSelected(i);
                        setKind("count");
                        setKey(crypto.randomUUID());
                      }}
                    >
                      Adjust
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <Dialog title={selected.name} close={() => setSelected(null)}>
          <p>
            {quantity(selected.on_hand)} {selected.unit} on hand · {quantity(selected.reserved)}{" "}
            reserved
          </p>
          <form onSubmit={submit}>
            <label>
              Record type
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="count">Physical count</option>
                <option value="waste">Waste / spoilage</option>
              </select>
            </label>
            <label>
              {kind === "count" ? "New physical count" : "Quantity wasted"} ({selected.unit})
              <input
                name="quantity"
                type="number"
                min={kind === "count" ? Number(selected.reserved) : 0.0001}
                step="0.0001"
                max={
                  kind === "waste"
                    ? Number(selected.on_hand) - Number(selected.reserved)
                    : undefined
                }
                required
              />
            </label>
            <label>
              Reason
              <textarea name="reason" required minLength={3} maxLength={300} />
            </label>
            <p className="form-note">
              This creates an audit entry. Reservations cannot exceed physical stock.
            </p>
            <button disabled={busy}>Save stock adjustment</button>
          </form>
        </Dialog>
      )}
      <section className="surface spaced">
        <h2>Recent physical changes</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Change</th>
                <th>Reason</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {data.movements
                .filter((m) => m.kind !== "usage")
                .slice(0, 12)
                .map((m) => (
                  <tr key={m.id}>
                    <td>{data.ingredients.find((i) => i.id === m.ingredient_id)?.name}</td>
                    <td>
                      {Number(m.quantity) > 0 ? "+" : ""}
                      {quantity(m.quantity)}
                    </td>
                    <td>{m.reason}</td>
                    <td>
                      {new Date(m.created_at).toLocaleDateString("en-PH", {
                        timeZone: "Asia/Manila",
                      })}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
export function MenuArea({ data, run, busy }: { data: Snapshot; run: RunCommand; busy: boolean }) {
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [recipe, setRecipe] = useState(false);
  const [qr, setQr] = useState<{ label: string; url: string; image: string } | null>(null);
  const owner = ["owner", "admin"].includes(data.role);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      if (recipe) {
        const lines = data.ingredients.flatMap((i) => {
          const q = Number(f.get(i.id));
          return q > 0 ? [{ ingredientId: i.id, quantity: q }] : [];
        });
        await run("save_recipe", {
          id: selected?.id,
          expectedVersion: selected?.recipe_version,
          lines,
        });
      } else
        await run("save_menu", {
          id: selected?.id,
          price: centavos(String(f.get("price"))),
          available: f.get("available") === "on",
        });
      setSelected(null);
    } catch {
      /* Shared notice. */
    }
  }
  async function showQr(label: string, token: string) {
    const QRCode = await import("qrcode");
    const url = `${location.origin}/order/${data.restaurant.slug}/${token}`;
    setQr({
      label,
      url,
      image: await QRCode.toDataURL(url, {
        width: 800,
        margin: 3,
        color: { dark: "#132d26", light: "#ffffff" },
      }),
    });
  }
  return (
    <>
      <AreaHeading
        eyebrow="A MENU WITH A MEMORY"
        title="Twelve dishes. Every detail connected."
        description="Prices are saved with an order. Recipe changes apply to the next accepted order."
      />
      <div className="menu-admin-grid">
        {data.menu.map((m) => {
          const cost = data.recipes
            .filter((l) => l.menu_item_id === m.id)
            .reduce(
              (s, l) =>
                s +
                Number(l.quantity) *
                  Number(data.ingredients.find((i) => i.id === l.ingredient_id)?.average_cost || 0),
              0,
            );
          return (
            <article className="menu-admin-item" key={m.id}>
              <Image src={m.image} alt={m.name} width={400} height={300} />
              <div>
                <small>{m.category}</small>
                <h3>{m.name}</h3>
                <div className="split">
                  <strong>{money(m.price)}</strong>
                  <span className={`pill ${m.available ? "good" : ""}`}>
                    {m.available ? "Available" : "Paused"}
                  </span>
                </div>
                <p className="form-note">
                  Recipe v{m.recipe_version} · estimated food cost {money(cost)}
                </p>
                {data.role !== "viewer" && (
                  <div className="inline-actions">
                    <button
                      className="text-button"
                      onClick={() => {
                        setSelected(m);
                        setRecipe(false);
                      }}
                    >
                      Edit price
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        setSelected(m);
                        setRecipe(true);
                      }}
                    >
                      Recipe
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <section className="surface spaced">
        <div className="section-heading">
          <div>
            <p className="eyebrow">AT EVERY TABLE</p>
            <h2>Scan. Choose. Enjoy.</h2>
          </div>
          <a href={`/restaurant/${data.restaurant.slug}`} target="_blank">
            View customer menu <ArrowUpRight size={16} />
          </a>
        </div>
        <p>
          Each table has its own ordering link. Share it only where you want guests to place orders.{" "}
          {data.restaurant.accepting_orders
            ? "Ordering is open."
            : "Ordering is paused in Settings."}
        </p>
        <div className="station-grid">
          {data.stations.map((s) => (
            <button
              className="station-button"
              key={s.id}
              disabled={!owner || !s.token}
              onClick={() => void showQr(s.label, s.token!)}
            >
              <span>{s.label}</span>
              <small>{s.enabled ? "Ordering open" : "Paused"}</small>
              <Download size={18} />
            </button>
          ))}
        </div>
      </section>
      {selected && (
        <Dialog
          title={recipe ? `Recipe · ${selected.name}` : selected.name}
          close={() => setSelected(null)}
        >
          <form onSubmit={save}>
            {recipe ? (
              <>
                <p>
                  Quantities are per dish, in the ingredient’s base unit. Accepted orders retain
                  version {selected.recipe_version}.
                </p>
                <div className="recipe-editor">
                  {data.ingredients.map((i) => (
                    <label key={i.id}>
                      {i.name}
                      <span>{i.unit}</span>
                      <input
                        name={i.id}
                        type="number"
                        min="0"
                        step="0.0001"
                        defaultValue={
                          data.recipes.find(
                            (l) => l.menu_item_id === selected.id && l.ingredient_id === i.id,
                          )?.quantity || 0
                        }
                      />
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <>
                <label>
                  Menu price (PHP)
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={selected.price / 100}
                    required
                  />
                </label>
                <label className="check-label">
                  <input type="checkbox" name="available" defaultChecked={selected.available} />
                  Available for new orders
                </label>
              </>
            )}
            <button disabled={busy}>
              {recipe ? "Save a new recipe version" : "Save menu item"}
            </button>
          </form>
        </Dialog>
      )}
      {qr && (
        <Dialog title={qr.label} close={() => setQr(null)}>
          <p>Marinara Ristorante · Demonstration ordering</p>
          <Image
            src={qr.image}
            width={300}
            height={300}
            alt={`QR code for ${qr.label}`}
            unoptimized
            className="qr-image"
          />
          <a
            className="button"
            href={qr.image}
            download={`marinara-${qr.label.replace(" ", "-")}.png`}
          >
            Download QR
          </a>
          <a href={qr.url} target="_blank">
            Open this table’s menu →
          </a>
          <small>Customers submit requests. The kitchen accepts each order.</small>
        </Dialog>
      )}
    </>
  );
}
export function PurchasingArea({
  data,
  run,
  busy,
}: {
  data: Snapshot;
  run: RunCommand;
  busy: boolean;
}) {
  const [view, setView] = useState("active");
  const [selected, setSelected] = useState<string | null>(null);
  const [create, setCreate] = useState(false);
  const [requestKey, setRequestKey] = useState("");
  const [supplierId, setSupplierId] = useState(data.suppliers[0]?.id || "");
  const [error, setError] = useState("");
  const po = data.purchases.find((p) => p.id === selected);
  const owner = ["owner", "admin"].includes(data.role);
  const writable = data.role !== "viewer";
  const rows = data.purchases.filter((p) =>
    view === "history"
      ? ["RECEIVED", "CANCELLED"].includes(p.status)
      : !["RECEIVED", "CANCELLED"].includes(p.status),
  );
  async function action(op: string, p: Record<string, unknown>) {
    setError("");
    try {
      await run(op, p);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      return false;
    }
  }
  async function createPurchase(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await run("create_purchase", {
        productId: f.get("productId"),
        ingredientId: f.get("ingredientId"),
        packs: Number(f.get("packs")),
        requestKey,
      });
      setCreate(false);
    } catch {
      /* Shared notice. */
    }
  }
  function product(p: Purchase) {
    return data.supplierProducts.find((s) => s.id === p.product_id)?.name || "Supplier product";
  }
  return (
    <>
      <AreaHeading
        eyebrow="FROM REQUEST TO RECEIVING"
        title="Keep purchasing in perspective."
        description="A quotation isn’t a commitment. An incoming delivery isn’t stock on hand."
      />
      <div className="toolbar">
        <div className="filter-row">
          <button className={view === "active" ? "active" : ""} onClick={() => setView("active")}>
            In progress
          </button>
          <button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>
            Received & closed
          </button>
          <button
            className={view === "suppliers" ? "active" : ""}
            onClick={() => setView("suppliers")}
          >
            Suppliers
          </button>
        </div>
        {writable && (
          <button
            onClick={() => {
              setCreate(true);
              setRequestKey(crypto.randomUUID());
            }}
          >
            <Plus size={16} />
            New purchase
          </button>
        )}
      </div>
      {view === "suppliers" ? (
        <div className="supplier-grid">
          {data.suppliers.map((s) => (
            <article className="surface" key={s.id}>
              <span className={`pill ${s.linkStatus === "approved" ? "good" : ""}`}>
                {s.linkStatus}
              </span>
              <h2>{s.name}</h2>
              <p>{s.areas}</p>
              <dl className="definition-list">
                <div>
                  <dt>Lead time</dt>
                  <dd>{s.lead_days} days</dd>
                </div>
                <div>
                  <dt>Minimum order</dt>
                  <dd>{money(s.minimum_order)}</dd>
                </div>
                <div>
                  <dt>Contact</dt>
                  <dd>{s.contact_email}</dd>
                </div>
              </dl>
              <small>
                {s.demo ? "Fictional demo supplier · external delivery disabled" : s.terms}
              </small>
              {owner && s.linkStatus === "pending" && (
                <button
                  disabled={busy}
                  onClick={() => void action("approve_supplier", { supplierId: s.id })}
                >
                  Approve connection
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="surface table-scroll">
          <table>
            <thead>
              <tr>
                <th>Purchase</th>
                <th>Supplier</th>
                <th>Status</th>
                <th>Total</th>
                <th>Received</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{product(p)}</strong>
                    <small>
                      {p.packs} × {quantity(p.pack_size)}{" "}
                      {data.ingredients.find((i) => i.id === p.ingredient_id)?.unit}
                      {p.origin === "seed" ? " · seeded" : ""}
                    </small>
                  </td>
                  <td>{data.suppliers.find((s) => s.id === p.supplier_id)?.name}</td>
                  <td>
                    <span
                      className={`pill ${["CONFIRMED", "PARTIAL"].includes(p.status) ? "good" : p.status === "QUOTED" ? "amber" : ""}`}
                    >
                      {friendlyStatus(p.status)}
                    </span>
                  </td>
                  <td>{money(purchaseTotal(p))}</td>
                  <td>
                    {quantity(p.received)} / {quantity(p.packs * p.pack_size)}
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => {
                        setSelected(p.id);
                        setRequestKey(crypto.randomUUID());
                        setError("");
                      }}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 100 && (
            <p className="form-note">
              Showing the latest 100 closed purchases. Aggregate reporting includes all records.
            </p>
          )}
        </div>
      )}
      {po && (
        <Dialog title={product(po)} close={() => setSelected(null)}>
          <p>
            {data.suppliers.find((s) => s.id === po.supplier_id)?.name} · Version {po.version}
          </p>
          <span className="pill">{friendlyStatus(po.status)}</span>
          <dl className="definition-list">
            <div>
              <dt>
                {po.packs} packs × {quantity(po.pack_size)} units
              </dt>
              <dd>{money(po.pack_price)} / pack</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{money(po.delivery_fee)}</dd>
            </div>
            <div>
              <dt>Total commitment</dt>
              <dd>{money(purchaseTotal(po))}</dd>
            </div>
            <div>
              <dt>Hard pack limit</dt>
              <dd>{money(po.hard_pack_limit)}</dd>
            </div>
          </dl>
          {po.terms && <p>{po.terms}</p>}
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
          {writable && ["DRAFT", "QUOTED"].includes(po.status) && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void action("request_quote", { id: po.id })}
            >
              Request supplier quotation
            </button>
          )}
          {owner && ["DRAFT", "QUOTED"].includes(po.status) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void action("approve_purchase", {
                  id: po.id,
                  expectedVersion: po.version,
                  overrideReason: f.get("reason") || undefined,
                });
              }}
            >
              {po.pack_price > po.hard_pack_limit && (
                <label>
                  Why authorize this exception?
                  <textarea name="reason" minLength={5} maxLength={300} required />
                </label>
              )}
              <button disabled={busy}>Approve {money(purchaseTotal(po))}</button>
              <small>
                Approval applies only to this quantity, price, delivery fee and version.
              </small>
            </form>
          )}
          {owner && po.status === "APPROVED" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action("confirm_purchase", {
                  id: po.id,
                  expectedVersion: po.version,
                  reference: new FormData(e.currentTarget).get("reference"),
                });
              }}
            >
              <label>
                Supplier confirmation reference
                <input name="reference" minLength={2} maxLength={200} required />
              </label>
              <button disabled={busy}>Record supplier confirmation</button>
            </form>
          )}
          {writable && ["CONFIRMED", "PARTIAL"].includes(po.status) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void action("receive_purchase", {
                  id: po.id,
                  quantity: Number(f.get("quantity")),
                  reference: f.get("reference"),
                  requestKey,
                }).then((saved) => {
                  if (saved) setRequestKey(crypto.randomUUID());
                });
              }}
            >
              <hr />
              <h3>What physically arrived?</h3>
              <label>
                Accepted quantity ({data.ingredients.find((i) => i.id === po.ingredient_id)?.unit})
                <input
                  type="number"
                  name="quantity"
                  step="0.0001"
                  min="0.0001"
                  max={po.packs * po.pack_size - po.received}
                  required
                />
              </label>
              <label>
                Receipt / delivery reference
                <input name="reference" minLength={2} maxLength={200} required />
              </label>
              <button disabled={busy}>Record delivery</button>
              <small>Partial delivery is supported. Remaining quantities stay incoming.</small>
            </form>
          )}
          {writable && ["QUOTE_REQUESTED", "APPROVED"].includes(po.status) && (
            <>
              <hr />
              <button
                className="secondary"
                disabled={busy || !data.restaurant.integrations_ready}
                onClick={() => void action("queue_supplier_contact", { id: po.id })}
              >
                Send through connected integration
              </button>
              {!data.restaurant.integrations_ready && (
                <small>
                  Supplier messaging is not connected. Portal and manual records work independently.
                </small>
              )}
            </>
          )}
          {owner && ["DRAFT", "QUOTE_REQUESTED", "QUOTED", "APPROVED"].includes(po.status) && (
            <button
              className="text-button danger-text"
              disabled={busy}
              onClick={() => void action("cancel_purchase", { id: po.id })}
            >
              Cancel this uncommitted purchase
            </button>
          )}
        </Dialog>
      )}
      {create && (
        <Dialog title="Start a purchase" close={() => setCreate(false)}>
          <form onSubmit={createPurchase}>
            <label>
              Approved supplier
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                {data.suppliers
                  .filter((s) => s.linkStatus === "approved")
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Supplier product
              <select name="productId" required>
                {data.supplierProducts
                  .filter((p) => p.supplier_id === supplierId && p.available)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {quantity(p.pack_size)} {p.unit} · {money(p.pack_price)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Maps to ingredient
              <select name="ingredientId" required>
                {data.ingredients.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.unit})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Number of packs
              <input type="number" name="packs" min="1" max="1000" defaultValue="1" required />
            </label>
            <button disabled={busy}>Create purchase draft</button>
            <small>A draft does not spend money or add incoming stock.</small>
          </form>
        </Dialog>
      )}
    </>
  );
}
export function ReportsArea({ data }: { data: Snapshot }) {
  const [period, setPeriod] = useState(7);
  const [origin, setOrigin] = useState("all");
  const [end, setEnd] = useState(dayInManila());
  const start = new Date(`${end}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - period + 1);
  const startDay = start.toISOString().slice(0, 10);
  const rows = data.daily.filter(
    (d) => d.day >= startDay && d.day <= end && (origin === "all" || d.origin === origin),
  );
  const sales = rows.reduce((s, d) => s + Number(d.sales), 0),
    food = rows.reduce((s, d) => s + Number(d.food_cost), 0),
    orders = rows.reduce((s, d) => s + Number(d.orders), 0);
  const days = Array.from({ length: period }, (_, i) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + i);
    const day = date.toISOString().slice(0, 10);
    return {
      day,
      sales: rows.filter((r) => r.day === day).reduce((s, d) => s + Number(d.sales), 0),
    };
  });
  const max = Math.max(1, ...days.map((d) => d.sales));
  const points = days
    .map(
      (d, i) => `${30 + i * (720 / Math.max(1, days.length - 1))},${190 - (d.sales / max) * 155}`,
    )
    .join(" ");
  return (
    <>
      <AreaHeading
        eyebrow="THE STORY IN THE NUMBERS"
        title="See the rhythm of your restaurant."
        description="Completed orders drive sales. Recipe cost is an estimate of food usage, not a claim of net profit."
      />
      <div className="toolbar">
        <div className="filter-row">
          {[
            [1, "Daily"],
            [7, "Weekly"],
            [30, "Monthly"],
          ].map(([n, label]) => (
            <button
              key={n}
              className={period === n ? "active" : ""}
              onClick={() => setPeriod(Number(n))}
            >
              {label}
            </button>
          ))}
        </div>
        <label>
          Through
          <input
            type="date"
            value={end}
            onChange={(e) => {
              if (e.target.value) setEnd(e.target.value);
            }}
          />
        </label>
        <label>
          Data origin
          <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
            <option value="all">All records</option>
            <option value="seed">Seeded demo history</option>
            <option value="customer">Customer QR orders</option>
          </select>
        </label>
      </div>
      <section className="metric-strip">
        <div>
          <span>Sales</span>
          <strong>{money(sales)}</strong>
          <small>{orders} completed orders</small>
        </div>
        <div>
          <span>Average order</span>
          <strong>{money(orders ? sales / orders : 0)}</strong>
          <small>Sales ÷ completed orders</small>
        </div>
        <div>
          <span>Estimated food cost</span>
          <strong>{money(food)}</strong>
          <small>{sales ? ((food / sales) * 100).toFixed(1) : "0"}% of sales</small>
        </div>
        <div>
          <span>After food cost</span>
          <strong>{money(sales - food)}</strong>
          <small>Before labor, rent and other expenses</small>
        </div>
      </section>
      <section className="surface chart-surface">
        <div className="section-heading">
          <h2>Service has a rhythm</h2>
          <small>
            {startDay} – {end}
          </small>
        </div>
        <svg
          viewBox="0 0 780 225"
          role="img"
          aria-label={`Sales from ${startDay} to ${end}. Total ${money(sales)}.`}
        >
          <defs>
            <linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#438672" stopOpacity=".25" />
              <stop offset="1" stopColor="#438672" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[40, 90, 140, 190].map((y) => (
            <line key={y} x1="30" x2="750" y1={y} y2={y} stroke="#e6e9e3" />
          ))}
          <polygon points={`30,190 ${points} 750,190`} fill="url(#sales-fill)" />
          <polyline points={points} fill="none" stroke="#31755f" strokeWidth="3" />
          {days.length === 1 && (
            <circle cx="30" cy={190 - (days[0].sales / max) * 155} r="5" fill="#31755f" />
          )}
          <text x="30" y="215" fontSize="12" fill="#6d786f">
            {startDay}
          </text>
          <text x="750" y="215" textAnchor="end" fontSize="12" fill="#6d786f">
            {end}
          </text>
        </svg>
        <details>
          <summary>View daily figures</summary>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Sales</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.day}>
                  <td>{d.day}</td>
                  <td>{money(d.sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
      <div className="overview-grid bottom">
        <section className="surface">
          <h2>Guests keep coming back to…</h2>
          <p className="form-note">Last 30 days · all origins · completed orders</p>
          {data.bestSellers.slice(0, 5).map((d, i) => (
            <div className="best-seller" key={d.name}>
              <span>{i + 1}</span>
              <div>
                <strong>{d.name}</strong>
                <small>{quantity(d.quantity)} served</small>
              </div>
              <b>{money(d.sales)}</b>
            </div>
          ))}
        </section>
        <section className="surface">
          <h2>Keep the cost story honest.</h2>
          <p>
            Food cost uses the ingredient costs saved when preparation began. It does not include
            wages, utilities, rent, delivery expenses or tax.
          </p>
          <p>
            Physical counts and waste are recorded separately from recipe estimates. Cancelled
            orders never count as sales.
          </p>
          <small>These figures are operational guidance, not an accounting statement.</small>
        </section>
      </div>
    </>
  );
}
export function SettingsArea({
  data,
  run,
  busy,
}: {
  data: Snapshot;
  run: RunCommand;
  busy: boolean;
}) {
  const owner = ["owner", "admin"].includes(data.role);
  const [invite, setInvite] = useState("");
  const [error, setError] = useState("");
  async function configure(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await run("configure", {
        mode: f.get("mode"),
        perOrderLimit: centavos(String(f.get("perOrderLimit"))),
        dailyLimit: centavos(String(f.get("dailyLimit"))),
      });
    } catch {
      /* Shared notice. */
    }
  }
  return (
    <>
      <AreaHeading
        eyebrow="YOUR BUSINESS. YOUR AUTHORITY."
        title="A helpful pair of hands, on your terms."
        description="Jourvis starts sleeping. Manual orders, inventory and purchasing remain available."
      />
      <div className="settings-grid">
        <section className="surface">
          <h2>Jourvis permissions</h2>
          <form onSubmit={configure}>
            <fieldset disabled={!owner || busy}>
              <legend className="sr-only">Automation settings</legend>
              <label>
                Operating mode
                <select name="mode" defaultValue={data.restaurant.jourvis_mode}>
                  <option value="sleeping">Sleeping — manual operations</option>
                  <option value="watch">Watch only — observations, no external actions</option>
                  <option value="contact" disabled={!data.restaurant.integrations_ready}>
                    Contact suppliers
                  </option>
                  <option value="buy" disabled={!data.restaurant.integrations_ready}>
                    Buy within approved limits
                  </option>
                </select>
              </label>
              <label>
                Per-purchase authority (PHP)
                <input
                  name="perOrderLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={data.restaurant.per_order_limit / 100}
                />
              </label>
              <label>
                Daily aggregate authority (PHP)
                <input
                  name="dailyLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={data.restaurant.daily_limit / 100}
                />
              </label>
              <button>Save permissions</button>
            </fieldset>
          </form>
          <small>
            {data.restaurant.integrations_ready
              ? "Connected integration verified."
              : "External supplier integration is not connected. Contact and buying modes stay unavailable."}
          </small>
        </section>
        <section className="surface">
          <h2>Customer ordering</h2>
          <p>
            Table QR codes submit orders directly to the database. The kitchen decides when to
            accept them.
          </p>
          <span className={`pill ${data.restaurant.accepting_orders ? "good" : ""}`}>
            {data.restaurant.accepting_orders ? "Open for QR orders" : "QR ordering paused"}
          </span>
          {owner && (
            <button
              className="spaced"
              disabled={busy}
              onClick={() =>
                void run("set_ordering", { enabled: !data.restaurant.accepting_orders }).catch(
                  () => {},
                )
              }
            >
              {data.restaurant.accepting_orders ? "Pause QR ordering" : "Open QR ordering"}
            </button>
          )}
          <p className="form-note">
            This demo does not collect payment. Opening ordering accepts real customer-generated
            demo requests.
          </p>
        </section>
        <section className="surface">
          <h2>Invite someone</h2>
          <p>
            Invitations expire in seven days and can only be accepted by the matching verified
            email.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              const f = new FormData(e.currentTarget);
              try {
                const result = (await run("create_invite", {
                  email: f.get("email"),
                  role: f.get("role"),
                })) as { token: string; role: string };
                setInvite(
                  `${location.origin}/invite/${result.token}${result.role === "supplier" ? "?supplier=1" : ""}`,
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not create invitation");
              }
            }}
          >
            <fieldset disabled={!owner || busy}>
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Role
                <select name="role">
                  <option value="editor">Staff — orders and stock</option>
                  <option value="viewer">Viewer — read only</option>
                  <option value="admin">Administrator</option>
                  <option value="supplier">Supplier — own catalog only</option>
                </select>
              </label>
              <button>Create invitation link</button>
            </fieldset>
          </form>
          {error && <p role="alert">{error}</p>}
          {invite && (
            <label>
              Share this private invitation
              <input readOnly value={invite} onFocus={(e) => e.target.select()} />
              <small>No email was sent automatically.</small>
            </label>
          )}
        </section>
        <section className="surface">
          <h2>Integration activity</h2>
          {owner && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void run("evaluate", {}).catch(() => {})}
            >
              Evaluate rules / recover pending work
            </button>
          )}
          {data.jobs.length ? (
            data.jobs.map((j) => (
              <div className="readiness-row" key={j.id}>
                <div>
                  <strong>{friendlyStatus(j.kind)}</strong>
                  <small>{j.error_code || j.provider_receipt || "Awaiting result"}</small>
                </div>
                <span className="pill">{j.status}</span>
                {owner && ["failed", "uncertain"].includes(j.status) && (
                  <ActionRecovery job={j} run={run} busy={busy} />
                )}
              </div>
            ))
          ) : (
            <Empty
              title="No external actions."
              text="Ordinary orders, inventory changes and reports never create n8n executions."
            />
          )}
          <p className="form-note">
            An uncertain delivery needs review. It is never automatically resent.
          </p>
        </section>
        <AuthoritySettings data={data} run={run} busy={busy} />
      </div>
    </>
  );
}
