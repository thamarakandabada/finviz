import { useEffect, useRef, useCallback } from "react";

const IDLE_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

/**
 * Auto-logout after `timeoutMs` of inactivity.
 * Resets on user interaction (mouse, keyboard, touch, scroll).
 */
export function useIdleTimeout(onTimeout: () => void, timeoutMs = 30 * 60 * 1000) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onTimeout, timeoutMs);
  }, [onTimeout, timeoutMs]);

  useEffect(() => {
    resetTimer();
    IDLE_EVENTS.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      IDLE_EVENTS.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [resetTimer]);
}
