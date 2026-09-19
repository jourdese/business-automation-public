import { botPixels } from "@/lib/jourvis/config";

const paths = [1, 2, 3].map((value) =>
  botPixels
    .flatMap((row, y) =>
      row.split("").flatMap((cell, x) => (+cell === value ? [`M${x * 10} ${y * 10}h8v8h-8Z`] : [])),
    )
    .join(" "),
);

/** The same silhouette at every size; no second character design. */
export default function CompanionMark({
  className = "companion-mark",
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="-12 -12 164 164"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path d={paths[0]} fill="#2e6b57" />
      <path d={paths[1]} fill="#a7e3c5" />
      <path d={paths[2]} fill="#f7f4ee" />
    </svg>
  );
}
