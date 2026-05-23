import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useScrollProgress() {
  const progressRef = useRef(0);
  const velocityRef = useRef(0);
  const [progress, setProgress] = useState(0);

  useLayoutEffect(() => {
    let pending = false;

    const trigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progressRef.current = self.progress;
        velocityRef.current = self.getVelocity();

        if (!pending) {
          pending = true;
          requestAnimationFrame(() => {
            pending = false;
            setProgress(progressRef.current);
          });
        }
      },
    });

    ScrollTrigger.refresh();

    return () => {
      trigger.kill();
    };
  }, []);

  return { progress, progressRef, velocityRef };
}
