/// <reference types="vite/client" />

import grilledSalmon from "@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-Grilled Salmon Fillet.jpg?url";
import quattroFormaggi from "@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-Quattro Formaggi Pizza.jpg?url";
import seafoodMarinara from "@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-Seafood Marinara.jpg?url";
import shrimpAlfredo from "@/src/assets/businesses/restaurant/marinara-ristorante/food/marinara-menu-Shrimp & Mushroom Alfredo.jpg?url";

const menuPhotos: Record<string, string> = {
  "seafood-marinara": seafoodMarinara,
  "shrimp-alfredo": shrimpAlfredo,
  quattro: quattroFormaggi,
  salmon: grilledSalmon,
};

export default function MenuPhoto({
  menuId,
  className,
}: {
  menuId: string;
  className?: string;
}) {
  const src = menuPhotos[menuId];

  if (!src) return <span className={className} aria-hidden="true" />;

  return (
    <span className={className} aria-hidden="true">
      <img
        src={src}
        alt=""
        draggable={false}
        decoding="async"
      />
    </span>
  );
}
