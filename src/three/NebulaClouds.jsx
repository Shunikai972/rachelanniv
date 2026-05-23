import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { smoothstep } from './generators.js';

function makeNebulaTexture(stops) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 245);
  stops.forEach(([position, color]) => gradient.addColorStop(position, color));
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function NebulaClouds({ scrollRef, introRef }) {
  const groupRef = useRef(null);

  const textures = useMemo(
    () => [
      makeNebulaTexture([
        [0, 'rgba(126, 64, 255, 0.35)'],
        [0.42, 'rgba(70, 34, 145, 0.18)'],
        [1, 'rgba(0, 0, 0, 0)'],
      ]),
      makeNebulaTexture([
        [0, 'rgba(255, 92, 174, 0.25)'],
        [0.5, 'rgba(88, 30, 98, 0.13)'],
        [1, 'rgba(0, 0, 0, 0)'],
      ]),
      makeNebulaTexture([
        [0, 'rgba(255, 210, 112, 0.18)'],
        [0.48, 'rgba(95, 65, 24, 0.1)'],
        [1, 'rgba(0, 0, 0, 0)'],
      ]),
    ],
    [],
  );

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const galaxyVisible = smoothstep(0.72, 0.96, introRef.current) * (1 - smoothstep(0.16, 0.32, scrollRef.current));

    if (groupRef.current) {
      groupRef.current.children.forEach((child, index) => {
        child.material.opacity = galaxyVisible * (0.16 + index * 0.035);
      });
      groupRef.current.rotation.z = Math.sin(time * 0.03) * 0.045;
    }

  });

  return (
    <group ref={groupRef} position={[0, 0, -16]}>
      <mesh position={[-8, 4, 0]} rotation={[0, 0, -0.24]}>
        <planeGeometry args={[34, 34]} />
        <meshBasicMaterial
          map={textures[0]}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[9, -2, -2]} rotation={[0, 0, 0.36]}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial
          map={textures[1]}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, -5, -3]} rotation={[0, 0, 0.12]}>
        <planeGeometry args={[26, 26]} />
        <meshBasicMaterial
          map={textures[2]}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
