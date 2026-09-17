"use client";
import {
  foodGallery,
  type MarinaraGalleryImage,
} from "@/lib/businesses/restaurant/marinara-ristorante/assets";
import Photo from "./Photo";
import styles from "./MarinaraPage.module.css";

export default function MarinaraGallery({
  onView,
}: {
  onView: (image: MarinaraGalleryImage) => void;
}) {
  return (
    <section
      className={styles.gallerySection}
      id="marinara-story"
      aria-labelledby="marinara-story-title"
    >
      <div className={styles.galleryHeading}>
        <p className={styles.eyebrow}>The table tells the story</p>
        <h2 id="marinara-story-title">
          Comfort,
          <br />
          <em>with a little drama.</em>
        </h2>
        <p>
          Every supplied Marinara image is part of this concept—pasta, pizza,
          sweets, drinks, shared sets and the room itself.
        </p>
      </div>
      <div className={styles.galleryRail} aria-label="Marinara food gallery">
        {foodGallery.map((image, index) => (
          <figure
            key={image.id}
            className={index % 5 === 0 ? styles.galleryLarge : ""}
          >
            <button
              type="button"
              onClick={() => onView(image)}
              aria-label={`View ${image.label}`}
            >
              <Photo src={image.src} alt={image.alt} loading="lazy" />
            </button>
            <figcaption>{image.label}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
