"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Menu,
  MessageCircle,
  ShoppingBag,
  X,
} from "lucide-react";
import type { BusinessSiteProps } from "@/lib/businesses/types";
import {
  assets,
  foodGallery,
  namedDishImages,
  type MarinaraGalleryImage,
} from "@/lib/businesses/restaurant/marinara-ristorante/assets";
import {
  isMarinaraBusiness,
  marinaraSiteConfig as config,
} from "@/lib/businesses/restaurant/marinara-ristorante/config";
import { marinaraDesignBrief as copy } from "@/lib/businesses/restaurant/marinara-ristorante/website-content";
import { marinaraMenuPolicy } from "@/lib/businesses/restaurant/marinara-ristorante/menu";
import { imageLookupKey } from "@/lib/businesses/restaurant/marinara-ristorante/menu-view";
import {
  adjustPlan,
  mealPlanPrompt,
  sanitizePlan,
  summarizePlan,
  type MealPlan,
} from "@/lib/businesses/restaurant/marinara-ristorante/meal-plan";
import {
  manilaToday,
  reservationPrompt,
} from "@/lib/businesses/restaurant/shared/prompts";
import type { MarinaraDish } from "@/lib/businesses/restaurant/marinara-ristorante/content";
import MarinaraHero from "./MarinaraHero";
import MarinaraGallery from "./MarinaraGallery";
import MarinaraMenu from "./MarinaraMenu";
import MarinaraMealPlanner from "./MarinaraMealPlanner";
import MarinaraConcierge from "./MarinaraConcierge";
import Photo from "./Photo";
import styles from "./MarinaraPage.module.css";

type Detail = {
  title: string;
  src?: string;
  description?: string;
  note?: string;
  dish?: MarinaraDish;
};

export default function MarinaraPage({ business }: BusinessSiteProps) {
  const [stored, setStored] = useState<{ key: string; plan: MealPlan } | null>(
    null,
  );
  const [draft, setDraft] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [party, setParty] = useState("4");
  const [today, setToday] = useState("");
  const [formError, setFormError] = useState("");
  const enquiryRef = useRef<HTMLTextAreaElement>(null);
  const navRef = useRef<HTMLButtonElement>(null);
  const planKey = `${config.mealPlanStoragePrefix}:${business.publicPath}`;
  const plan = stored?.key === planKey ? stored.plan : {};
  const count = summarizePlan(plan).count;

  useEffect(() => {
    let saved: MealPlan = {};
    try {
      saved = sanitizePlan(JSON.parse(sessionStorage.getItem(planKey) || "{}"));
    } catch {
      /* optional */
    }
    setStored({ key: planKey, plan: saved });
    setToday(manilaToday());
  }, [planKey]);
  useEffect(() => {
    if (stored?.key !== planKey) return;
    try {
      sessionStorage.setItem(planKey, JSON.stringify(stored.plan));
    } catch {
      /* optional */
    }
  }, [planKey, stored]);

  function changePlan(update: (current: MealPlan) => MealPlan) {
    setStored((current) => ({
      key: planKey,
      plan: sanitizePlan(update(current?.key === planKey ? current.plan : {})),
    }));
  }
  function ask(prompt?: string) {
    setNavOpen(false);
    if (prompt !== undefined) setDraft(prompt);
    window.requestAnimationFrame(() => {
      document
        .getElementById("marinara-jourvis")
        ?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
          block: "center",
        });
      enquiryRef.current?.focus({ preventScroll: true });
    });
  }
  function addDish(dish: MarinaraDish) {
    changePlan((current) => adjustPlan(current, dish.id, 1));
  }
  function showDish(dish: MarinaraDish) {
    const image =
      namedDishImages[imageLookupKey(dish.printedName)] ??
      namedDishImages[imageLookupKey(dish.name)];
    setDetail({
      title: dish.name,
      src: image,
      description: dish.description,
      note: `${dish.sourceLabel} · ${dish.priceNote}`,
      dish,
    });
  }
  function closeNav() {
    setNavOpen(false);
  }

  if (!isMarinaraBusiness(business))
    return (
      <section className={styles.unavailable}>
        <h1>Restaurant configuration unavailable</h1>
        <p>This page requires Marinara Ristorante’s own demo preset.</p>
      </section>
    );

  const featured = foodGallery.slice(0, 3);
  return (
    <div className={styles.root} data-marinara="true">
      <header
        className={styles.header}
        onKeyDown={(event) => {
          if (event.key === "Escape" && navOpen) {
            closeNav();
            navRef.current?.focus();
          }
        }}
      >
        <div className={styles.headerInner}>
          <a
            href="#marinara-top"
            className={styles.logo}
            aria-label="Marinara Ristorante, back to top"
            onClick={closeNav}
          >
            <Photo
              src={assets.logoClear}
              alt="Marinara Ristorante"
              loading="eager"
            />
          </a>
          <nav
            id="marinara-navigation"
            className={`${styles.nav} ${navOpen ? styles.navOpen : ""}`}
            aria-label="Marinara navigation"
          >
            <a href="#marinara-ritual" onClick={closeNav}>
              The ritual
            </a>
            <a href="#marinara-story" onClick={closeNav}>
              The table
            </a>
            <a href="#marinara-menu" onClick={closeNav}>
              Menu
            </a>
            <a href="#marinara-visit" onClick={closeNav}>
              Visit
            </a>
          </nav>
          <div className={styles.headerActions}>
            <a className={styles.headerPlan} href="#marinara-plan">
              <ShoppingBag size={16} aria-hidden />
              Meal plan · {count}
            </a>
            <button
              className={styles.headerAsk}
              type="button"
              onClick={() => ask()}
            >
              <MessageCircle size={16} aria-hidden />
              Ask Jourvis
            </button>
            <button
              ref={navRef}
              className={styles.mobileMenu}
              type="button"
              aria-label={navOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={navOpen}
              aria-controls="marinara-navigation"
              onClick={() => setNavOpen((value) => !value)}
            >
              {navOpen ? (
                <X size={22} aria-hidden />
              ) : (
                <Menu size={22} aria-hidden />
              )}
            </button>
          </div>
        </div>
      </header>

      <MarinaraHero onAsk={() => ask()} />

      <section
        className={styles.tableRibbon}
        id="marinara-table"
        aria-labelledby="marinara-table-title"
      >
        <div>
          <p className={styles.eyebrow}>Plan the evening</p>
          <h2 id="marinara-table-title">
            A table,
            <br />
            when you’re ready.
          </h2>
        </div>
        <form
          className={styles.tableForm}
          onSubmit={(event) => {
            event.preventDefault();
            const message = reservationPrompt(date, time, party, manilaToday());
            if (!message) {
              setFormError(
                "Choose today or later, a valid time, and 1–40 guests.",
              );
              return;
            }
            setFormError("");
            ask(message);
          }}
        >
          <div className={styles.tableControls}>
            <label>
              Date
              <input
                aria-label="Visit date"
                type="date"
                value={date}
                min={today || undefined}
                required
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              Time
              <input
                aria-label="Visit time"
                type="time"
                value={time}
                required
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
            <label>
              Guests
              <input
                aria-label="Number of guests"
                type="number"
                min={1}
                max={40}
                step={1}
                value={party}
                required
                onChange={(e) => setParty(e.target.value)}
              />
            </label>
            <button className={styles.primary} type="submit">
              <CalendarDays size={16} aria-hidden />
              Prepare enquiry
            </button>
          </div>
          <p className={styles.tableNote}>
            Philippine time · Draft only. No table availability is checked and
            nothing is booked.
          </p>
          {formError ? (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          ) : null}
        </form>
      </section>

      <section
        className={styles.ritual}
        id="marinara-ritual"
        aria-labelledby="marinara-ritual-title"
      >
        <div className={styles.ritualCopy}>
          <p className={styles.eyebrow}>Pasta with a little theatre</p>
          <h2 id="marinara-ritual-title">
            The meal can be
            <br />
            <em>part of the show.</em>
          </h2>
          <p>
            The archived menu separately lists cheese-wheel preparations for
            selected pastas. In this concept, that tableside ritual becomes the
            emotional center of the experience—without pretending it is
            currently available.
          </p>
          <a href="#marinara-menu">
            Browse pasta & cheese-wheel options{" "}
            <ArrowUpRight size={16} aria-hidden />
          </a>
        </div>
        <div className={styles.ritualCollage}>
          <Photo
            className={styles.ritualCover}
            src={assets.cover}
            alt="Marinara supplied cover artwork"
            loading="lazy"
          />
          <Photo
            className={styles.ritualFood}
            src={featured[1].src}
            alt={featured[1].alt}
            loading="lazy"
          />
          <Photo
            className={styles.ritualMark}
            src={assets.brandMark}
            alt="Marinara brand mark"
            loading="lazy"
          />
        </div>
      </section>

      <section
        className={styles.brandStrip}
        aria-label="Marinara supplied branding"
      >
        <div>
          <Photo
            src={assets.logoRed}
            alt="Marinara alternate logo artwork"
            loading="lazy"
          />
        </div>
        <div>
          <p className={styles.eyebrow}>In its own voice</p>
          <h2>
            Buon cibo.
            <br />
            Bella vita.
          </h2>
          <p>
            Warm, familiar, generous—the supplied marks and menu imagery point
            toward a bistro that feels social rather than formal.
          </p>
        </div>
        <div>
          <Photo
            src={assets.logoThumb}
            alt="Marinara supplied social thumbnail artwork"
            loading="lazy"
          />
        </div>
      </section>

      <MarinaraGallery
        onView={(image: MarinaraGalleryImage) =>
          setDetail({
            title: image.label,
            src: image.src,
            note: "Supplied Marinara imagery",
          })
        }
      />

      <section
        className={styles.dining}
        id="marinara-menu"
        aria-labelledby="marinara-menu-title"
      >
        <div className={styles.diningHeading}>
          <div>
            <p className={styles.eyebrow}>Build your table</p>
            <h2 id="marinara-menu-title">
              Pasta, pizza,
              <br />
              <em>and what comes after.</em>
            </h2>
          </div>
          <p>{copy.menuNotice}</p>
        </div>
        <div className={styles.workspace}>
          <MarinaraMenu plan={plan} onAdd={addDish} onView={showDish} />
          <aside className={styles.rail} aria-label="Meal planning and Jourvis">
            <MarinaraMealPlanner
              plan={plan}
              onAdjust={(id, delta) =>
                changePlan((current) => adjustPlan(current, id, delta))
              }
              onClear={() => changePlan(() => ({}))}
              onSample={() =>
                changePlan(() => ({
                  arugula_peach_pecan_solo: 1,
                  shrimp_mushroom_alfredo_cheese_wheel: 1,
                  quattro_formaggi_pizza_12: 1,
                  seafood_marinara_solo: 1,
                }))
              }
              onDiscuss={() => ask(mealPlanPrompt(plan))}
              onPickup={() =>
                ask(
                  `I’d like to prepare a pickup enquiry. ${mealPlanPrompt(plan)} Please confirm pickup arrangements with staff.`,
                )
              }
            />
            <MarinaraConcierge
              business={business}
              draft={draft}
              onDraft={setDraft}
              inputRef={enquiryRef}
            />
          </aside>
        </div>
        <p className={styles.menuFootnote}>
          {marinaraMenuPolicy.priceNotice} {marinaraMenuPolicy.chargesNotice}
        </p>
      </section>

      <section
        className={styles.visit}
        id="marinara-visit"
        aria-labelledby="marinara-visit-title"
      >
        <div className={styles.visitImage}>
          <Photo
            src={assets.interior}
            alt="Marinara dining-room interior"
            loading="lazy"
          />
          <Photo
            className={styles.visitLogo}
            src={assets.motto}
            alt="Buon Cibo Bella Vita"
            loading="lazy"
          />
        </div>
        <div className={styles.visitCopy}>
          <p className={styles.eyebrow}>Find the table</p>
          <h2 id="marinara-visit-title">
            Dinner starts
            <br />
            in Davao.
          </h2>
          <p className={styles.location}>
            <MapPin size={19} aria-hidden />
            <span>{copy.location}</span>
          </p>
          <p>{copy.locationNotice}</p>
          <div className={styles.actions}>
            <a
              className={styles.primary}
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(copy.location)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get directions <ArrowUpRight size={16} aria-hidden />
            </a>
            <a
              className={styles.secondary}
              href={copy.instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram <ArrowUpRight size={16} aria-hidden />
            </a>
            <a
              className={styles.secondary}
              href={copy.facebook}
              target="_blank"
              rel="noopener noreferrer"
            >
              Facebook <ArrowUpRight size={16} aria-hidden />
            </a>
          </div>
          <p className={styles.noHours}>
            Current opening hours have not been verified, so this concept does
            not invent them.
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <Photo
          src={assets.logoClear}
          alt="Marinara Ristorante"
          loading="lazy"
        />
        <div>
          <p>Marinara Ristorante Bistro & Pub</p>
          <p>
            Website concept powered by Jourvis · archived menu data is clearly
            labelled.
          </p>
        </div>
        <div>
          <a href="/">Powered by Jourvis</a>
          <a href="/privacy">Privacy</a>
        </div>
      </footer>

      <div className={styles.mobileDock}>
        <a href="#marinara-plan">
          <ShoppingBag size={17} aria-hidden />
          Meal plan · {count}
        </a>
        <button type="button" onClick={() => ask()}>
          <MessageCircle size={17} aria-hidden />
          Ask Jourvis
        </button>
      </div>

      {detail ? (
        <div
          className={styles.dialogBackdrop}
          role="presentation"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setDetail(null);
          }}
        >
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="marinara-detail-title"
          >
            <button
              className={styles.dialogClose}
              type="button"
              aria-label="Close details"
              onClick={() => setDetail(null)}
            >
              <X size={20} aria-hidden />
            </button>
            {detail.src ? (
              <Photo
                className={styles.dialogImage}
                src={detail.src}
                alt={detail.title}
              />
            ) : (
              <div className={styles.dialogMissing}>
                No supplied dish photograph
              </div>
            )}
            <div className={styles.dialogCopy}>
              <p className={styles.eyebrow}>
                {detail.note || "Marinara selection"}
              </p>
              <h2 id="marinara-detail-title">{detail.title}</h2>
              {detail.description ? <p>{detail.description}</p> : null}
              {detail.dish ? (
                <button
                  className={styles.primary}
                  type="button"
                  disabled={(plan[detail.dish.id] || 0) >= 20}
                  onClick={() => {
                    addDish(detail.dish!);
                    setDetail(null);
                  }}
                >
                  Add to meal plan
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
