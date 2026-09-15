/// <reference types="vite/client" />

import type { CSSProperties, ReactNode } from 'react';
import ribHero from '@/src/assets/rib-crib/rib-crib-hero-bbq-wings.png';
import ribInterior from '@/src/assets/rib-crib/rib-crib-restaurant-interior.png';
import ribWood from '@/src/assets/rib-crib/rib-crib-dark-wood-background.png';
import ribOrders from '@/src/assets/rib-crib/rib-crib-orders-bbq-background.png';
import ribEmblem from '@/src/assets/rib-crib/rib-crib-emblem.png';
import ribFooterBrand from '@/src/assets/rib-crib/rib-crib-footer-brand-lockup.png';
import ribFries from '@/src/assets/rib-crib/rib-crib-plain-fries.png';
import ribSalad from '@/src/assets/rib-crib/rib-crib-salad.png';
import ribSisigTacos from '@/src/assets/rib-crib/rib-crib-sisig-tacos.png';
import ribWings6 from '@/src/assets/rib-crib/rib-crib-chicken-wings-6pcs.png';
import ribBarbecueRibs from '@/src/assets/rib-crib/rib-crib-barbecue-ribs-2pcs.png';
import ribUnlimitedWings from '@/src/assets/rib-crib/rib-crib-unlimited-wings.png';
import ribJuice from '@/src/assets/rib-crib/rib-crib-juice.png';
import ribIcedTea from '@/src/assets/rib-crib/rib-crib-iced-tea.png';
import ribPlatter from '@/src/assets/rib-crib/rib-crib-platter.png';
import ribPlatterWithRibs from '@/src/assets/rib-crib/rib-crib-platter-with-ribs.png';
import ribBarkadaPlatter from '@/src/assets/rib-crib/rib-crib-barkada-platter.png';
import ribBbqRibsPlatter from '@/src/assets/rib-crib/rib-crib-bbq-ribs-platter.png';
import ribMegaPlatter from '@/src/assets/rib-crib/rib-crib-mega-platter.png';

type RouteParams = { vertical: string; business: string };
type Props = { children: ReactNode; params: Promise<RouteParams> | RouteParams };

// Keep the original uploaded Rib Crib artwork scoped to the dedicated restaurant route.
const RIB_CRIB_OVERRIDES = `
.rib-crib-page .rib-hero-food {
  background-image: var(--rib-hero-original) !important;
  background-size: cover !important;
  background-position: center center !important;
  image-rendering: auto;
}
.rib-crib-page .rib-hero-emblem {
  content: var(--rib-emblem-original);
  object-fit: contain;
  image-rendering: auto;
}
.rib-crib-page .rib-hero h1 {
  display: block !important;
  margin: 7px 0 0;
  color: #fff;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(58px, 6.8vw, 102px);
  font-weight: 900;
  line-height: .78;
  letter-spacing: -.055em;
  text-shadow: 0 5px 0 rgba(0,0,0,.28), 0 18px 35px rgba(0,0,0,.28);
}
.rib-crib-page .rib-feature-interior {
  background-image:
    linear-gradient(90deg, rgba(255,255,255,.04), transparent 20%),
    var(--rib-interior-original) !important;
  background-size: cover !important;
  background-position: center !important;
  image-rendering: auto;
}
.rib-crib-page .rib-reservation-panel {
  background:
    linear-gradient(90deg, rgba(255,255,255,.985) 0%, rgba(255,255,255,.96) 68%, rgba(255,255,255,.36) 100%),
    var(--rib-interior-original) right center / 48% 100% no-repeat !important;
}
.rib-crib-page .rib-about-photo {
  background-image:
    linear-gradient(90deg, transparent 70%, #ece1d2 100%),
    var(--rib-interior-original) !important;
  background-size: cover !important;
  background-position: center !important;
  image-rendering: auto;
}
.rib-crib-page .rib-orders-panel {
  background:
    linear-gradient(90deg, rgba(255,255,255,.985) 0%, rgba(255,255,255,.95) 64%, rgba(255,255,255,.42) 100%),
    var(--rib-orders-original) right center / 50% 100% no-repeat !important;
}
.rib-crib-page .rib-menu-section {
  background-image:
    linear-gradient(rgba(24,12,8,.82), rgba(24,12,8,.86)),
    var(--rib-wood-original) !important;
  background-size: cover !important;
  background-position: center !important;
}
.rib-crib-page .rib-menu-photo,
.rib-crib-page .rib-platter-photo {
  background-size: cover !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
  image-rendering: auto;
}
.rib-crib-page .rib-menu-card:nth-child(1) .rib-menu-photo { background-image: var(--rib-menu-fries) !important; }
.rib-crib-page .rib-menu-card:nth-child(2) .rib-menu-photo { background-image: var(--rib-menu-salad) !important; }
.rib-crib-page .rib-menu-card:nth-child(3) .rib-menu-photo { background-image: var(--rib-menu-sisig) !important; }
.rib-crib-page .rib-menu-card:nth-child(4) .rib-menu-photo { background-image: var(--rib-menu-wings6) !important; }
.rib-crib-page .rib-menu-card:nth-child(5) .rib-menu-photo { background-image: var(--rib-menu-ribs) !important; }
.rib-crib-page .rib-menu-card:nth-child(6) .rib-menu-photo { background-image: var(--rib-menu-unli-wings) !important; }
.rib-crib-page .rib-menu-card:nth-child(7) .rib-menu-photo { background-image: var(--rib-menu-juice) !important; }
.rib-crib-page .rib-menu-card:nth-child(8) .rib-menu-photo { background-image: var(--rib-menu-iced-tea) !important; }
.rib-crib-page .rib-platter-card:nth-child(1) .rib-platter-photo { background-image: var(--rib-platter) !important; }
.rib-crib-page .rib-platter-card:nth-child(2) .rib-platter-photo { background-image: var(--rib-platter-ribs) !important; }
.rib-crib-page .rib-platter-card:nth-child(3) .rib-platter-photo { background-image: var(--rib-barkada) !important; }
.rib-crib-page .rib-platter-card:nth-child(4) .rib-platter-photo { background-image: var(--rib-bbq-ribs-platter) !important; }
.rib-crib-page .rib-platter-card:nth-child(5) .rib-platter-photo { background-image: var(--rib-mega-platter) !important; }
.rib-crib-page .rib-footer-brand img {
  content: var(--rib-footer-brand-original);
  object-fit: contain;
  image-rendering: auto;
}
.rib-crib-page .rib-menu-card,
.rib-crib-page .rib-platter-card {
  backface-visibility: hidden;
  transform: translateZ(0);
}
@media (max-width: 760px) {
  .rib-crib-page .rib-hero h1 {
    font-size: clamp(54px, 17vw, 82px);
  }
  .rib-crib-page .rib-reservation-panel,
  .rib-crib-page .rib-orders-panel {
    background-size: cover !important;
  }
}
`;

export default async function PublicBusinessLayout({ children, params }: Props) {
  const { vertical, business } = await params;
  const isRibCrib = vertical === 'restaurant' && business === 'the-rib-crib';
  const style = isRibCrib
    ? ({
        '--rib-hero-original': `url("${ribHero}")`,
        '--rib-interior-original': `url("${ribInterior}")`,
        '--rib-wood-original': `url("${ribWood}")`,
        '--rib-orders-original': `url("${ribOrders}")`,
        '--rib-emblem-original': `url("${ribEmblem}")`,
        '--rib-footer-brand-original': `url("${ribFooterBrand}")`,
        '--rib-menu-fries': `url("${ribFries}")`,
        '--rib-menu-salad': `url("${ribSalad}")`,
        '--rib-menu-sisig': `url("${ribSisigTacos}")`,
        '--rib-menu-wings6': `url("${ribWings6}")`,
        '--rib-menu-ribs': `url("${ribBarbecueRibs}")`,
        '--rib-menu-unli-wings': `url("${ribUnlimitedWings}")`,
        '--rib-menu-juice': `url("${ribJuice}")`,
        '--rib-menu-iced-tea': `url("${ribIcedTea}")`,
        '--rib-platter': `url("${ribPlatter}")`,
        '--rib-platter-ribs': `url("${ribPlatterWithRibs}")`,
        '--rib-barkada': `url("${ribBarkadaPlatter}")`,
        '--rib-bbq-ribs-platter': `url("${ribBbqRibsPlatter}")`,
        '--rib-mega-platter': `url("${ribMegaPlatter}")`,
      } as CSSProperties)
    : undefined;

  return (
    <div style={style}>
      {isRibCrib ? <style dangerouslySetInnerHTML={{ __html: RIB_CRIB_OVERRIDES }} /> : null}
      {children}
    </div>
  );
}
