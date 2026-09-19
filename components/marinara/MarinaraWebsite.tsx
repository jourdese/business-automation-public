"use client";
// Preserve the original Marinara editorial layout; ordering is supplied as a separate menu slot.
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Menu,
  MessageCircle,
  ShoppingBag,
  X,
} from "lucide-react";
import { assets, foodGallery, type MarinaraGalleryImage } from "./assets";
import { marinaraDesignBrief as copy } from "./website-content";
import { manilaToday, reservationPrompt } from "./prompts";
import MarinaraHero from "./MarinaraHero";
import MarinaraGallery from "./MarinaraGallery";
import Photo from "./Photo";
import styles from "./MarinaraPage.module.css";
export default function MarinaraWebsite({
  children,
  count,
  onBasket,
  onAsk,
}: {
  children: ReactNode;
  count: number;
  onBasket: () => void;
  onAsk: (draft?: string) => void;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [detail, setDetail] = useState<{ title: string; src: string; note: string } | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [party, setParty] = useState("4");
  const [today, setToday] = useState("");
  const [formError, setFormError] = useState("");
  const navRef = useRef<HTMLButtonElement>(null);
  const detailRef = useRef<HTMLDialogElement>(null);
  useEffect(() => setToday(manilaToday()), []);
  useEffect(() => {
    if (detail) detailRef.current?.showModal();
    else detailRef.current?.close();
  }, [detail]);
  function closeNav() {
    setNavOpen(false);
  }
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
            <Photo src={assets.logoClear} alt="Marinara Ristorante" loading="eager" />
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
            <button className={styles.headerPlan} type="button" onClick={onBasket}>
              <ShoppingBag size={16} aria-hidden />
              Your table · {count}
            </button>
            <button className={styles.headerAsk} type="button" onClick={() => onAsk()}>
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
              {navOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
            </button>
          </div>
        </div>
      </header>

      <main id="main">
        <MarinaraHero onAsk={() => onAsk()} />

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
                setFormError("Choose today or later, a valid time, and 1–40 guests.");
                return;
              }
              setFormError("");
              onAsk(message);
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
              Philippine time · Draft only. No table availability is checked and nothing is booked.
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
              The archived menu separately lists cheese-wheel preparations for selected pastas. In
              this concept, that tableside ritual becomes the emotional center of the
              experience—without pretending it is currently available.
            </p>
            <a href="#marinara-menu">
              Browse pasta & cheese-wheel options <ArrowUpRight size={16} aria-hidden />
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

        <section className={styles.brandStrip} aria-label="Marinara supplied branding">
          <div>
            <Photo src={assets.logoRed} alt="Marinara alternate logo artwork" loading="lazy" />
          </div>
          <div>
            <p className={styles.eyebrow}>In its own voice</p>
            <h2>
              Buon cibo.
              <br />
              Bella vita.
            </h2>
            <p>
              Warm, familiar, generous—the supplied marks and menu imagery point toward a bistro
              that feels social rather than formal.
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

        {children}

        <section
          className={styles.visit}
          id="marinara-visit"
          aria-labelledby="marinara-visit-title"
        >
          <div className={styles.visitImage}>
            <Photo src={assets.interior} alt="Marinara dining-room interior" loading="lazy" />
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
              Current opening hours have not been verified, so this concept does not invent them.
            </p>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <Photo src={assets.logoClear} alt="Marinara Ristorante" loading="lazy" />
        <div>
          <p>Marinara Ristorante Bistro & Pub</p>
          <p>Website concept powered by Jourvis · sample menu and QR ordering demo.</p>
        </div>
        <div>
          <a href="/">Powered by Jourvis</a>
          <a href="/privacy">Privacy</a>
        </div>
      </footer>

      <div className={styles.mobileDock}>
        <button type="button" onClick={onBasket}>
          <ShoppingBag size={17} aria-hidden />
          Your table · {count}
        </button>
        <button type="button" onClick={() => onAsk()}>
          <MessageCircle size={17} aria-hidden />
          Ask Jourvis
        </button>
      </div>

      <dialog
        ref={detailRef}
        className={styles.photoDialog}
        onCancel={() => setDetail(null)}
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
        {detail && (
          <>
            <Photo className={styles.dialogImage} src={detail.src} alt={detail.title} />
            <div className={styles.dialogCopy}>
              <h2 id="marinara-detail-title">{detail.title}</h2>
              <p>{detail.note}</p>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
