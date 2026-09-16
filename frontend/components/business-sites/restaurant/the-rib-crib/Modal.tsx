'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import Icon from './Icon';
import styles from './RibCribPage.module.css';

/** Native dialog gives keyboard containment and top-layer rendering without a new dependency. */
export default function Modal({ titleId, onClose, children, drawer = false }: { titleId: string; onClose: () => void; children: ReactNode; drawer?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog ref={ref} className={`${styles.modal} ${drawer ? styles.drawer : ''}`} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); closeRef.current(); }}
      onClick={(event) => { if (event.target === event.currentTarget) closeRef.current(); }}>
      <div className={styles.modalSurface}>
        <button type="button" className={styles.closeButton} aria-label="Close dialog" onClick={onClose} autoFocus><Icon name="close" /></button>
        {children}
      </div>
    </dialog>
  );
}
