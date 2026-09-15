/// <reference types="vite/client" />
'use client';

import { useEffect } from 'react';

import ribHero from '@/src/assets/rib-crib/rib-crib-hero-bbq-wings.png?url';
import ribInterior from '@/src/assets/rib-crib/rib-crib-restaurant-interior.png?url';
import ribWood from '@/src/assets/rib-crib/rib-crib-dark-wood-background.png?url';
import ribOrders from '@/src/assets/rib-crib/rib-crib-orders-bbq-background.png?url';
import ribEmblem from '@/src/assets/rib-crib/rib-crib-emblem.png?url';
import ribFooterBrand from '@/src/assets/rib-crib/rib-crib-footer-brand-lockup.png?url';
import ribWordmark from '@/src/assets/rib-crib/TheRibCribWhite.png?url';
import ribEatMeatRepeat from '@/src/assets/rib-crib/eat-meat-repeat.png?url';
import ribGoodFood from '@/src/assets/rib-crib/rib-crib-good-food-good-people.png?url';
import ribSignatureIcon from '@/src/assets/rib-crib/rib-crib-icon-signature-flavors.png?url';
import ribFries from '@/src/assets/rib-crib/rib-crib-plain-fries.png?url';
import ribSalad from '@/src/assets/rib-crib/rib-crib-salad.png?url';
import ribSisigTacos from '@/src/assets/rib-crib/rib-crib-sisig-tacos.png?url';
import ribWings6 from '@/src/assets/rib-crib/rib-crib-chicken-wings-6pcs.png?url';
import ribBarbecueRibs from '@/src/assets/rib-crib/rib-crib-barbecue-ribs-2pcs.png?url';
import ribUnlimitedWings from '@/src/assets/rib-crib/rib-crib-unlimited-wings.png?url';
import ribJuice from '@/src/assets/rib-crib/rib-crib-juice.png?url';
import ribIcedTea from '@/src/assets/rib-crib/rib-crib-iced-tea.png?url';
import ribPlatter from '@/src/assets/rib-crib/rib-crib-platter.png?url';
import ribPlatterWithRibs from '@/src/assets/rib-crib/rib-crib-platter-with-ribs.png?url';
import ribBarkadaPlatter from '@/src/assets/rib-crib/rib-crib-barkada-platter.png?url';
import ribBbqRibsPlatter from '@/src/assets/rib-crib/rib-crib-bbq-ribs-platter.png?url';
import ribMegaPlatter from '@/src/assets/rib-crib/rib-crib-mega-platter.png?url';

const menuImages = [
  ribFries,
  ribSalad,
  ribSisigTacos,
  ribWings6,
  ribBarbecueRibs,
  ribUnlimitedWings,
  ribJuice,
  ribIcedTea,
];

const platterImages = [
  ribPlatter,
  ribPlatterWithRibs,
  ribBarkadaPlatter,
  ribBbqRibsPlatter,
  ribMegaPlatter,
];

const cssUrl = (value: string) => `url("${value.replaceAll('"', '\\"')}")`;

export default function RibCribAssetBridge() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>('.rib-crib-page');
    if (!page) return;

    const setStyle = (selector: string, property: string, value: string) => {
      const element = page.querySelector<HTMLElement>(selector);
      element?.style.setProperty(property, value, 'important');
    };

    const setImage = (selector: string, value: string) => {
      const image = page.querySelector<HTMLImageElement>(selector);
      if (image) image.src = value;
    };

    setStyle('.rib-wordmark', 'background-image', cssUrl(ribWordmark));
    setStyle('.rib-hero-food', 'background-image', cssUrl(ribHero));
    setImage('.rib-hero-emblem', ribEmblem);
    setImage('.rib-hero-tagline-img', ribEatMeatRepeat);
    setStyle('.rib-hero-script', 'background-image', cssUrl(ribGoodFood));
    setStyle('.rib-feature-strip article:first-child > span', 'background-image', cssUrl(ribSignatureIcon));
    setStyle(
      '.rib-feature-interior',
      'background-image',
      `linear-gradient(90deg, rgba(255,255,255,.12), transparent 30%), ${cssUrl(ribInterior)}`,
    );
    setStyle(
      '.rib-menu-section',
      'background-image',
      `linear-gradient(rgba(18,11,8,.58), rgba(18,11,8,.76)), ${cssUrl(ribWood)}`,
    );

    page.querySelectorAll<HTMLElement>('.rib-menu-photo').forEach((element, index) => {
      const image = menuImages[index];
      if (!image) return;
      element.style.setProperty('background-image', cssUrl(image), 'important');
      element.style.setProperty('background-size', 'cover', 'important');
      element.style.setProperty('background-position', 'center', 'important');
      element.style.setProperty('background-repeat', 'no-repeat', 'important');
    });

    page.querySelectorAll<HTMLElement>('.rib-platter-photo').forEach((element, index) => {
      const image = platterImages[index];
      if (!image) return;
      element.style.setProperty('background-image', cssUrl(image), 'important');
      element.style.setProperty('background-size', 'cover', 'important');
      element.style.setProperty('background-position', 'center', 'important');
      element.style.setProperty('background-repeat', 'no-repeat', 'important');
    });

    setStyle(
      '.rib-reservation-panel',
      'background',
      `linear-gradient(90deg, rgba(255,255,255,.12) 0 112px, #fff 112px), ${cssUrl(ribInterior)} left center / 112px 100% no-repeat`,
    );
    setStyle(
      '.rib-orders-panel',
      'background',
      `linear-gradient(90deg, #fff 0%, #fff 72%, rgba(255,255,255,.28) 100%), ${cssUrl(ribOrders)} right center / 42% 100% no-repeat`,
    );
    setStyle(
      '.rib-about-photo',
      'background-image',
      `linear-gradient(90deg, transparent 70%, #ece1d2 100%), ${cssUrl(ribInterior)}`,
    );
    setImage('.rib-footer-brand img', ribFooterBrand);
  }, []);

  return null;
}
