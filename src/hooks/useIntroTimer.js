import { useEffect, useRef, useState } from 'react';

export function useIntroTimer(duration = 4300) {
  const introRef = useRef(0);
  const [introProgress, setIntroProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      introRef.current = progress;
      setIntroProgress(progress);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration]);

  return { introRef, introProgress };
}
