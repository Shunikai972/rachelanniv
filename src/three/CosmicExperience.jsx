import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bloom, ChromaticAberration, DepthOfField, EffectComposer, Vignette } from '@react-three/postprocessing';
import { Vector2 } from 'three';
import CameraRig from './CameraRig.jsx';
import { HelixLines, HelixPhotos } from './HelixMemory.jsx';
import NebulaClouds from './NebulaClouds.jsx';
import ParticleUniverse from './ParticleUniverse.jsx';
import { SelectionCallout, SphereLabels } from './SceneLabels.jsx';
import ShootingStar from './ShootingStar.jsx';
import SpeedLines from './SpeedLines.jsx';
import StarBackground from './StarBackground.jsx';

export default function CosmicExperience({
  progressRef,
  velocityRef,
  introRef,
  pointerRef,
  selected,
  onSelectPoint,
  onOpenPhoto,
}) {
  const mobile = typeof window !== 'undefined' && window.innerWidth < 720;
  const verifyMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('verify');

  return (
    <Canvas
      camera={{ position: [0, 0, mobile ? 15 : 12], fov: mobile ? 64 : 56, near: 0.05, far: 120 }}
      dpr={[1, mobile ? 1.45 : 2]}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: verifyMode,
      }}
      onCreated={({ gl, raycaster }) => {
        gl.setClearColor('#02030b', 1);
        raycaster.params.Points.threshold = mobile ? 0.32 : 0.2;
      }}
    >
      <Suspense fallback={null}>
        <fog attach="fog" args={['#02030b', 18, 72]} />
        <ambientLight intensity={0.18} />
        <pointLight position={[4, 6, 8]} color="#9fc7ff" intensity={0.7} distance={28} />
        <pointLight position={[-5, -2, 5]} color="#f7c98d" intensity={0.42} distance={24} />

        <CameraRig scrollRef={progressRef} introRef={introRef} selected={selected} />
        <StarBackground />
        <NebulaClouds scrollRef={progressRef} introRef={introRef} />
        <ShootingStar introRef={introRef} />
        <ParticleUniverse
          scrollRef={progressRef}
          velocityRef={velocityRef}
          introRef={introRef}
          pointerRef={pointerRef}
          selected={selected}
          onSelectPoint={onSelectPoint}
        />
        <SpeedLines scrollRef={progressRef} />
        <HelixLines scrollRef={progressRef} />
        <HelixPhotos scrollRef={progressRef} onOpenPhoto={onOpenPhoto} />
        <SphereLabels scrollRef={progressRef} />
        <SelectionCallout selected={selected} />

        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom intensity={0.58} luminanceThreshold={0.18} luminanceSmoothing={0.68} mipmapBlur />
          <DepthOfField focusDistance={0.018} focalLength={0.012} bokehScale={0.32} height={360} />
          <ChromaticAberration offset={new Vector2(0.00035, 0.00018)} radialModulation modulationOffset={0.12} />
          <Vignette eskil={false} offset={0.18} darkness={0.72} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
