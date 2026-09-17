"use client";
import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import styles from "./MarinaraPage.module.css";

export default function Photo({
  src,
  alt,
  className = "",
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setFailed(false);
    const image = ref.current;
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, [src]);
  if (failed || !src)
    return (
      <span
        className={`${styles.photoFallback} ${className}`}
        role="img"
        aria-label={alt || "Image unavailable"}
      >
        {alt || "Image unavailable"}
      </span>
    );
  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={className}
      decoding="async"
      onError={() => setFailed(true)}
      {...props}
    />
  );
}
