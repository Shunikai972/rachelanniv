import { useCallback, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { compliments } from '../data/compliments.js';
import {
  chooseParticleCount,
  clamp,
  createFinalTextLayout,
  createGalaxyLayout,
  createHelixLayout,
  createSphereLayout,
  createWaveLayout,
  easeInOutCubic,
  smoothstep,
} from './generators.js';

const tempTarget = new THREE.Vector3();
const zero = new THREE.Vector3();

function rotateX(x, y, z, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x, y * c - z * s, y * s + z * c];
}

function rotateY(x, y, z, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x * c + z * s, y, -x * s + z * c];
}

function rotateZ(x, y, z, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x * c - y * s, x * s + y * c, z];
}

export default function ParticleUniverse({
  scrollRef,
  velocityRef,
  introRef,
  pointerRef,
  selected,
  onSelectPoint,
}) {
  const pointsRef = useRef(null);
  const { camera, viewport } = useThree();

  const particleData = useMemo(() => {
    const count = chooseParticleCount();
    const galaxy = createGalaxyLayout(count);
    const sphere = createSphereLayout(count);
    const wave = createWaveLayout(count);
    const helix = createHelixLayout(count);
    const finalText = createFinalTextLayout(count);
    const offsets = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const baseSizes = new Float32Array(count);
    const randoms = new Float32Array(count);
    const random = (index) => galaxy.seeds[index] || 0.5;

    for (let i = 0; i < count; i += 1) {
      randoms[i] = random(i);
      baseSizes[i] = 1.0 + random(i) * 1.8;
    }

    return {
      count,
      galaxy,
      sphere,
      wave,
      helix,
      finalText,
      offsets,
      velocities,
      baseSizes,
      randoms,
    };
  }, []);

  const geometry = useMemo(() => {
    const { count, baseSizes, randoms } = particleData;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (randoms[i] - 0.5) * 0.12;
      positions[i * 3 + 1] = (randoms[(i + 17) % count] - 0.5) * 0.12;
      positions[i * 3 + 2] = (randoms[(i + 39) % count] - 0.5) * 0.12;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.88;
      colors[i * 3 + 2] = 0.66;
      sizes[i] = baseSizes[i];
    }

    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    bufferGeometry.setAttribute(
      'aColor',
      new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage),
    );
    bufferGeometry.setAttribute(
      'aSize',
      new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage),
    );
    bufferGeometry.boundingSphere = new THREE.Sphere(zero, 60);
    return bufferGeometry;
  }, [particleData]);

  const material = useMemo(() => {
    const shaderMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(2, window.devicePixelRatio || 1) },
        uTime: { value: 0 },
      },
      vertexShader: `
        uniform float uPixelRatio;
        uniform float uTime;
        attribute vec3 aColor;
        attribute float aSize;
        varying vec3 vColor;
        varying float vPulse;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float distanceScale = 58.0 / max(1.0, -mvPosition.z);
          vPulse = 0.86 + sin(uTime * 1.8 + position.x * 2.0 + position.y) * 0.14;
          vColor = aColor;
          gl_PointSize = clamp(aSize * uPixelRatio * distanceScale * vPulse, 0.8, 30.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vPulse;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          float halo = smoothstep(0.5, 0.05, dist);
          float core = smoothstep(0.18, 0.0, dist);
          vec3 color = vColor * (0.5 + halo * 0.78 + core * 1.22) * vPulse;
          float alpha = halo * 0.58 + core * 0.34;
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });

    return shaderMaterial;
  }, []);

  const computeSphereTarget = useCallback((index, offset, time) => {
    const { sphere } = particleData;
    let x = sphere.positions[offset];
    let y = sphere.positions[offset + 1];
    let z = sphere.positions[offset + 2];
    const layer = sphere.layers[index];

    if (layer === 0) {
      [x, y, z] = rotateY(x, y, z, time * 0.08);
      [x, y, z] = rotateX(x, y, z, Math.sin(time * 0.24) * 0.08);
    } else if (layer === 1) {
      [x, y, z] = rotateY(x, y, z, -time * 0.21);
      [x, y, z] = rotateZ(x, y, z, Math.sin(time * 0.2) * 0.06);
    } else if (layer === 2) {
      [x, y, z] = rotateZ(x, y, z, time * 0.54);
    } else if (layer === 3) {
      [x, y, z] = rotateY(x, y, z, -time * 0.48);
    } else {
      [x, y, z] = rotateX(x, y, z, time * 0.58);
    }

    tempTarget.set(x, y, z);
    return tempTarget;
  }, [particleData]);

  const handlePointerDown = useCallback(
    (event) => {
      const scroll = scrollRef.current;
      if (introRef.current < 0.96 || scroll < 0.17 || scroll > 0.43) return;

      const index = Number.isInteger(event.index) ? event.index : event.intersections?.[0]?.index;
      if (!Number.isInteger(index)) return;

      event.stopPropagation();
      const array = geometry.attributes.position.array;
      const offset = index * 3;
      onSelectPoint({
        index,
        position: [array[offset], array[offset + 1], array[offset + 2]],
        message: compliments[(index + Math.floor(Math.random() * compliments.length)) % compliments.length],
      });
    },
    [geometry, introRef, onSelectPoint, scrollRef],
  );

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const scroll = scrollRef.current;
    const intro = introRef.current;
    const positions = geometry.attributes.position.array;
    const colors = geometry.attributes.aColor.array;
    const sizes = geometry.attributes.aSize.array;
    const {
      count,
      galaxy,
      sphere,
      wave,
      helix,
      finalText,
      offsets,
      velocities,
      baseSizes,
      randoms,
    } = particleData;

    material.uniforms.uTime.value = time;

    const activeViewport = viewport.getCurrentViewport(camera, zero);
    const pointer = pointerRef.current;
    const pointerWorldX = pointer.x * activeViewport.width * 0.5;
    const pointerWorldY = pointer.y * activeViewport.height * 0.5;
    const galaxyRepel = intro > 0.88 && scroll < 0.14 && pointer.active;
    const waveEnergy = clamp(Math.abs(velocityRef.current) / 4200, 0, 1);
    const wavePhase = time * (0.55 + waveEnergy * 1.4) + scroll * 24;
    const hyper = smoothstep(0.37, 0.46, scroll) * (1 - smoothstep(0.51, 0.57, scroll));
    const finalGlow = smoothstep(0.965, 0.995, scroll);
    const introAlpha = smoothstep(0.5, 0.96, intro);
    const follow = clamp(1 - Math.pow(0.0045, delta), 0.04, 0.22);
    const selectedIndex = selected?.index ?? -1;
    const galaxySpinAmount = smoothstep(0.82, 1, intro) * (1 - smoothstep(0.12, 0.26, scroll));
    const galaxySpin = time * 0.09 * galaxySpinAmount;
    const galaxyCos = Math.cos(galaxySpin);
    const galaxySin = Math.sin(galaxySpin);

    for (let i = 0; i < count; i += 1) {
      const offset = i * 3;
      const seed = randoms[i];
      const baseGx = galaxy.positions[offset];
      const baseGy = galaxy.positions[offset + 1];
      const gx = baseGx * galaxyCos - baseGy * galaxySin;
      const gy = baseGx * galaxySin + baseGy * galaxyCos;
      const gz = galaxy.positions[offset + 2] + Math.sin(time * 0.18 + seed * 11) * 0.025 * galaxySpinAmount;

      const sphereTarget = computeSphereTarget(i, offset, time);
      const sx = sphereTarget.x;
      const sy = sphereTarget.y;
      const sz = sphereTarget.z;

      const wx = wave.positions[offset];
      const wz = wave.positions[offset + 2] + Math.sin(time * 0.3 + seed * 6) * 0.12;
      const dist = Math.sqrt(wx * wx + wz * wz);
      const wy =
        Math.sin(dist * 0.86 - wavePhase) * Math.cos(wx * 0.38) * (0.62 + waveEnergy * 1.2) +
        Math.sin(wx * 0.85 + wave.phases[i] + wavePhase * 0.8) * 0.24;

      let hx = helix.positions[offset];
      const hy = helix.positions[offset + 1];
      let hz = helix.positions[offset + 2];

      const txText = finalText.positions[offset];
      const tyText = finalText.positions[offset + 1];
      const tzText = finalText.positions[offset + 2];
      const finalLetter = finalText.textMask[i] === 1;

      let tx = gx;
      let ty = gy;
      let tz = gz;

      if (intro < 1) {
        const bloom = smoothstep(0.68, 0.84, intro);
        const bloomOut = smoothstep(0.82, 1, intro);
        const theta = seed * Math.PI * 2;
        const phi = Math.acos(randoms[(i + 137) % count] * 2 - 1);
        const scatter = 0.58 + randoms[(i + 311) % count] * 0.42;
        const burst = (1 - bloomOut) * bloom * (1.8 + seed * 4.2);
        tx = Math.cos(theta) * Math.sin(phi) * burst * scatter + gx * bloomOut;
        ty = Math.cos(phi) * burst * 0.72 * scatter + gy * bloomOut;
        tz = Math.sin(theta) * Math.sin(phi) * burst * scatter + gz * bloomOut;
      } else if (scroll < 0.1) {
        tx = gx;
        ty = gy;
        tz = gz;
      } else if (scroll < 0.22) {
        const t = easeInOutCubic((scroll - 0.1) / 0.12);
        tx = gx + (sx - gx) * t;
        ty = gy + (sy - gy) * t;
        tz = gz + (sz - gz) * t;
      } else if (scroll < 0.38) {
        tx = sx;
        ty = sy;
        tz = sz;
      } else if (scroll < 0.54) {
        const t = easeInOutCubic((scroll - 0.38) / 0.16);
        const stretch = 1 + hyper * (4 + seed * 6);
        tx = sx + (wx - sx) * t;
        ty = sy + (wy - sy) * t;
        tz = sz * (1 - t) + (wz - stretch) * t;
      } else if (scroll < 0.64) {
        tx = wx;
        ty = wy;
        tz = wz;
      } else if (scroll < 0.77) {
        const t = easeInOutCubic((scroll - 0.64) / 0.13);
        tx = wx + (hx - wx) * t;
        ty = wy + (hy - wy) * t;
        tz = wz + (hz - wz) * t;
      } else if (scroll < 0.965) {
        tx = hx;
        ty = hy;
        tz = hz;
      } else {
        const t = easeInOutCubic((scroll - 0.965) / 0.035);
        tx = hx + (txText - hx) * t;
        ty = hy + (tyText - hy) * t;
        tz = hz + (tzText - hz) * t;
      }

      const ox = offsets[offset];
      const oy = offsets[offset + 1];
      const oz = offsets[offset + 2];
      let vx = velocities[offset];
      let vy = velocities[offset + 1];
      let vz = velocities[offset + 2];

      if (galaxyRepel) {
        const dx = tx + ox - pointerWorldX;
        const dy = ty + oy - pointerWorldY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = 2.75;

        if (dist < radius && dist > 0.001) {
          const force = Math.pow(1 - dist / radius, 2) * 0.18;
          vx += (dx / dist) * force;
          vy += (dy / dist) * force;
          vz += (seed - 0.5) * force * 0.8;
        }

        vx += -ox * 0.022;
        vy += -oy * 0.022;
        vz += -oz * 0.022;
        vx *= 0.9;
        vy *= 0.9;
        vz *= 0.9;
      } else {
        vx += -ox * 0.04;
        vy += -oy * 0.04;
        vz += -oz * 0.04;
        vx *= 0.82;
        vy *= 0.82;
        vz *= 0.82;
      }

      offsets[offset] = ox + vx;
      offsets[offset + 1] = oy + vy;
      offsets[offset + 2] = oz + vz;
      velocities[offset] = vx;
      velocities[offset + 1] = vy;
      velocities[offset + 2] = vz;

      const desiredX = tx + offsets[offset];
      const desiredY = ty + offsets[offset + 1];
      const desiredZ = tz + offsets[offset + 2];

      positions[offset] += (desiredX - positions[offset]) * follow;
      positions[offset + 1] += (desiredY - positions[offset + 1]) * follow;
      positions[offset + 2] += (desiredZ - positions[offset + 2]) * follow;

      const sphereAmount = smoothstep(0.12, 0.24, scroll) * (1 - smoothstep(0.39, 0.5, scroll));
      const waveAmount = smoothstep(0.43, 0.56, scroll) * (1 - smoothstep(0.65, 0.73, scroll));
      const helixAmount = smoothstep(0.66, 0.77, scroll) * (1 - smoothstep(0.965, 0.995, scroll));
      const galaxyAmount = (1 - sphereAmount) * (1 - waveAmount) * (1 - helixAmount) * (1 - finalGlow);

      const galaxyRadius = Math.sqrt(gx * gx + gy * gy + gz * gz);
      const galaxyCore = 1 - clamp(galaxyRadius / 9.8);
      let r = 0.42 + seed * 0.22;
      let g = 0.5 + seed * 0.2;
      let b = 0.94 + seed * 0.2;

      if (galaxyAmount > 0.001) {
        const roseArm = seed > 0.64 ? 0.24 : 0;
        r = r * (1 - galaxyAmount) + (0.45 + galaxyCore * 1.25 + roseArm) * galaxyAmount;
        g = g * (1 - galaxyAmount) + (0.36 + galaxyCore * 0.98) * galaxyAmount;
        b = b * (1 - galaxyAmount) + (0.82 + (1 - galaxyCore) * 0.28 + roseArm * 0.35) * galaxyAmount;
      }

      r += sphereAmount * (0.48 + seed * 0.32);
      g += sphereAmount * 0.22;
      b -= sphereAmount * 0.2;

      r += waveAmount * 0.16;
      g += waveAmount * 0.3;
      b += waveAmount * 0.42;

      r += helixAmount * 0.46;
      g += helixAmount * 0.18;
      b += helixAmount * 0.08;

      r += finalGlow * 0.2;
      g += finalGlow * 0.16;
      b += finalGlow * 0.04;

      if (i === selectedIndex) {
        r = 2.4;
        g = 1.82;
        b = 0.86;
      }

      const finalDim = finalGlow && !finalLetter ? 1 - finalGlow * 0.58 : 1;
      colors[offset] = r * (0.8 + galaxyAmount * 0.2) * finalDim;
      colors[offset + 1] = g * finalDim;
      colors[offset + 2] = b * finalDim;

      const sceneSize =
        0.52 +
        sphereAmount * 0.58 +
        waveAmount * 0.22 -
        helixAmount * 0.22 +
        galaxyCore * galaxyAmount * 0.42;
      const finalSizeScale = 1 - finalGlow * (finalLetter ? 0.54 : 0.92);
      sizes[i] =
        baseSizes[i] *
          introAlpha *
          (1 + hyper * 1.35) *
          sceneSize *
          finalSizeScale +
        (i === selectedIndex ? baseSizes[i] * 3.2 : 0);
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aColor.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      onPointerDown={handlePointerDown}
    />
  );
}
