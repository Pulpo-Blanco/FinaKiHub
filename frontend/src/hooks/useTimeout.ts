// src/hooks/useTimeout.ts
import { useCallback, useEffect, useRef } from 'react';

export function useTimeout() {
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (ref.current) { clearTimeout(ref.current); ref.current = null; }
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    clear();
    ref.current = setTimeout(() => {
      ref.current = null;
      fn();
    }, ms);
  }, [clear]);

  useEffect(() => clear, [clear]);
  return { schedule, clear };
}
