import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Recheck deadlines while a screen is open and immediately on return from a bank app. */
export function useClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 1000);
    const subscription = AppState.addEventListener('change', tick);
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  return now;
}
