'use client';
import { useCallback, useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import styles from './WildTreePage.module.css';

type PhotoProps = ImgHTMLAttributes<HTMLImageElement> & { fallbackSrc?: string };

/** Reset the error history only when the source pair changes, not after an error. */
export default function Photo(props: PhotoProps) {
  return <PhotoSource key={JSON.stringify([props.src, props.fallbackSrc])} {...props} />;
}

function PhotoSource({ src, fallbackSrc, alt, className = '', onError, ...props }: PhotoProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [attempt, setAttempt] = useState(0);
  const sources = [src, fallbackSrc].filter((value, index, values): value is string =>
    typeof value === 'string' && value.length > 0 && values.indexOf(value) === index,
  );
  const currentSrc = sources[attempt];
  const fail = useCallback(() => {
    // The DOM error event and the hydration check may both observe the same error.
    // Advance once, and never retry a failed URL in a loop.
    setAttempt(current => current === attempt ? current + 1 : current);
  }, [attempt]);

  useEffect(() => {
    const image = imageRef.current;
    // An SSR image can finish failing before React attaches onError. Recover from
    // that already-completed request as well as errors received after hydration.
    if (image?.complete && image.naturalWidth === 0) fail();
  }, [currentSrc, fail]);

  if (!currentSrc) {
    return <span className={`${styles.photoFallback} ${className}`} role="img" aria-label={alt || 'Image unavailable'}>{alt || 'Image unavailable'}</span>;
  }
  return <img {...props} key={currentSrc} ref={imageRef} src={currentSrc} alt={alt} className={className} decoding={props.decoding || 'async'} onError={event => { fail(); onError?.(event); }} />;
}
