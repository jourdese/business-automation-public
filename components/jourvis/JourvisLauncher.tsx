"use client";

import { useState, type CSSProperties, type Ref } from "react";
import { palette } from "@/lib/jourvis/config";
import JourvisCompanion from "./JourvisCompanion";
import styles from "./JourvisLauncher.module.css";

type JourvisLauncherProps = {
  open: boolean;
  onOpen: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
  controls?: string;
  label?: string;
  hint?: string;
};

// Keep the decoration inside the dock, not scattered across the client website.
const BITS = [
  { x: "22%", y: "23%", delay: "-1s", color: palette.mint },
  { x: "74%", y: "27%", delay: "-3s", color: palette.gold },
  { x: "17%", y: "62%", delay: "-5s", color: palette.emerald },
  { x: "77%", y: "68%", delay: "-2s", color: palette.mint },
  { x: "46%", y: "13%", delay: "-4s", color: palette.ivory },
  { x: "36%", y: "82%", delay: "-6s", color: palette.gold },
];

/** A compact chat trigger. The mascot remains a separate, reusable visual. */
export default function JourvisLauncher({
  open,
  onOpen,
  buttonRef,
  controls,
  label = "Chat with Jourvis",
  hint = "A little help, right here.",
}: JourvisLauncherProps) {
  const [tooltipDismissed, setTooltipDismissed] = useState(false);
  const theme = {
    "--dock-ink": palette.ink,
    "--dock-navy": palette.navy,
    "--dock-emerald": palette.emerald,
    "--dock-mint": palette.mint,
    "--dock-gold": palette.gold,
    "--dock-ivory": palette.ivory,
  } as CSSProperties;

  return (
    <button
      ref={buttonRef}
      className={styles.launcher}
      style={theme}
      type="button"
      data-open={open}
      data-tooltip-dismissed={tooltipDismissed}
      aria-label={label}
      aria-expanded={open}
      aria-controls={open ? controls : undefined}
      onClick={onOpen}
      onPointerEnter={() => setTooltipDismissed(false)}
      onFocus={() => setTooltipDismissed(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setTooltipDismissed(true);
      }}
    >
      <span className={styles.dock} aria-hidden="true">
        <span className={styles.rim} />
        <span className={styles.bits}>
          {BITS.map((bit, index) => (
            <i
              key={index}
              className={styles.bit}
              style={
                {
                  "--bit-x": bit.x,
                  "--bit-y": bit.y,
                  "--bit-delay": bit.delay,
                  "--bit-color": bit.color,
                } as CSSProperties
              }
            />
          ))}
        </span>
        <span className={styles.mascot}>
          <JourvisCompanion size={56} molecules={false} />
        </span>
        {/* A brand accent, not an unverified "online" indicator. */}
        <span className={styles.accent} />
      </span>
      <span className={styles.tooltip} aria-hidden="true">
        <strong>Ask Jourvis</strong>
        <small>{hint}</small>
      </span>
    </button>
  );
}
