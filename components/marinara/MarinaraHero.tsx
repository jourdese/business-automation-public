"use client";
import { ArrowDown, ArrowUpRight, MessageCircle } from "lucide-react";
import { assets, foodGallery } from "./assets";
import { marinaraDesignBrief as copy } from "./website-content";
import Photo from "./Photo";
import styles from "./MarinaraPage.module.css";

export default function MarinaraHero({ onAsk }: { onAsk: () => void }) {
  const pasta = foodGallery.find((item) => item.id === "alfredo") ?? foodGallery[1];
  const pizza = foodGallery.find((item) => item.id === "burrata") ?? foodGallery[7];
  return (
    <section className={styles.hero} id="marinara-top" aria-labelledby="marinara-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{copy.descriptor}</p>
        <Photo
          className={styles.heroLogo}
          src={assets.logoFull}
          alt="Marinara Ristorante"
          loading="eager"
        />
        <h1 id="marinara-title">{copy.proposedHeadline}</h1>
        <p className={styles.heroKicker}>{copy.heroKicker}</p>
        <p className={styles.heroIntro}>{copy.intro}</p>
        <div className={styles.actions}>
          <a className={styles.primary} href="#marinara-menu">
            Explore the menu <ArrowDown size={17} aria-hidden />
          </a>
          <button className={styles.secondary} type="button" onClick={onAsk}>
            <MessageCircle size={17} aria-hidden /> Plan with Jourvis
          </button>
        </div>
        <div className={styles.heroNote}>
          <span>12 photographed favorites · QR ordering at your table</span>
          <a href="#marinara-visit">
            Davao City <ArrowUpRight size={14} aria-hidden />
          </a>
        </div>
      </div>
      <div className={styles.heroVisual} aria-label="Marinara food and restaurant imagery">
        <figure className={styles.heroMain}>
          <Photo src={assets.interior} alt="Marinara dining room" loading="eager" />
          <figcaption>Warm tables, easy evenings.</figcaption>
        </figure>
        <figure className={styles.heroFoodA}>
          <Photo src={pasta.src} alt={pasta.alt} loading="eager" />
        </figure>
        <figure className={styles.heroFoodB}>
          <Photo src={pizza.src} alt={pizza.alt} loading="eager" />
        </figure>
        <Photo
          className={styles.heroMotto}
          src={assets.motto}
          alt="Buon Cibo Bella Vita"
          loading="eager"
        />
      </div>
    </section>
  );
}
