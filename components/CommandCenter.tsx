"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Link from "next/link";

import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Package,
  Truck,
  ChartNoAxesCombined,
  ChevronRight,
  ArrowUpRight,
  RefreshCw,
  Settings,
  History,
  Menu,
  X,
} from "lucide-react";

import type { Snapshot, Order } from "@/lib/types";

import { send, ApiClientError } from "@/lib/client-api";

import Dialog from "./Dialog";

import { browserClient } from "@/lib/supabase/browser";

import { money, quantity, time, dayInManila, friendlyStatus, purchaseTotal } from "@/lib/format";

import CompanionMark from "./jourvis/CompanionMark";

import JourvisLauncher from "./jourvis/JourvisLauncher";

import { InventoryArea, MenuArea, PurchasingArea, ReportsArea, SettingsArea } from "./Operations";

import { AreaHeading, Empty, type RunCommand } from "./WorkspaceUI";
import SignOut from "./SignOut";

const sections = [
  ["overview", "Overview", LayoutDashboard],
  ["orders", "Orders", ShoppingBag],
  ["menu", "Menu", UtensilsCrossed],
  ["inventory", "Inventory", Package],
  ["purchasing", "Purchasing", Truck],
  ["reports", "Reports", ChartNoAxesCombined],
] as const;

const stages = ["NEW", "ACCEPTED", "PREPARING", "READY"] as const;

export default function CommandCenter({
  initial,
  section,
}: {
  initial: Snapshot;
  section: string;
}) {
  const [data, setData] = useState(initial);
  const [accessLost, setAccessLost] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState("Connecting");
  const [nav, setNav] = useState(false);
  const [help, setHelp] = useState(false);

  const lock = useRef(false);
  const refreshing = useRef(false);
  const dirty = useRef(false);
  const [updated, setUpdated] = useState("");

  useEffect(() => {
    setData(initial);
    setNav(false);
  }, [initial]);

  const refresh = useCallback(async () => {
    if (refreshing.current) {
      dirty.current = true;
      return;
    }
    refreshing.current = true;
    try {
      const result = await send<Snapshot>("snapshot", { restaurantId: initial.restaurant.id });
      setData(result);
      setUpdated(new Date().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }));
    } catch (e) {
      if (e instanceof ApiClientError && [401, 403].includes(e.status)) setAccessLost(true);
      setNotice(e instanceof Error ? e.message : "Could not refresh.");
      setConnection("Reconnect needed");
    } finally {
      refreshing.current = false;
      if (dirty.current) {
        dirty.current = false;
        void refresh();
      }
    }
  }, [initial.restaurant.id]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setConnection("Local verification");
      return;
    }

    const db = browserClient();
    const channel = db
      .channel(`command-center:${initial.restaurant.business_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "cc_changes",
          filter: `business_id=eq.${initial.restaurant.business_id}`,
        },
        () => void refresh(),
      )
      .subscribe((status) => {
        setConnection(
          status === "SUBSCRIBED"
            ? "Live"
            : status === "CHANNEL_ERROR" || status === "TIMED_OUT"
              ? "Reconnecting"
              : "Connecting",
        );
        if (status === "SUBSCRIBED") void refresh();
      });

    const focus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);

    // Revalidation also detects revoked memberships, even if no realtime event arrives.

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60000);

    return () => {
      void db.removeChannel(channel);
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [refresh, initial.restaurant.business_id]);

  const run: RunCommand = async (op, p) => {
    if (lock.current) throw new Error("Another change is being saved.");
    lock.current = true;
    setBusy(true);
    setNotice("");
    try {
      const result = await send(op, { ...p, restaurantId: data.restaurant.id });
      await refresh();
      setNotice("Saved.");
      return result;
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "The change could not be saved.");
      throw e;
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };

  const base = `/command-center/${data.restaurant.business_id}`;
  const active = data.orders.filter((o) => stages.includes(o.status as (typeof stages)[number]));
  const low = data.ingredients.filter(
    (i) => Number(i.on_hand) - Number(i.reserved) < Number(i.reorder_at),
  );

  const decisions = data.purchases.filter(
    (p) => p.status === "QUOTED" && p.pack_price > p.hard_pack_limit,
  );
  const today = dayInManila();
  const todays = data.daily.filter((d) => d.day === today);
  const sales = todays.reduce((s, d) => s + Number(d.sales), 0);
  const completed = todays.reduce((s, d) => s + Number(d.orders), 0);

  if (accessLost)
    return (
      <main className="account-page">
        <h1>Access has changed.</h1>
        <p>Your private workspace has been closed. Sign in again or contact the business owner.</p>
        <Link href="/account">Sign in</Link>
      </main>
    );

  return (
    <div className="cc-app">
      <aside className={`sidebar ${nav ? "open" : ""}`}>
        <Link href="/command-center" className="cc-brand">
          <CompanionMark size={35} />
          <span>
            Jourvis<small>COMMAND-CENTER</small>
          </span>
        </Link>
        <button
          className="nav-close icon-button"
          onClick={() => setNav(false)}
          aria-label="Close navigation"
        >
          <X />
        </button>
        <div className="restaurant-label">
          <span className="monogram">M</span>
          <div>
            {data.restaurant.name}
            <small>{data.restaurant.demo ? "Demonstration business" : "Business workspace"}</small>
          </div>
        </div>
        <nav aria-label="Command Center">
          {sections.map(([key, label, Icon]) => (
            <Link
              key={key}
              className={key === section ? "selected" : ""}
              href={key === "overview" ? base : `${base}/${key}`}
              aria-current={key === section ? "page" : undefined}
            >
              <Icon size={19} />
              {label}
              {key === "orders" && active.length > 0 && <b>{active.length}</b>}
              {key === "purchasing" && decisions.length > 0 && (
                <b className="warning-dot">{decisions.length}</b>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <SignOut />
          <Link href={`${base}/activity`}>
            <History size={18} />
            Activity
          </Link>
          <Link href={`${base}/settings`}>
            <Settings size={18} />
            Settings & access
          </Link>
          <Link href={`/restaurant/${data.restaurant.slug}`} target="_blank">
            Customer menu
            <ArrowUpRight size={16} />
          </Link>
          <div className="jourvis-state">
            <CompanionMark size={34} />
            <span>
              Jourvis is {data.restaurant.jourvis_mode === "sleeping" ? "sleeping" : "watching"}
              <small>
                {data.restaurant.jourvis_mode === "sleeping"
                  ? "Your business can keep operating."
                  : "Your authority still comes first."}
              </small>
            </span>
          </div>
        </div>
      </aside>
      <div className="cc-workspace">
        <header className="cc-topbar">
          <button
            className="nav-open icon-button"
            aria-label="Open navigation"
            onClick={() => setNav(true)}
          >
            <Menu />
          </button>
          <span>{sections.find((s) => s[0] === section)?.[1] || friendlyStatus(section)}</span>
          <div className="topbar-right">
            <span className="connection">
              <i data-live={connection === "Live"} />
              {connection}
            </span>
            <button
              className="icon-button"
              onClick={() => void refresh()}
              aria-label="Refresh business records"
            >
              <RefreshCw size={16} />
            </button>
            <span className="avatar" title={`${data.role} access`}>
              {data.role.charAt(0).toUpperCase()}
            </span>
          </div>
        </header>
        <main id="main" className="cc-main" aria-busy={busy}>
          {notice && (
            <div className={`notice ${notice === "Saved." ? "success" : ""}`} role="status">
              {notice}
              <button onClick={() => setNotice("")} aria-label="Dismiss notice">
                ×
              </button>
            </div>
          )}
          {section === "overview" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">YOUR RESTAURANT, AT A GLANCE</p>
                  <h1>
                    A little clarity.
                    <br />
                    <em>A good service ahead.</em>
                  </h1>
                  <p>
                    {data.restaurant.demo
                      ? "Seeded history is labeled. New QR orders are recorded separately."
                      : "The useful details, together in one place."}
                  </p>
                </div>
                <div className="service-status">
                  <span className={`pill ${data.restaurant.accepting_orders ? "good" : ""}`}>
                    {data.restaurant.accepting_orders ? "QR ordering open" : "QR ordering paused"}
                  </span>
                  <small>{today} · Manila</small>
                </div>
              </div>
              <section className="metric-strip" aria-label="Today">
                <Metric
                  label="Sales today"
                  value={money(sales)}
                  detail={`${completed} completed orders`}
                />
                <Metric
                  label="In the kitchen"
                  value={String(active.length)}
                  detail={`${active.filter((o) => o.status === "NEW").length} waiting to be accepted`}
                />
                <Metric
                  label="Needs your attention"
                  value={String(decisions.length)}
                  detail="Purchase decisions"
                />
                <Metric
                  label="Committed to suppliers"
                  value={money(
                    data.purchases
                      .filter((p) => ["CONFIRMED", "PARTIAL"].includes(p.status))
                      .reduce((s, p) => s + purchaseTotal(p), 0),
                  )}
                  detail="Confirmed purchases only"
                />
              </section>
              <div className="overview-grid">
                <section className="surface service-board">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">RIGHT NOW</p>
                      <h2>The next table, taken care of.</h2>
                    </div>
                    <Link href={`${base}/orders`}>
                      All orders <ChevronRight size={16} />
                    </Link>
                  </div>
                  <div className="stage-strip">
                    {stages.map((s) => (
                      <div key={s}>
                        <strong>{active.filter((o) => o.status === s).length}</strong>
                        <span>{friendlyStatus(s)}</span>
                      </div>
                    ))}
                  </div>
                  {active.length ? (
                    active
                      .slice(0, 4)
                      .map((o) => <OrderRow key={o.id} order={o} href={`${base}/orders`} />)
                  ) : (
                    <Empty
                      title="Room to breathe."
                      text="New QR orders will arrive here when ordering is open."
                    />
                  )}
                </section>
                <section className="surface attention-surface">
                  <p className="eyebrow">WITH YOUR SAY-SO</p>
                  <h2>
                    {decisions.length ? "One decision at a time." : "Nothing waiting on you."}
                  </h2>
                  {decisions.map((p) => (
                    <div className="decision" key={p.id}>
                      <span className="pill amber">Above authority limit</span>
                      <h3>{data.supplierProducts.find((s) => s.id === p.product_id)?.name}</h3>
                      <p>
                        {money(p.pack_price)} per pack. Your hard limit is{" "}
                        {money(p.hard_pack_limit)}.
                      </p>
                      <div className="split">
                        <span>Order with delivery</span>
                        <strong>{money(purchaseTotal(p))}</strong>
                      </div>
                      <Link className="button" href={`${base}/purchasing`}>
                        Review the quote <ChevronRight size={16} />
                      </Link>
                    </div>
                  ))}
                  {!decisions.length && (
                    <p>You’ll see decisions here before they become commitments.</p>
                  )}
                </section>
              </div>
              <div className="overview-grid bottom">
                <section className="surface">
                  <div className="section-heading">
                    <h2>Ahead of the rush</h2>
                    <Link href={`${base}/inventory`}>
                      Inventory <ChevronRight size={16} />
                    </Link>
                  </div>
                  {low.slice(0, 4).map((i) => (
                    <div className="readiness-row" key={i.id}>
                      <span className="status-dot amber" />
                      <div>
                        <strong>{i.name}</strong>
                        <small>
                          {quantity(Number(i.on_hand) - Number(i.reserved))} {i.unit} available ·{" "}
                          {quantity(i.incoming)} {i.unit} incoming
                        </small>
                      </div>
                      <span className="pill">Below reorder level</span>
                    </div>
                  ))}
                  {!low.length && <p>Ingredients are above their configured reorder levels.</p>}
                </section>
                <section className="surface quiet-surface">
                  <CompanionMark size={50} />
                  <h2>
                    {data.restaurant.jourvis_mode === "sleeping"
                      ? "I’m here when you’re ready."
                      : "I’ll keep the details in view."}
                  </h2>
                  <p>
                    {data.restaurant.jourvis_mode === "sleeping"
                      ? "Orders, inventory and purchasing still work. Wake me when you want another pair of eyes on the operation."
                      : "You stay in charge. I surface low stock and quotes; approval still follows your authority settings."}
                  </p>
                  <Link href={`${base}/settings`}>
                    {data.restaurant.jourvis_mode === "sleeping"
                      ? "Wake Jourvis"
                      : "Review my permissions"}{" "}
                    <ArrowUpRight size={16} />
                  </Link>
                </section>
              </div>
            </>
          )}
          {section === "orders" && <OrdersArea data={data} run={run} busy={busy} />}
          {section === "menu" && <MenuArea data={data} run={run} busy={busy} />}
          {section === "inventory" && <InventoryArea data={data} run={run} busy={busy} />}
          {section === "purchasing" && <PurchasingArea data={data} run={run} busy={busy} />}
          {section === "reports" && <ReportsArea data={data} />}
          {section === "settings" && <SettingsArea data={data} run={run} busy={busy} />}
          {section === "activity" && (
            <>
              <AreaHeading
                eyebrow="A CLEAR RECORD"
                title="What changed, and why."
                description="Database activity, with a link back to the work."
              />
              <div className="surface activity-list">
                {data.activity.map((a) => (
                  <article key={a.id}>
                    <span className="timeline-dot" />
                    <div>
                      <strong>{a.summary}</strong>
                      <small>
                        {new Date(a.created_at).toLocaleString("en-PH", {
                          timeZone: "Asia/Manila",
                        })}{" "}
                        · {a.kind.replaceAll(".", " / ")}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          <footer className="cc-footnote">
            {data.restaurant.demo && `Demo dataset · Seeded ${data.restaurant.seed_date} · `}
            Asia/Manila{updated && ` · Refreshed ${updated}`}
          </footer>
        </main>
      </div>
      <JourvisLauncher
        open={help}
        onOpen={() => setHelp(true)}
        hint="Let’s make the next step clear."
        controls="owner-guide"
      />
      {help && (
        <Dialog title="Jourvis guide" close={() => setHelp(false)} className="owner-guide-dialog">
          <div id="owner-guide">
            <CompanionMark size={45} />
            <p className="eyebrow">JOURVIS, RIGHT HERE</p>
            <h2>
              {section === "inventory"
                ? "What you have. What’s on the way."
                : section === "purchasing"
                  ? "Nothing committed without the right authority."
                  : section === "orders"
                    ? "One clear step for every order."
                    : "Let’s make this easy."}
            </h2>
            <p>
              {section === "orders"
                ? "Accept to reserve ingredients. Start preparation to use that stock. Mark ready when the kitchen is done, then complete the order after it has been served."
                : section === "inventory"
                  ? "Available stock is what’s physically on hand minus reservations. Incoming becomes stock only when you record a delivery."
                  : section === "purchasing"
                    ? "A quote is an offer. Approval authorizes the current terms. A supplier confirmation creates a commitment. Receiving records what actually arrived."
                    : "Your business keeps working while I sleep. You can review today’s orders, check stock, and decide which quotes to approve."}
            </p>
            <Link href={`${base}/settings`}>My current permissions →</Link>
            <small>No AI call is needed for this guide.</small>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function OrderRow({ order: o, href }: { order: Order; href: string }) {
  return (
    <Link className="order-row" href={href}>
      <span className="table-number">{o.station?.replace("Table ", "") || "—"}</span>
      <div>
        <strong>
          {o.station} <small>#{o.id.slice(0, 6)}</small>
        </strong>
        <span>{o.items.map((i) => `${i.quantity} ${i.name}`).join(" · ")}</span>
      </div>
      <div>
        <span className={`pill status-${o.status.toLowerCase()}`}>{friendlyStatus(o.status)}</span>
        <small>{time(o.created_at)}</small>
      </div>
    </Link>
  );
}

function OrdersArea({ data, run, busy }: { data: Snapshot; run: RunCommand; busy: boolean }) {
  const [filter, setFilter] = useState("active");
  const [selected, setSelected] = useState<Order | null>(null);
  const [reason, setReason] = useState("");

  const orders = data.orders.filter(
    (o) =>
      filter === "all" ||
      (filter === "active"
        ? stages.includes(o.status as (typeof stages)[number])
        : o.status === filter),
  );

  const current = selected ? data.orders.find((o) => o.id === selected.id) : undefined;
  const writable = data.role !== "viewer";

  async function advance(o: Order, status: string) {
    try {
      await run("transition_order", { id: o.id, status, expectedStatus: o.status, reason });
      if (status === "CANCELLED") setSelected(null);
    } catch {
      /* Shared notice retains the failure. */
    }
  }

  return (
    <>
      <AreaHeading
        eyebrow="SERVICE IN MOTION"
        title="Every table. One clear next step."
        description="Accept, prepare, serve. Stock follows the work automatically."
      />
      <div className="filter-row" role="group" aria-label="Filter orders">
        {[
          ["active", "Active"],
          ["NEW", "New"],
          ["PREPARING", "Preparing"],
          ["READY", "Ready"],
          ["COMPLETED", "Completed"],
          ["CANCELLED", "Cancelled"],
          ["all", "All today"],
        ].map(([key, label]) => (
          <button
            className={filter === key ? "active" : ""}
            key={key}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="order-grid">
        {orders.map((o) => (
          <article className="order-ticket" key={o.id}>
            <header>
              <div>
                <strong>{o.station}</strong>
                <small>
                  #{o.id.slice(0, 6)} · {time(o.created_at)}
                </small>
              </div>
              <span className={`pill status-${o.status.toLowerCase()}`}>
                {friendlyStatus(o.status)}
              </span>
            </header>
            <ul>
              {o.items.map((i, index) => (
                <li key={index}>
                  <b>{i.quantity}</b>
                  <span>{i.name}</span>
                </li>
              ))}
            </ul>
            {o.note && <p className="order-note">{o.note}</p>}
            <footer>
              <small>{o.origin === "seed" ? "Seeded demo" : "Customer QR order"}</small>
              <strong>{money(o.total)}</strong>
            </footer>
            <div className="ticket-actions">
              {writable && stages.includes(o.status as (typeof stages)[number]) && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void advance(
                      o,
                      (
                        {
                          NEW: "ACCEPTED",
                          ACCEPTED: "PREPARING",
                          PREPARING: "READY",
                          READY: "COMPLETED",
                        } as Record<string, string>
                      )[o.status],
                    )
                  }
                >
                  {
                    (
                      {
                        NEW: "Accept order",
                        ACCEPTED: "Start preparation",
                        PREPARING: "Mark ready",
                        READY: "Complete order",
                      } as Record<string, string>
                    )[o.status]
                  }
                </button>
              )}
              <button
                className="text-button"
                onClick={() => {
                  setSelected(o);
                  setReason("");
                }}
              >
                Details
              </button>
            </div>
          </article>
        ))}
      </div>
      {!orders.length && (
        <Empty
          title="All clear here."
          text="Orders matching this view will appear as they arrive."
        />
      )}
      {current && (
        <Dialog title={`Order · ${current.station}`} close={() => setSelected(null)}>
          <p className="eyebrow">ORDER #{current.id.slice(0, 6)}</p>
          <h2 id="order-details">{current.station}</h2>
          <p>
            {friendlyStatus(current.status)} · {money(current.total)}
          </p>
          {current.items.map((i, index) => (
            <div className="split" key={index}>
              <span>
                {i.quantity} × {i.name}
              </span>
              <span>{money(i.quantity * i.unitPrice)}</span>
            </div>
          ))}
          {current.cancellation_reason && <p>{current.cancellation_reason}</p>}
          {writable && stages.includes(current.status as (typeof stages)[number]) && (
            <>
              <hr />
              <h3>Cancel this order</h3>
              <p>
                {current.prepared_at
                  ? "Preparation has started. Cancelling records waste; consumed stock is not restored."
                  : "Any reserved ingredients will be released."}
              </p>
              <label>
                Reason
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={300}
                />
              </label>
              <button
                className="danger"
                disabled={busy || reason.trim().length < 3}
                onClick={() => void advance(current, "CANCELLED")}
              >
                Confirm cancellation
              </button>
            </>
          )}
        </Dialog>
      )}
    </>
  );
}
