import { useEffect, useState, useRef } from 'react';

interface UseVisibilityObserverOptions {
  root?: HTMLElement | null;
  threshold?: number | number[];
  rootMargin?: string;
}

export function useVisibilityObserver(
  elementRef: React.RefObject<Element | null>,
  options: UseVisibilityObserverOptions = {}
) {
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !options.root) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        root: options.root,
        rootMargin: options.rootMargin || '0px',
        threshold: options.threshold || 0
      }
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [elementRef, options.root, options.rootMargin, options.threshold]);

  return isVisible;
}
