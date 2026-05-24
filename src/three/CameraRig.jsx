import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { clamp, easeInOutCubic, getIntroStarPosition, lerp, smoothstep } from './generators.js';

const starNow = new THREE.Vector3();
const starNext = new THREE.Vector3();

export default function CameraRig({ scrollRef, introRef, selected }) {
  const { camera } = useThree();
  const desired = useMemo(() => new THREE.Vector3(0, 0, 12), []);
  const lookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const selectedPoint = useMemo(() => new THREE.Vector3(), []);
  const mobile = typeof window !== 'undefined' && window.innerWidth < 720;

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const intro = introRef.current;
    const scroll = scrollRef.current;
    let targetFov = mobile ? 64 : 56;

    if (intro < 0.98) {
      const travel = clamp(intro / 0.72);
      getIntroStarPosition(travel, starNow);
      getIntroStarPosition(clamp(travel + 0.025), starNext);
      const direction = starNext.sub(starNow).normalize();
      const behind = direction.multiplyScalar(-2.6);
      const reveal = smoothstep(0.76, 0.98, intro);

      desired
        .copy(starNow)
        .add(behind)
        .add(new THREE.Vector3(0.35, 0.46, 1.65))
        .lerp(new THREE.Vector3(0, 1.15, mobile ? 16.8 : 14.2), reveal);
      lookAt.copy(starNow).lerp(new THREE.Vector3(0, 0, 0), reveal);
      targetFov = lerp(72, mobile ? 68 : 58, reveal);
    } else if (selected?.position) {
      selectedPoint.fromArray(selected.position);
      desired.copy(selectedPoint).add(new THREE.Vector3(0.72, 0.42, mobile ? 3.8 : 3.0));
      lookAt.copy(selectedPoint);
      targetFov = mobile ? 52 : 46;
    } else if (scroll < 0.17) {
      const drift = Math.sin(time * 0.18) * 0.42;
      desired.set(drift, Math.sin(time * 0.12) * 0.22, mobile ? 15.3 : 12.4);
      lookAt.set(0, 0, 0);
    } else if (scroll < 0.38) {
      const orbit = time * 0.13;
      const radius = mobile ? 12.5 : 10.4;
      desired.set(Math.sin(orbit) * 2.0, 0.75 + Math.sin(time * 0.2) * 0.25, Math.cos(orbit) * 1.2 + radius);
      lookAt.set(0, 0.08, 0);
      targetFov = mobile ? 62 : 54;
    } else if (scroll < 0.54) {
      const t = easeInOutCubic((scroll - 0.38) / 0.16);
      desired.set(Math.sin(time * 0.18) * 0.45, 0.2 - t * 0.15, lerp(mobile ? 11.6 : 9.4, 3.35, t));
      lookAt.set(0, 0, lerp(0, -2.3, t));
      targetFov = lerp(mobile ? 62 : 54, mobile ? 78 : 72, smoothstep(0.4, 0.5, scroll));
    } else if (scroll < 0.66) {
      const t = (scroll - 0.54) / 0.12;
      desired.set(Math.sin(time * 0.15) * 0.55, mobile ? 4.8 : 4.15, lerp(mobile ? 9.8 : 8.4, 7.1, t));
      lookAt.set(0, 0.05, lerp(-0.7, -1.8, t));
      targetFov = mobile ? 63 : 55;
    } else if (scroll < 0.965) {
      const t = clamp((scroll - 0.66) / 0.305);
      const cameraY = lerp(8.2, -7.2, t);
      const lookY = lerp(4.4, -6.4, t);
      const side = lerp(mobile ? 4.4 : 6.4, mobile ? -4.2 : -6.4, t);
      const depth = mobile ? 12.8 : 11.6;

      desired.set(side, cameraY, depth);
      lookAt.set(0, lookY, 0);
      targetFov = mobile ? 62 : 55;
    } else {
      const t = smoothstep(0.965, 1, scroll);
      desired.set(Math.sin(time * 0.08) * 0.25, Math.sin(time * 0.1) * 0.16, lerp(mobile ? 33 : 11.8, mobile ? 31 : 10.9, t));
      lookAt.set(0, 0, 0);
      targetFov = mobile ? 63 : 55;
    }

    const cameraEase = selected ? 1 - Math.pow(0.001, delta) : 1 - Math.pow(0.025, delta);
    camera.position.lerp(desired, clamp(cameraEase, 0.04, 0.22));
    currentLookAt.current.lerp(lookAt, clamp(1 - Math.pow(0.018, delta), 0.05, 0.2));
    camera.lookAt(currentLookAt.current);
    camera.fov += (targetFov - camera.fov) * 0.035;
    camera.near = 0.05;
    camera.far = 120;
    camera.updateProjectionMatrix();
  });

  return null;
}
