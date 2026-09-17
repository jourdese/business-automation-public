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

const ingredientColors: Record<string, string> = {
  pasta: "#E9B94E",
  tomato: "#F05A47",
  "olive-oil": "#B6B94A",
  flour: "#E8D6A4",
  parmesan: "#F0C85C",
  mozzarella: "#F5F0D8",
  cream: "#DCEAF0",
  shrimp: "#F18468",
  salmon: "#F17870",
  squid: "#79C5C9",
  basil: "#78C879",
  mushroom: "#C49A72",
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
  const color = ingredientColors[stockId] ?? "#A7E3C5";

  return (
    <span className={className} aria-hidden="true" style={{ color }}>
      <Icon size={size} strokeWidth={1.9} />
    </span>
  );
}
