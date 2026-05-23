import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { birthdayTexts } from './data/birthdayTexts.js';
import { useAmbientAudio } from './hooks/useAmbientAudio.js';
import { useIntroTimer } from './hooks/useIntroTimer.js';
import { useScrollProgress } from './hooks/useScrollProgress.js';
import CosmicExperience from './three/CosmicExperience.jsx';
import { clamp, smoothstep } from './three/generators.js';
import { imageSources } from './utils/imageSources.js';
import { supportsWebGL } from './utils/webgl.js';

function IntroOverlay({ introProgress }) {
  const opacity = 1 - smoothstep(0.08, 0.22, introProgress);

  return (
    <div
      className="intro-overlay"
      style={{ opacity, pointerEvents: opacity > 0.03 ? 'auto' : 'none' }}
      aria-hidden={opacity < 0.03}
    >
      <div className="intro-mark">Rachel</div>
      <div className="intro-line">
        <span style={{ transform: `scaleX(${introProgress})` }} />
      </div>
    </div>
  );
}

function RachelTitle({ progress, introProgress }) {
  const opacity = smoothstep(0.62, 0.98, introProgress) * (1 - smoothstep(0.09, 0.2, progress));

  return (
    <div className="rachel-title" style={{ opacity }}>
      <h1>Rachel</h1>
    </div>
  );
}

function ScrollNarration({ progress }) {
  const sceneOpacity = smoothstep(0.46, 0.52, progress) * (1 - smoothstep(0.66, 0.72, progress));
  const local = clamp((progress - 0.49) / 0.16);
  const phase = local * birthdayTexts.length;
  const activeIndex = Math.min(birthdayTexts.length - 1, Math.max(0, Math.floor(phase)));
  const activePhase = clamp(phase - activeIndex);
  const textOpacity =
    sceneOpacity *
    smoothstep(0.05, 0.18, activePhase) *
    (activeIndex === birthdayTexts.length - 1 ? 1 : 1 - smoothstep(0.78, 0.96, activePhase));
  const activeText = birthdayTexts[activeIndex];

  return (
    <section className="narration" style={{ opacity: sceneOpacity }} aria-live="polite">
      <p
        key={activeText}
        style={{
          opacity: textOpacity,
          transform: `translate3d(0, ${(1 - textOpacity) * 22}px, 0)`,
          filter: `blur(${(1 - textOpacity) * 4}px)`,
        }}
      >
        {activeText}
      </p>
    </section>
  );
}

function PhotoLightbox({ photo, onClose }) {
  useEffect(() => {
    if (!photo) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose, photo]);

  if (!photo) return null;

  return (
    <div className="photo-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <button className="photo-close" type="button" onClick={onClose}>
        Fermer
      </button>
      <img src={photo.url} alt="Souvenir de Rachel agrandi" draggable="false" onClick={(event) => event.stopPropagation()} />
    </div>
  );
}

function AudioButton() {
  const { enabled, toggle } = useAmbientAudio();

  return (
    <button className="audio-button" type="button" onClick={toggle} aria-pressed={enabled} aria-label="Son">
      <span aria-hidden="true">{enabled ? 'Silence' : 'Son'}</span>
    </button>
  );
}

function WebGLFallback() {
  return (
    <main className="fallback">
      <div>
        <p>Rachel</p>
        <h1>On t'aime maman</h1>
      </div>
    </main>
  );
}

export default function App() {
  const [webglReady, setWebglReady] = useState(true);
  const [selected, setSelected] = useState(null);
  const [openPhoto, setOpenPhoto] = useState(null);
  const selectionTimer = useRef(0);
  const pointerRef = useRef({ x: 99, y: 99, active: false });
  const { progress, progressRef, velocityRef } = useScrollProgress();
  const { introRef, introProgress } = useIntroTimer(7800);

  useEffect(() => {
    setWebglReady(supportsWebGL());
  }, []);

  useEffect(() => {
    window.__RACHEL_IMAGE_COUNT__ = imageSources.length;
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(selectionTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!selected) return;
    if (progress >= 0.16 && progress <= 0.44) return;

    window.clearTimeout(selectionTimer.current);
    setSelected(null);
  }, [progress, selected]);

  const handlePointerMove = useCallback((event) => {
    pointerRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointerRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    pointerRef.current.active = true;
  }, []);

  const handlePointerLeave = useCallback(() => {
    pointerRef.current.active = false;
  }, []);

  const handleSelectPoint = useCallback((point) => {
    window.clearTimeout(selectionTimer.current);
    setSelected({ ...point, id: Date.now() });
    selectionTimer.current = window.setTimeout(() => {
      setSelected(null);
    }, 4200);
  }, []);

  const handleOpenPhoto = useCallback((source) => {
    setOpenPhoto(source);
  }, []);

  const handleClosePhoto = useCallback(() => {
    setOpenPhoto(null);
  }, []);

  const scene = useMemo(
    () => (
      <CosmicExperience
        progressRef={progressRef}
        velocityRef={velocityRef}
        introRef={introRef}
        pointerRef={pointerRef}
        selected={selected}
        onSelectPoint={handleSelectPoint}
        onOpenPhoto={handleOpenPhoto}
      />
    ),
    [handleOpenPhoto, handleSelectPoint, introRef, progressRef, selected, velocityRef],
  );

  if (!webglReady) return <WebGLFallback />;

  return (
    <main className="experience" onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
      <div className="canvas-layer">{scene}</div>
      <div className="cinema-vignette" aria-hidden="true" />
      <RachelTitle progress={progress} introProgress={introProgress} />
      <ScrollNarration progress={progress} />
      <PhotoLightbox photo={openPhoto} onClose={handleClosePhoto} />
      <AudioButton />
      <IntroOverlay introProgress={introProgress} />
      <div className="scroll-space" aria-hidden="true" />
    </main>
  );
}
