import type { CSSProperties, ReactNode } from 'react';
import { RIB_HERO } from '@/lib/rib-crib/assets/hero';
import { RIB_INTERIOR } from '@/lib/rib-crib/assets/interior';
import { RIB_MENU } from '@/lib/rib-crib/assets/menu';

type RouteParams = { vertical: string; business: string };
type Props = { children: ReactNode; params: Promise<RouteParams> | RouteParams };

const RIB_CRIB_OVERRIDES = `
.rib-crib-page .rib-hero-food {
  background-image: var(--rib-hero-hires, url('/rib-crib/hero.webp')) !important;
  background-size: cover !important;
  background-position: center center !important;
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
    var(--rib-interior-hires, url('/rib-crib/interior.webp')) !important;
  background-size: cover !important;
  background-position: center !important;
  image-rendering: auto;
}
.rib-crib-page .rib-reservation-panel {
  background:
    linear-gradient(90deg, rgba(255,255,255,.985) 0%, rgba(255,255,255,.96) 68%, rgba(255,255,255,.36) 100%),
    var(--rib-interior-hires, url('/rib-crib/interior.webp')) right center / 48% 100% no-repeat !important;
}
.rib-crib-page .rib-about-photo {
  background-image:
    linear-gradient(90deg, transparent 70%, #ece1d2 100%),
    var(--rib-interior-hires, url('/rib-crib/interior.webp')) !important;
  background-size: cover !important;
  background-position: center !important;
  image-rendering: auto;
}
.rib-crib-page .rib-orders-panel {
  background:
    linear-gradient(90deg, rgba(255,255,255,.985) 0%, rgba(255,255,255,.95) 64%, rgba(255,255,255,.42) 100%),
    var(--rib-hero-hires, url('/rib-crib/hero.webp')) right center / 50% 100% no-repeat !important;
}
.rib-crib-page .rib-menu-photo {
  background-image: var(--rib-menu-hires, url('/rib-crib/menu-sprite.webp')) !important;
  background-size: 800% 100% !important;
  background-repeat: no-repeat !important;
  image-rendering: auto;
}
.rib-crib-page .rib-platter-photo {
  background-size: 500% 100% !important;
  background-repeat: no-repeat !important;
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
        '--rib-hero-hires': `url("${RIB_HERO}")`,
        '--rib-interior-hires': `url("${RIB_INTERIOR}")`,
        '--rib-menu-hires': `url("${RIB_MENU}")`,
      } as CSSProperties)
    : undefined;

  return (
    <div style={style}>
      {isRibCrib ? <style dangerouslySetInnerHTML={{ __html: RIB_CRIB_OVERRIDES }} /> : null}
      {children}
    </div>
  );
}
