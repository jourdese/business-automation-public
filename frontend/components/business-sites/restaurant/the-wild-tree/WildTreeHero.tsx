import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { assets } from '@/lib/businesses/restaurant/the-wild-tree/assets';
import { websiteContent as copy } from '@/lib/businesses/restaurant/the-wild-tree/website-content';
import Photo from './Photo';
import styles from './WildTreePage.module.css';
export default function WildTreeHero({ onAsk }: { onAsk: () => void }) {
  return <section className={styles.hero} id="wild-tree-top" aria-labelledby="wild-tree-title">
    <Photo className={styles.heroImage} src={assets.hero} alt="Warm timber, pendant lighting and the dining room — supplied atmosphere artwork" width={1672} height={941} fetchPriority="high" loading="eager" />
    <div className={styles.heroShade} />
    <div className={styles.heroCopy}>
      <p className={styles.eyebrow}>{copy.hero.eyebrow}</p>
      <h1 id="wild-tree-title">{copy.hero.firstLine}<br /><em>{copy.hero.secondLine}</em></h1>
      <p className={styles.heroDescription}>{copy.hero.description}</p>
      <div className={styles.actions}>
        <a className={styles.primary} href="#wild-tree-menu">Explore the menu <ArrowDown size={17} aria-hidden /></a>
        <button className={styles.lightButton} type="button" onClick={onAsk}>Plan with Jourvis <ArrowUpRight size={17} aria-hidden /></button>
      </div>
    </div>
    <div className={styles.heroBottom}><span>Azuela Cove, Davao City</span><span>A Jourvis website concept</span></div>
  </section>;
}
