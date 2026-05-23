import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { seededRandom, smoothstep } from './generators.js';

export default function SpeedLines({ scrollRef }) {
  const ref = useRef(null);

  const geometry = useMemo(() => {
    const random = seededRandom(107);
    const count = typeof window !== 'undefined' && window.innerWidth < 720 ? 140 : 260;
    const positions = new Float32Array(count * 6);

    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 1.2 + random() * 8.5;
      const y = (random() - 0.5) * 7;
      const z = -14 - random() * 24;
      const length = 2.4 + random() * 5.6;
      const x = Math.cos(angle) * radius;
      const sideY = Math.sin(angle) * radius * 0.4 + y;

      positions[i * 6] = x;
      positions[i * 6 + 1] = sideY;
      positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x * 1.04;
      positions[i * 6 + 4] = sideY;
      positions[i * 6 + 5] = z + length;
    }

    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return bufferGeometry;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const scroll = scrollRef.current;
    const intensity = smoothstep(0.37, 0.45, scroll) * (1 - smoothstep(0.53, 0.6, scroll));
    ref.current.visible = intensity > 0.01;
    ref.current.material.opacity = intensity * 0.72;
    ref.current.position.z = (state.clock.elapsedTime * 14) % 7;
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.7) * 0.04;
  });

  return (
    <lineSegments ref={ref} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial
        color="#d6f2ff"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </lineSegments>
  );
}
