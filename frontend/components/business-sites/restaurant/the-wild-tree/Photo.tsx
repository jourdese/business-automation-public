'use client';
import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import styles from './WildTreePage.module.css';
export default function Photo({ src, alt, className = '', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (failed || !src) return <span className={`${styles.photoFallback} ${className}`} role="img" aria-label={alt || 'Image unavailable'}>{alt || 'Image unavailable'}</span>;
  return <img src={src} alt={alt} className={className} decoding="async" onError={() => setFailed(true)} {...props} />;
}
