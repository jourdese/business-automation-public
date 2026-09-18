/// <reference types="vite/client" />

import marinaraLogo from "@/src/assets/businesses/restaurant/marinara-ristorante/branding/marinara-buon-cibo-logo-orange.png?url";
import ribCribLogo from "@/src/assets/businesses/restaurant/the-rib-crib/branding/rib-crib-profile.png?url";

const businessMarks: Record<string, string> = {
  "marinara-ristorante": marinaraLogo,
  "rib-crib": ribCribLogo,
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function BusinessBrandMark({
  businessId,
  businessName,
  className,
}: {
  businessId: string;
  businessName: string;
  className?: string;
}) {
  const src = businessMarks[businessId];

  if (!src) {
    return (
      <span className={className} aria-hidden="true">
        <b>{initials(businessName)}</b>
      </span>
    );
  }

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
