"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Bubbles up every keydown fired anywhere inside the panel (title bar, body, or footer). */
  onKeyDown?: (e: ReactKeyboardEvent<HTMLDivElement>) => void;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(panel: HTMLElement | null): HTMLElement[] {
  if (!panel) return [];
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export function Drawer({ open, onClose, title, children, footer, onKeyDown }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const focusable = getFocusable(panelRef.current);
    (focusable[0] ?? panelRef.current)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handlePanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Tab") {
      const focusable = getFocusable(panelRef.current);
      if (focusable.length === 0) {
        e.preventDefault();
      } else {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    onKeyDown?.(e);
  };

  const handleExitComplete = () => {
    // The opener may have been removed while the drawer was open (e.g. a
    // deleted library tile); only restore focus to something still in the DOM.
    const target = previouslyFocused.current;
    if (target?.isConnected) target.focus();
  };

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {open && (
        <>
          <motion.div
            key="backdrop"
            aria-hidden
            onClick={onClose}
            className="fixed inset-0 z-40 bg-navy/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            onKeyDown={handlePanelKeyDown}
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="fixed right-0 top-0 z-50 w-[440px] max-w-full h-full bg-navy-mid border-l border-text/10 flex flex-col focus:outline-none"
            initial={reducedMotion ? { opacity: 0 } : { x: 440, opacity: 1 }}
            animate={reducedMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { x: 440, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-text/10">
              <h2 id={titleId} className="font-serif text-2xl font-light text-text">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="border-0 bg-transparent p-0 font-mono text-[13px] text-muted hover:text-text"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="sticky bottom-0 border-t border-text/10 px-6 py-4 bg-navy-mid">{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
