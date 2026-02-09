import { useRef, useEffect, useCallback } from 'react';

export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number,
  options?: { maxWait?: number }
): (...args: A) => void {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallTimeRef = useRef<number | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    (...args: A) => {
      const now = Date.now();

      const invoke = () => {
        timeoutRef.current = null;
        lastCallTimeRef.current = now;
        callbackRef.current(...args);
      };

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const lastCallTime = lastCallTimeRef.current;
      const shouldInvokeImmediately =
        options?.maxWait &&
        (!lastCallTime || now - lastCallTime >= options.maxWait);

      if (shouldInvokeImmediately) {
        invoke();
      } else {
        timeoutRef.current = setTimeout(invoke, delay);
      }
    },
    [delay, options?.maxWait]
  );
}
