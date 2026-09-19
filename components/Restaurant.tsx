"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUpRight, Minus, Plus, ShoppingBag, X } from "lucide-react";
import type { PublicMenu, MenuItem, Order } from "@/lib/types";
import { money, friendlyStatus } from "@/lib/format";
import { send, ApiClientError } from "@/lib/client-api";
import JourvisLauncher from "./jourvis/JourvisLauncher";
import CompanionMark from "./jourvis/CompanionMark";
import styles from "./Restaurant.module.css";
type PreparedOrder = {
  stationToken: string;
  requestKey: string;
  items: { id: string; quantity: number; price: number }[];
  note: string;
};
type Receipt = { id: string; receiptToken: string; status: string; total: number };
export default function Restaurant({
  menu: initial,
  connected,
  stationToken,
}: {
  menu: PublicMenu;
  connected: boolean;
  stationToken?: string;
}) {
  const [menu, setMenu] = useState(initial);
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [basket, setBasket] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PreparedOrder | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [status, setStatus] = useState<Order | null>(null);
  const [guide, setGuide] = useState(false);
  const [guideMessage, setGuideMessage] = useState(
    "A little guidance, whenever you need it. Explore the menu, choose something you like, and I’ll keep your table’s choices together.",
  );
  const [question, setQuestion] = useState("");
  const modal = useRef<HTMLDialogElement>(null);
  const guideRef = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const storage = `marinara-v2:${stationToken || "planning"}`;
  const items = menu.items.filter((i) => (cart[i.id] || 0) > 0);
  const count = items.reduce((n, i) => n + cart[i.id], 0);
  const total = items.reduce((n, i) => n + cart[i.id] * i.price, 0);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storage) || "{}");
      if (saved.receipt) setReceipt(saved.receipt);
      if (saved.pending) {
        setPending(saved.pending);
        setCart(
          Object.fromEntries(
            saved.pending.items.map((i: { id: string; quantity: number }) => [i.id, i.quantity]),
          ),
        );
        setNote(saved.pending.note);
        setBasket(true);
      } else if (saved.cart)
        setCart(
          Object.fromEntries(
            initial.items
              .filter(
                (i) =>
                  Number.isInteger(saved.cart[i.id]) &&
                  saved.cart[i.id] >= 1 &&
                  saved.cart[i.id] <= 20,
              )
              .map((i) => [i.id, saved.cart[i.id]]),
          ),
        );
    } catch {
      /* Optional draft persistence. */
    }
  }, [storage, initial.items]);
  useEffect(() => {
    if (basket) modal.current?.showModal();
    else modal.current?.close();
  }, [basket]);
  useEffect(() => {
    if (guide) guideRef.current?.showModal();
    else guideRef.current?.close();
  }, [guide]);
  useEffect(() => {
    if (!receipt) return;
    let stopped = false;
    async function check() {
      try {
        const result = await send<Order>("order_status", {
          id: receipt!.id,
          receiptToken: receipt!.receiptToken,
        });
        if (!stopped && result) setStatus(result);
      } catch {
        /* Keep the last confirmed status; do not invent progress. */
      }
    }
    void check();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 6000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [receipt]);
  function persist(value: object) {
    try {
      sessionStorage.setItem(storage, JSON.stringify(value));
    } catch {
      /* Ordering does not depend on browser storage. */
    }
  }
  function change(id: string, delta: number) {
    if (pending) return;
    setCart((current) => {
      const next = { ...current, [id]: Math.max(0, Math.min(20, (current[id] || 0) + delta)) };
      persist({ cart: next, receipt });
      return next;
    });
  }
  async function place() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const prepared = pending || {
      stationToken: stationToken!,
      requestKey: crypto.randomUUID(),
      items: items.map((i) => ({ id: i.id, quantity: cart[i.id], price: i.price })),
      note,
    };
    setPending(prepared);
    persist({ cart, pending: prepared, receipt });
    try {
      const result = await send<Receipt>("place_order", prepared);
      setReceipt(result);
      setCart({});
      setPending(null);
      setNote("");
      persist({ receipt: result });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The connection was interrupted. Retry this same request to check whether it was saved.",
      );
      if (e instanceof ApiClientError && e.status < 500) {
        setPending(null);
        persist({ cart, receipt });
        try {
          setMenu(await send<PublicMenu>("menu", { slug: menu.slug }));
        } catch {
          /* Current prices remain visible until a refresh succeeds. */
        }
      }
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  function ask(text: string) {
    setQuestion("");
    setGuide(true);
    const lower = text.toLowerCase();
    if (/allerg|gluten|nut|vegan/.test(lower))
      setGuideMessage(
        "The menu shows reported ingredients and allergens for these demo dishes. Cross-contact and dietary suitability need the restaurant team’s confirmation. Please ask them before ordering if you have an allergy.",
      );
    else if (/basket|chosen|order|table/.test(lower) && items.length)
      setGuideMessage(
        `Your table has ${items.map((i) => `${cart[i.id]} ${i.name}`).join(", ")}. The demo menu total is ${money(total)}. ${stationToken ? "Review your basket to send the order; the kitchen will still need to accept it." : "Scan a table QR at the restaurant to place an order."}`,
      );
    else if (/sweet|dessert/.test(lower)) {
      setCategory("Something sweet");
      setGuideMessage(
        "Save a little room for the Key Lime Cheesecake. I’ve brought the sweet finish into view.",
      );
    } else if (/pasta/.test(lower)) {
      setCategory("Pasta");
      setGuideMessage(
        "For a tomato-based bowl, explore Seafood Marinara. For something creamy, there’s Shrimp & Mushroom Alfredo. I’ve opened the pasta selection.",
      );
    } else if (/pizza|share/.test(lower)) {
      setCategory("Pizza");
      setGuideMessage(
        "Quattro Formaggi brings four cheeses to the table; Burrata Pizza adds a creamy center with tomato and basil. I’ve opened the pizza selection.",
      );
    } else if (/price|budget|under|how much/.test(lower))
      setGuideMessage(
        `The photographed demo menu ranges from ${money(Math.min(...menu.items.map((i) => i.price)))} to ${money(Math.max(...menu.items.map((i) => i.price)))}. Every dish shows its price, and the basket keeps a running total.`,
      );
    else
      setGuideMessage(
        stationToken
          ? "Choose a dish, adjust the quantity, then review your basket. Submitting creates a new order for the kitchen to accept. I’ll help you track the confirmed status here."
          : "Start with the menu below. I can help you explore pasta, pizza, prices, or your selected dishes. To place an order, scan a table QR at the restaurant.",
      );
  }
  function explore() {
    setGuide(false);
    document.getElementById("marinara-menu")?.scrollIntoView({ behavior: "smooth" });
  }
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a className={styles.logo} href={`/restaurant/${menu.slug}`} aria-label="Marinara home">
          <Image
            src="/marinara/branding/marinara-buon-cibo-logo-full.png"
            alt="Marinara · Buon Cibo"
            width={160}
            height={85}
            preload
          />
        </a>
        <nav aria-label="Restaurant navigation">
          <a href="#marinara-menu">Our menu</a>
          <a href="#the-room">The setting</a>
          <a href="#visit">Come over</a>
        </nav>
        <button
          className={styles.basketButton}
          onClick={() => setBasket(true)}
          aria-label={`Your table, ${count} dishes`}
        >
          <ShoppingBag size={16} />
          <span>Your table</span>
          <b>{count}</b>
        </button>
      </header>
      <main id="main">
        {!stationToken && (
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>BUON CIBO. BELLA COMPAGNIA.</p>
              <h1>
                A table worth
                <br />
                <em>lingering at.</em>
              </h1>
              <p>
                Good food. Familiar faces.
                <br />
                And a little room for something wonderful.
              </p>
              <a className={styles.primary} href="#marinara-menu">
                Find your kind of delicious <ArrowDown size={17} />
              </a>
              <span className={styles.heroFootnote}>ITALIAN-AMERICAN BISTRO · DAVAO CITY</span>
            </div>
            <div className={styles.heroPhoto}>
              <Image
                src="/marinara/food/marinara-menu-Burrata Pizza.jpg"
                alt="Burrata pizza, fresh basil and tomato at Marinara"
                fill
                preload
                sizes="(max-width: 700px) 100vw, 55vw"
              />
              <span className={styles.photoNote}>Made for the middle of the table.</span>
              <div className={styles.roundel}>
                GOOD FOOD
                <br />
                <i>better</i>
                <br />
                TOGETHER
              </div>
            </div>
          </section>
        )}
        <div className={styles.ribbon}>
          <span>Pasta with a little soul.</span>
          <i>✦</i>
          <span>Pizza worth sharing.</span>
          <i>✦</i>
          <span>Stay for one more story.</span>
        </div>
        <section className={styles.menuSection} id="marinara-menu">
          <div className={styles.sectionTitle}>
            <div>
              <p className={styles.eyebrow}>
                {stationToken ? "WELCOME TO YOUR TABLE" : "SOMETHING FOR EVERY APPETITE"}
              </p>
              <h2>{stationToken ? "Make yourself at home." : "What are you in the mood for?"}</h2>
            </div>
            <p>
              Twelve photographed favorites.
              <br />A little inspiration for your next gathering.
            </p>
          </div>
          <div className={styles.demoNote}>
            <span>DEMONSTRATION MENU</span>
            <p>
              Sample prices and recipe details. Confirm current availability and dietary needs with
              the restaurant. No payment is collected.
            </p>
          </div>
          {!connected && (
            <p className={styles.warning}>
              Ordering is temporarily unavailable. You can still explore the photographed menu.
            </p>
          )}
          {stationToken && !menu.acceptingOrders && (
            <p className={styles.warning}>
              This restaurant is not taking QR orders right now. Please ask a team member.
            </p>
          )}
          <div className={styles.categories} role="group" aria-label="Menu categories">
            {["All", ...new Set(menu.items.map((i) => i.category))].map((c) => (
              <button
                className={category === c ? styles.activeCategory : ""}
                onClick={() => setCategory(c)}
                key={c}
              >
                {c}
              </button>
            ))}
          </div>
          <div className={styles.dishes}>
            {menu.items
              .filter((i) => category === "All" || i.category === category)
              .map((i, index) => (
                <Dish
                  key={i.id}
                  item={i}
                  index={index}
                  quantity={cart[i.id] || 0}
                  locked={Boolean(pending)}
                  change={(delta) => change(i.id, delta)}
                />
              ))}
          </div>
          <div className={styles.menuClosing}>
            <span>A little help choosing?</span>
            <button
              onClick={() => ask("Help me choose pasta or pizza")}
              className={styles.linkButton}
            >
              Ask Jourvis <ArrowUpRight size={15} />
            </button>
          </div>
        </section>
        {!stationToken && (
          <>
            <section className={styles.room} id="the-room">
              <div className={styles.roomPhoto}>
                <Image
                  src="/marinara/atmosphere/marinara-interior.jpg"
                  alt="The warm, welcoming dining room at Marinara"
                  fill
                  sizes="(max-width: 700px) 100vw, 55vw"
                />
              </div>
              <div className={styles.roomCopy}>
                <p className={styles.eyebrow}>MORE THAN WHAT’S ON THE PLATE</p>
                <h2>
                  A little theatre.
                  <br />
                  <em>A lot of comfort.</em>
                </h2>
                <p>
                  The best evenings don’t need a grand plan. Just a shared pizza, another forkful of
                  pasta, and company that makes you forget to check the time.
                </p>
                <p>Pull up a chair. Let the table do the talking.</p>
                <span className={styles.handwritten}>Ci vediamo a tavola.</span>
              </div>
            </section>
            <section className={styles.visit} id="visit">
              <p className={styles.eyebrow}>MAKE A LITTLE ROOM FOR MARINARA</p>
              <h2>
                Bring your people.
                <br />
                We’ll bring the feeling.
              </h2>
              <p>
                Explore a plate, plan a table, or ask Jourvis for a little guidance.
                <br />
                For a visit, confirm current hours and arrangements with the restaurant.
              </p>
              <button className={styles.primary} onClick={() => ask("How do we order?")}>
                Let Jourvis help <ArrowUpRight size={16} />
              </button>
            </section>
          </>
        )}
      </main>
      <footer className={styles.footer}>
        <Image
          src="/marinara/branding/marinara-buon-cibo-logo-full.png"
          alt="Marinara"
          width={140}
          height={74}
        />
        <p>
          Good food. Good company.
          <br />A little more to remember.
        </p>
        <div>
          <a href="/">Made easier with Jourvis ↗</a>
          <small>Marinara demonstration experience</small>
        </div>
      </footer>
      {receipt && (
        <button className={styles.receiptBanner} onClick={() => setBasket(true)}>
          Order #{receipt.id.slice(0, 6)}{" "}
          <span>{friendlyStatus(status?.status || receipt.status)}</span>
          <ArrowUpRight size={15} />
        </button>
      )}
      <JourvisLauncher
        open={guide}
        onOpen={() => setGuide(true)}
        controls="marinara-guide"
        hint="A little help with your table."
      />
      <dialog
        ref={guideRef}
        className={styles.guide}
        id="marinara-guide"
        onCancel={() => setGuide(false)}
      >
        <button className={styles.close} onClick={() => setGuide(false)} aria-label="Close Jourvis">
          <X />
        </button>
        <CompanionMark size={48} />
        <p className={styles.eyebrow}>JOURVIS, AT YOUR TABLE</p>
        <h2>
          A little help?
          <br />
          <em>I’m right here.</em>
        </h2>
        <p role="status">{guideMessage}</p>
        <div className={styles.guideChoices}>
          {["Explore pasta", "Something to share", "What have I chosen?", "Allergen questions"].map(
            (q) => (
              <button key={q} onClick={() => ask(q)}>
                {q}
              </button>
            ),
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
        >
          <label className="sr-only" htmlFor="guide-question">
            Ask about the menu
          </label>
          <div className={styles.questionBox}>
            <input
              id="guide-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Pasta, prices, or your table…"
              maxLength={200}
            />
            <button disabled={!question.trim()} aria-label="Ask Jourvis">
              <ArrowUpRight size={18} />
            </button>
          </div>
        </form>
        <button className={styles.linkButton} onClick={explore}>
          Take me to the menu ↓
        </button>
      </dialog>
      <dialog ref={modal} className={styles.basket} onCancel={() => setBasket(false)}>
        <button
          className={styles.close}
          onClick={() => setBasket(false)}
          aria-label="Close your table"
        >
          <X />
        </button>
        <p className={styles.eyebrow}>A GOOD TABLE STARTS HERE</p>
        <h2>
          {receipt && !count && !pending
            ? "Your order, in good hands."
            : "A little of what you love."}
        </h2>
        {receipt && !count && !pending ? (
          <>
            <div className={styles.orderStatus}>
              <span>Order #{receipt.id.slice(0, 6)}</span>
              <strong>{friendlyStatus(status?.status || receipt.status)}</strong>
              <small>
                {(status?.status || receipt.status) === "NEW"
                  ? "Your request was saved. The kitchen still needs to accept it."
                  : (status?.status || receipt.status) === "COMPLETED"
                    ? "Your order has been completed. Thank you for sharing your table with us."
                    : "This is the latest status confirmed by the restaurant."}
              </small>
            </div>
            {status?.items?.map((i, n) => (
              <div className={styles.basketLine} key={n}>
                <span>
                  {i.quantity} × {i.name}
                </span>
                <strong>{money(i.unitPrice * i.quantity)}</strong>
              </div>
            ))}
            <p>Demo total: {money(receipt.total)}</p>
            <button className={styles.primary} onClick={() => setBasket(false)}>
              Back to the menu
            </button>
          </>
        ) : (
          <>
            <div className={styles.basketItems}>
              {items.map((i) => (
                <div className={styles.basketLine} key={i.id}>
                  <Image src={i.image} width={70} height={70} alt="" />
                  <div>
                    <strong>{i.name}</strong>
                    <small>{money(i.price)}</small>
                    <Quantity
                      value={cart[i.id]}
                      locked={Boolean(pending)}
                      change={(d) => change(i.id, d)}
                    />
                  </div>
                  <b>{money(i.price * cart[i.id])}</b>
                </div>
              ))}
            </div>
            {!count ? (
              <>
                <p>Your table is waiting for a favorite or two.</p>
                <button
                  className={styles.primary}
                  onClick={() => {
                    setBasket(false);
                    explore();
                  }}
                >
                  Explore the menu
                </button>
              </>
            ) : (
              <>
                <div className={styles.total}>
                  <span>Demo menu total</span>
                  <strong>{money(total)}</strong>
                </div>
                {stationToken ? (
                  <>
                    <label>
                      Something the kitchen should know?
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        disabled={Boolean(pending)}
                        maxLength={500}
                        placeholder="An order note. For allergies, speak with the team before ordering."
                      />
                    </label>
                    {error && (
                      <p role="alert" className={styles.warning}>
                        {error}
                      </p>
                    )}
                    {pending && !busy && (
                      <p className={styles.warning}>
                        We’re checking the same request. Your basket is held to prevent a duplicate
                        order.
                      </p>
                    )}
                    <button
                      className={styles.primary}
                      disabled={busy || !connected || !menu.acceptingOrders}
                      onClick={() => void place()}
                    >
                      {busy
                        ? "Checking your order…"
                        : pending
                          ? "Retry this order safely"
                          : "Send order to the kitchen"}
                      <ArrowUpRight size={17} />
                    </button>
                    <p className={styles.finePrint}>
                      This creates a demonstration order. The kitchen must accept it. No payment or
                      real restaurant reservation is made.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Keep your ideas together here. To place an order, scan a table QR at the
                      restaurant.
                    </p>
                    <button className={styles.primary} onClick={() => setBasket(false)}>
                      Keep exploring
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </dialog>
    </div>
  );
}
function Quantity({
  value,
  change,
  locked,
}: {
  value: number;
  change: (delta: number) => void;
  locked: boolean;
}) {
  return (
    <div className={styles.quantity}>
      <button disabled={locked || value === 0} aria-label="Remove one" onClick={() => change(-1)}>
        <Minus size={13} />
      </button>
      <span>{value}</span>
      <button disabled={locked || value >= 20} aria-label="Add one" onClick={() => change(1)}>
        <Plus size={13} />
      </button>
    </div>
  );
}
function Dish({
  item: i,
  index,
  quantity,
  change,
  locked,
}: {
  item: MenuItem;
  index: number;
  quantity: number;
  change: (delta: number) => void;
  locked: boolean;
}) {
  return (
    <article className={styles.dish} style={{ animationDelay: `${index * 35}ms` }}>
      <div className={styles.dishPhoto}>
        <Image
          src={i.image}
          alt={i.name}
          fill
          sizes="(max-width: 650px) 90vw, (max-width: 1000px) 45vw, 30vw"
        />
        <span className={styles.dishCategory}>{i.category}</span>
      </div>
      <div className={styles.dishDetails}>
        <div>
          <h3>{i.name}</h3>
          <strong>{money(i.price)}</strong>
        </div>
        <p>{i.description}</p>
        <details>
          <summary>Ingredients & allergens</summary>
          <p>
            {i.allergens.length
              ? `Reported allergens: ${i.allergens.join(", ")}.`
              : "No allergens are listed in this demo record."}{" "}
            This is not an allergen-free guarantee. Ask the restaurant about ingredients and
            cross-contact.
          </p>
        </details>
        <footer>
          {quantity ? (
            <Quantity value={quantity} locked={locked} change={change} />
          ) : (
            <button onClick={() => change(1)} disabled={locked || !i.available}>
              <Plus size={14} />
              {i.available ? "For our table" : "Unavailable"}
            </button>
          )}
          <span>DEMO PRICE</span>
        </footer>
      </div>
    </article>
  );
}
