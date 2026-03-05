import { recordEvent } from "@/utils/analytics";
import { useCallback, useRef } from "react";

/**
 * Returns a debounced (300ms) wrapper around `recordEvent`.
 * Safe to call on every keystroke / scroll event.
 */
export function useRecordEvent() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const record = useCallback((eventType: string, payload: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      recordEvent(eventType, payload);
    }, 300);
  }, []);

  return record;
}
