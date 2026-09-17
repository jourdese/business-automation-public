import {
  Cherry,
  CookingPot,
  Droplets,
  Fish,
  Leaf,
  Milk,
  Sprout,
  Wheat,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  pasta: CookingPot,
  tomato: Cherry,
  "olive-oil": Droplets,
  flour: Wheat,
  parmesan: Milk,
  mozzarella: Milk,
  cream: Milk,
  shrimp: Fish,
  salmon: Fish,
  squid: Fish,
  basil: Leaf,
  mushroom: Sprout,
};

export default function StockIcon({
  stockId,
  className,
  size = 22,
}: {
  stockId: string;
  className?: string;
  size?: number;
}) {
  const Icon = icons[stockId] ?? CookingPot;

  return (
    <span className={className} aria-hidden="true">
      <Icon size={size} strokeWidth={1.8} />
    </span>
  );
}
