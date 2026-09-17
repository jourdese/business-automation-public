import { ArrowUpRight } from 'lucide-react';
import { assets } from '@/lib/businesses/restaurant/the-wild-tree/assets';
import { websiteContent as copy } from '@/lib/businesses/restaurant/the-wild-tree/website-content';
import Photo from './Photo';
import styles from './WildTreePage.module.css';
export type GalleryImage = { title: string; src: string; alt: string };
export default function WildTreeExperience({ onView }: { onView: (image: GalleryImage) => void }) {
  const gallery: GalleryImage[] = [
    { title: 'Something to share', src: assets.table, alt: 'A table set with Thai and Filipino-inspired dishes — supplied illustrative artwork' },
    { title: 'A warm welcome', src: assets.detail, alt: 'Pendant lighting and warm restaurant detailing — supplied illustrative artwork' },
    { title: 'One more conversation', src: assets.cocktails, alt: 'A lineup of drinks at the bar — supplied illustrative artwork' },
  ];
  return <section className={styles.experience} id="wild-tree-experience" aria-labelledby="wild-tree-experience-title">
    <div className={styles.experienceCopy}>
      <p className={styles.eyebrow}>Around the table</p>
      <h2 id="wild-tree-experience-title">{copy.experience.heading}</h2>
      <p>{copy.experience.description}</p>
      <Photo src={assets.emblem} alt="" aria-hidden width={96} height={96} className={styles.experienceEmblem} />
    </div>
    <div className={styles.experienceGallery}>{gallery.map((image, index) => <figure key={image.title} className={index === 0 ? styles.galleryWide : styles.galleryTall}>
      <button type="button" onClick={() => onView(image)} aria-label={`View ${image.title} artwork`}><Photo src={image.src} alt={image.alt} loading="lazy" width={index === 0 ? 1672 : 1122} height={index === 0 ? 941 : 1402} /><span className={styles.photoZoom}><ArrowUpRight size={18} aria-hidden /></span></button>
      <figcaption>{image.title}</figcaption>
    </figure>)}</div>
  </section>;
}
