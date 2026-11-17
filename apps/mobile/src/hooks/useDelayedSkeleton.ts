import { useEffect, useState } from 'react';

/** Avoid flashing a placeholder when content resolves during a normal quick load. */
export function useDelayedSkeleton(loading: boolean, delayMs = 450): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!loading) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [loading, delayMs]);

  return loading && visible;
}
