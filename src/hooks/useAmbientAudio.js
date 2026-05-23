import { useCallback, useEffect, useRef, useState } from 'react';

export function useAmbientAudio() {
  const contextRef = useRef(null);
  const gainRef = useRef(null);
  const nodesRef = useRef([]);
  const [enabled, setEnabled] = useState(false);

  const stop = useCallback(() => {
    if (!contextRef.current || !gainRef.current) return;

    const now = contextRef.current.currentTime;
    gainRef.current.gain.cancelScheduledValues(now);
    gainRef.current.gain.linearRampToValueAtTime(0, now + 0.7);

    window.setTimeout(() => {
      nodesRef.current.forEach((node) => {
        try {
          node.stop();
          node.disconnect();
        } catch {
          // Audio nodes can already be closed when the page is backgrounded.
        }
      });
      nodesRef.current = [];
      contextRef.current?.close();
      contextRef.current = null;
      gainRef.current = null;
    }, 800);
  }, []);

  const start = useCallback(async () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext || contextRef.current) return;

    const context = new AudioContext();
    await context.resume();

    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;
    gain.gain.value = 0;
    filter.connect(gain);
    gain.connect(context.destination);

    const frequencies = [146.83, 220, 329.63, 440];
    const nodes = frequencies.map((frequency, index) => {
      const oscillator = context.createOscillator();
      const localGain = context.createGain();
      oscillator.type = index % 2 === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      localGain.gain.value = index === 0 ? 0.11 : 0.045;
      oscillator.connect(localGain);
      localGain.connect(filter);
      oscillator.start();
      return oscillator;
    });

    const shimmer = context.createOscillator();
    const shimmerGain = context.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.value = 880;
    shimmerGain.gain.value = 0.012;
    shimmer.connect(shimmerGain);
    shimmerGain.connect(filter);
    shimmer.start();

    contextRef.current = context;
    gainRef.current = gain;
    nodesRef.current = [...nodes, shimmer];

    const now = context.currentTime;
    gain.gain.linearRampToValueAtTime(0.18, now + 1.8);
  }, []);

  const toggle = useCallback(async () => {
    if (enabled) {
      setEnabled(false);
      stop();
      return;
    }

    await start();
    setEnabled(true);
  }, [enabled, start, stop]);

  useEffect(() => stop, [stop]);

  return { enabled, toggle };
}
