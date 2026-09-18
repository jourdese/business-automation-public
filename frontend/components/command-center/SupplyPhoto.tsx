/// <reference types="vite/client" />

import basil from "@/src/assets/businesses/sharedicon/basil.png?url";
import cookingCream from "@/src/assets/businesses/sharedicon/cooking cream.png?url";
import mozzarella from "@/src/assets/businesses/sharedicon/mozzarella.png?url";
import mushrooms from "@/src/assets/businesses/sharedicon/mushrooms.png?url";
import oliveOil from "@/src/assets/businesses/sharedicon/olive oil.png?url";
import parmigiano from "@/src/assets/businesses/sharedicon/parmigiano cheese.png?url";
import pasta from "@/src/assets/businesses/sharedicon/pasta.png?url";
import pizzaFlour from "@/src/assets/businesses/sharedicon/pizza flour.png?url";
import salmon from "@/src/assets/businesses/sharedicon/salmon.png?url";
import shrimp from "@/src/assets/businesses/sharedicon/shrimp.png?url";
import squid from "@/src/assets/businesses/sharedicon/squid.png?url";
import tomatoSauce from "@/src/assets/businesses/sharedicon/tomato sauce.png?url";

const supplyPhotos: Record<string, string> = {
  pasta,
  tomato: tomatoSauce,
  "olive-oil": oliveOil,
  flour: pizzaFlour,
  parmesan: parmigiano,
  mozzarella,
  cream: cookingCream,
  shrimp,
  salmon,
  squid,
  basil,
  mushroom: mushrooms,
};

export default function SupplyPhoto({
  supplyId,
  className,
  size = 48,
}: {
  supplyId: string;
  className?: string;
  size?: number;
}) {
  const src = supplyPhotos[supplyId];

  if (!src) {
    return (
      <span
        className={className}
        aria-hidden="true"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span className={className} aria-hidden="true">
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        draggable={false}
        decoding="async"
      />
    </span>
  );
}
