"use client";

import type { CSSProperties } from "react";
import { botPixels, palette } from "@/lib/jourvis/config";
import styles from "./JourvisCompanion.module.css";

type JourvisCompanionProps = {
  size?: number;
  molecules?: boolean;
  className?: string;
  title?: string;
};

const paths = [1, 2, 3].map((value) =>
  botPixels
    .flatMap((row, y) =>
      row.split("").flatMap((cell, x) => (+cell === value ? [`M${x * 10} ${y * 10}h8v8h-8Z`] : [])),
    )
    .join(" "),
);

const MOLECULES = [
  { x: "7%", y: "24%", s: 3, d: "-.2s", t: "3.4s", c: palette.mint },
  { x: "18%", y: "72%", s: 2, d: "-1.4s", t: "3.8s", c: palette.emerald },
  { x: "29%", y: "8%", s: 4, d: "-2.1s", t: "4.1s", c: palette.gold },
  { x: "41%", y: "88%", s: 2, d: "-.8s", t: "3.6s", c: palette.mint },
  { x: "53%", y: "2%", s: 2, d: "-2.8s", t: "4.4s", c: palette.ivory },
  { x: "67%", y: "82%", s: 3, d: "-1.1s", t: "3.9s", c: palette.emerald },
  { x: "78%", y: "16%", s: 4, d: "-3.1s", t: "4.2s", c: palette.mint },
  { x: "92%", y: "55%", s: 2, d: "-.5s", t: "3.5s", c: palette.gold },
  { x: "11%", y: "48%", s: 2, d: "-2.4s", t: "4.0s", c: palette.navy },
  { x: "88%", y: "30%", s: 3, d: "-1.7s", t: "3.7s", c: palette.emerald },
  { x: "34%", y: "94%", s: 3, d: "-3.4s", t: "4.5s", c: palette.mint },
  { x: "64%", y: "94%", s: 2, d: "-2.0s", t: "3.6s", c: palette.gold },
];

export default function JourvisCompanion({
  size = 96,
  molecules = true,
  className = "",
  title,
}: JourvisCompanionProps) {
  const rootStyle = {
    "--jourvis-size": `${size}px`,
    "--jourvis-ink": palette.ink,
    "--jourvis-navy": palette.navy,
    "--jourvis-emerald": palette.emerald,
    "--jourvis-mint": palette.mint,
    "--jourvis-gold": palette.gold,
    "--jourvis-ivory": palette.ivory,
  } as CSSProperties;

  return (
    <span
      className={`${styles.root}${className ? ` ${className}` : ""}`}
      style={rootStyle}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <span className={styles.aura} aria-hidden />
      {molecules ? (
        <span className={styles.bits} aria-hidden>
          {MOLECULES.map((bit, index) => (
            <i
              key={index}
              className={styles.bit}
              style={
                {
                  "--x": bit.x,
                  "--y": bit.y,
                  "--s": `${bit.s}px`,
                  "--delay": bit.d,
                  "--duration": bit.t,
                  "--c": bit.c,
                } as CSSProperties
              }
            />
          ))}
        </span>
      ) : null}
      <span className={styles.shadow} aria-hidden />
      <svg viewBox="-10 -10 160 160" className={styles.character} aria-hidden="true">
        <path d={paths[0]} fill={palette.emerald} />
        <path d={paths[1]} fill={palette.mint} opacity=".78" />
        <path d={paths[2]} fill={palette.ivory} />
      </svg>
    </span>
  );
}
