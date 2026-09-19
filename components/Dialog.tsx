"use client";
import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export default function Dialog({
  title,
  close,
  children,
  className = "",
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const label = useId();
  useEffect(() => {
    const element = ref.current;
    const previous = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      aria-labelledby={label}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <button className="dialog-close icon-button" aria-label="Close dialog" onClick={close}>
        <X />
      </button>
      <h2 id={label}>{title}</h2>
      {children}
    </dialog>
  );
}
