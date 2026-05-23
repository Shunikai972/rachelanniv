import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clamp, getIntroStarPosition, smoothstep } from './generators.js';

const starPosition = new THREE.Vector3();
const trailPosition = new THREE.Vector3();
const TRAIL_POINTS = 54;

function createRadialTexture() {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 192;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(96, 96, 0, 96, 96, 96);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,239,190,0.82)');
  gradient.addColorStop(0.52, 'rgba(255,197,112,0.26)');
  gradient.addColorStop(1, 'rgba(255,197,112,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 192, 192);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function ShootingStar({ introRef }) {
  const starRef = useRef(null);
  const glowRef = useRef(null);
  const trailRef = useRef(null);
  const asteroidRef = useRef(null);
  const ringRef = useRef(null);
  const burstRef = useRef(null);
  const lightRef = useRef(null);
  const glowTexture = useMemo(() => createRadialTexture(), []);
  const burstTexture = useMemo(() => createRadialTexture(), []);

  const trailGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 3), 3));
    return geometry;
  }, []);

  useFrame((state) => {
    const intro = introRef.current;
    const travel = clamp(intro / 0.72);
    const impact = smoothstep(0.69, 0.81, intro);
    const fade = 1 - smoothstep(0.74, 0.9, intro);

    getIntroStarPosition(travel, starPosition);

    if (starRef.current) {
      starRef.current.visible = intro < 0.76;
      starRef.current.position.copy(starPosition);
      starRef.current.scale.setScalar((0.32 + Math.sin(state.clock.elapsedTime * 9) * 0.035) * fade);
    }

    if (glowRef.current) {
      glowRef.current.visible = intro < 0.82;
      glowRef.current.position.copy(starPosition);
      glowRef.current.scale.setScalar((1.45 + impact * 3.4) * fade);
      glowRef.current.material.opacity = (0.2 + impact * 0.38) * fade;
    }

    if (lightRef.current) {
      lightRef.current.position.copy(starPosition);
      lightRef.current.intensity = 2.5 * fade + impact * 5.2;
    }

    if (trailRef.current) {
      const array = trailGeometry.attributes.position.array;
      for (let i = 0; i < TRAIL_POINTS; i += 1) {
        const t = clamp(travel - i * 0.0044);
        getIntroStarPosition(t, trailPosition);
        array[i * 3] = trailPosition.x + Math.sin(i * 1.9 + state.clock.elapsedTime * 4) * 0.035;
        array[i * 3 + 1] = trailPosition.y + Math.cos(i * 1.3) * 0.025;
        array[i * 3 + 2] = trailPosition.z + Math.sin(i * 0.7) * 0.03;
      }
      trailGeometry.attributes.position.needsUpdate = true;
      trailRef.current.visible = intro < 0.82;
      trailRef.current.material.opacity = 0.42 * fade;
    }

    if (asteroidRef.current) {
      asteroidRef.current.visible = intro < 0.82;
      asteroidRef.current.rotation.x += 0.004;
      asteroidRef.current.rotation.y += 0.007;
      asteroidRef.current.scale.setScalar(1.02 - impact * 0.78);
      asteroidRef.current.material.opacity = 1 - impact;
    }

    if (ringRef.current) {
      ringRef.current.visible = intro < 0.82;
      ringRef.current.rotation.z += 0.003;
      ringRef.current.material.opacity = (0.16 + Math.sin(state.clock.elapsedTime * 2) * 0.035) * (1 - impact);
      ringRef.current.scale.setScalar(1.02 - impact * 0.78);
    }

    if (burstRef.current) {
      const burst = smoothstep(0.7, 0.9, intro) * (1 - smoothstep(0.9, 1, intro));
      burstRef.current.visible = burst > 0.01;
      burstRef.current.scale.setScalar(0.3 + burst * 5.8);
      burstRef.current.material.opacity = burst * 0.32;
    }
  });

  return (
    <group>
      <mesh ref={starRef}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial color="#fff6c8" toneMapped={false} />
      </mesh>

      <sprite ref={glowRef}>
        <spriteMaterial
          map={glowTexture}
          color="#ffe7a5"
          transparent
          opacity={0.26}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </sprite>

      <line ref={trailRef} geometry={trailGeometry}>
        <lineBasicMaterial
          color="#ffcf70"
          transparent
          opacity={0.52}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </line>

      <mesh ref={asteroidRef} position={[0.05, 0, 0.05]}>
        <dodecahedronGeometry args={[0.62, 2]} />
        <meshStandardMaterial
          color="#3b2d24"
          roughness={0.88}
          metalness={0.28}
          transparent
          opacity={1}
        />
      </mesh>

      <mesh ref={ringRef} position={[0.05, 0, 0.05]} rotation={[Math.PI / 2.35, 0.2, 0.1]}>
        <ringGeometry args={[1.02, 1.09, 64]} />
        <meshBasicMaterial
          color="#ffbd52"
          side={THREE.DoubleSide}
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <sprite ref={burstRef} position={[0, 0, 0]}>
        <spriteMaterial
          map={burstTexture}
          color="#fff2c5"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </sprite>

      <pointLight ref={lightRef} color="#ffe8ad" intensity={1.4} distance={18} />
    </group>
  );
}
