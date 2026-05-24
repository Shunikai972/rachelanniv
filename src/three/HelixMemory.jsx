import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { imageSources } from '../utils/imageSources.js';
import { clamp, createHelixLineSegments, helixPointAt, lerp, smoothstep } from './generators.js';

const HELIX_FORM_START = 0.66;
const HELIX_READY = 0.77;
const PHOTO_ROUTE_START = 0.79;
const PHOTO_ROUTE_END = 0.965;
const HELIX_FADE_START = 0.965;
const HELIX_FADE_END = 0.995;

function memoryFramePointAt(t, index, mobile, radius = 5.15, height = 15.5) {
  const y = lerp(-height / 2, height / 2, t);
  const lane = index % 4;
  const side = lane === 0 || lane === 3 ? -1 : 1;
  const inner = lane === 1 || lane === 3;
  const x = side * (mobile ? (inner ? 1.9 : 2.85) : (inner ? 3.8 : radius));
  const z = (mobile ? 3.15 : 3.25) + (inner ? 0.6 : 0) + Math.sin(index * 1.7) * 0.35;
  return new THREE.Vector3(x, y, z);
}

export function HelixLines({ scrollRef }) {
  const ref = useRef(null);

  const geometry = useMemo(() => {
    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute('position', new THREE.BufferAttribute(createHelixLineSegments(190), 3));
    return bufferGeometry;
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    const scroll = scrollRef.current;
    const visible = smoothstep(HELIX_FORM_START, HELIX_READY, scroll) * (1 - smoothstep(HELIX_FADE_START, HELIX_FADE_END, scroll));
    ref.current.visible = visible > 0.01;
    ref.current.material.opacity = visible * 0.34;
    ref.current.rotation.y = 0;
  });

  return (
    <lineSegments ref={ref} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial
        color="#d8edff"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </lineSegments>
  );
}

function PhotoCard({ source, index, total, scrollRef, onOpenPhoto }) {
  const groupRef = useRef(null);
  const hitRef = useRef(null);
  const glowRef = useRef(null);
  const frameRef = useRef(null);
  const backRef = useRef(null);
  const tetherRef = useRef(null);
  const materialRef = useRef(null);
  const interactiveRef = useRef(false);
  const [texture, setTexture] = useState(null);
  const [aspect, setAspect] = useState(1);
  const { camera } = useThree();

  const phase = index % 2 === 0 ? 0 : Math.PI;
  const t = total <= 1 ? 0.5 : index / (total - 1);
  const baseAnchor = useMemo(() => helixPointAt(t, 2.15, 15.5, phase), [phase, t]);
  const anchor = useMemo(() => new THREE.Vector3(), []);
  const photo = useMemo(() => new THREE.Vector3(), []);

  const mobile = typeof window !== 'undefined' && window.innerWidth < 720;
  const basePhoto = useMemo(() => memoryFramePointAt(t, index, mobile, 5.05 + (index % 3) * 0.22, 15.5), [index, mobile, t]);
  const planeHeight = mobile ? 1.16 : 1.72;
  const planeWidth = clamp(aspect, 0.7, 1.58) * planeHeight;

  const canOpenPhoto = useCallback(
    () => interactiveRef.current && scrollRef.current >= PHOTO_ROUTE_START && scrollRef.current <= PHOTO_ROUTE_END,
    [scrollRef],
  );

  const guardedRaycast = useCallback(
    (raycaster, intersects) => {
      if (!canOpenPhoto() || !hitRef.current) return;
      THREE.Mesh.prototype.raycast.call(hitRef.current, raycaster, intersects);
    },
    [canOpenPhoto],
  );

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let cancelled = false;
    const delay = Math.min(2600, index * 75);

    const timer = window.setTimeout(() => {
      loader.load(source.url, (loadedTexture) => {
        if (cancelled) {
          loadedTexture.dispose();
          return;
        }

        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.anisotropy = 4;
        const image = loadedTexture.image;
        if (image?.width && image?.height) {
          setAspect(image.width / image.height);
        }
        setTexture(loadedTexture);
        window.__RACHEL_TEXTURES_LOADED__ = (window.__RACHEL_TEXTURES_LOADED__ || 0) + 1;
      });
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [index, source.url]);

  useFrame(() => {
    const scroll = scrollRef.current;
    const stage = smoothstep(HELIX_READY, PHOTO_ROUTE_START, scroll) * (1 - smoothstep(HELIX_FADE_START, HELIX_FADE_END, scroll));
    const route = clamp((scroll - PHOTO_ROUTE_START) / (PHOTO_ROUTE_END - PHOTO_ROUTE_START));
    const distance = Math.abs((1 - t) - route);
    const near = Math.pow(1 - clamp(distance / 0.052), 2);
    const focus = Math.pow(1 - clamp(distance / 0.026), 2);
    const opacity = stage * near;
    interactiveRef.current = stage > 0.75 && opacity > 0.07;
    anchor.copy(baseAnchor);
    photo.copy(basePhoto);

    if (groupRef.current) {
      groupRef.current.visible = opacity > 0.015;
      groupRef.current.position.copy(photo);
      groupRef.current.lookAt(camera.position.x, groupRef.current.position.y, camera.position.z);
      groupRef.current.scale.setScalar((0.92 + focus * 0.34) * (0.86 + stage * 0.14));
      groupRef.current.renderOrder = 30 + Math.round(focus * 10);
      groupRef.current.traverse((child) => {
        child.renderOrder = 30 + Math.round(focus * 10);
      });
    }

    if (materialRef.current) {
      materialRef.current.opacity = opacity * (0.34 + focus * 0.66);
    }

    if (glowRef.current) {
      glowRef.current.material.opacity = opacity * (0.07 + focus * 0.24);
      glowRef.current.scale.setScalar(1.1 + focus * 0.12);
    }

    if (frameRef.current) {
      frameRef.current.children.forEach((child) => {
        child.material.opacity = opacity * (0.22 + focus * 0.48);
      });
    }

    if (backRef.current) {
      backRef.current.material.opacity = opacity * 0.42;
    }

    if (tetherRef.current) {
      tetherRef.current.visible = opacity > 0.04;
      tetherRef.current.material.opacity = opacity * 0.24;
      const array = tetherRef.current.geometry.attributes.position.array;
      array[0] = anchor.x;
      array[1] = anchor.y;
      array[2] = anchor.z;
      array[3] = photo.x;
      array[4] = photo.y;
      array[5] = photo.z;
      tetherRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <>
      <group
        ref={groupRef}
        visible={false}
      >
        <mesh
          ref={hitRef}
          position={[0, 0, 0.055]}
          raycast={guardedRaycast}
          onPointerDown={(event) => {
            if (!canOpenPhoto()) return;
            event.stopPropagation();
            onOpenPhoto?.(source);
          }}
          onPointerEnter={() => {
            if (!canOpenPhoto()) return;
            document.body.style.cursor = 'zoom-in';
          }}
          onPointerLeave={() => {
            document.body.style.cursor = '';
          }}
        >
          <planeGeometry args={[planeWidth + 0.46, planeHeight + 0.46]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
        </mesh>

        <mesh ref={glowRef} position={[0, 0, -0.045]}>
          <planeGeometry args={[planeWidth + 0.18, planeHeight + 0.18]} />
          <meshBasicMaterial
            color="#f2d99a"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>

        <mesh ref={backRef} position={[0, 0, -0.028]}>
          <planeGeometry args={[planeWidth + 0.16, planeHeight + 0.16]} />
          <meshBasicMaterial
            color="#050614"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh>
          <planeGeometry args={[planeWidth, planeHeight]} />
          <meshBasicMaterial
            ref={materialRef}
            map={texture}
            color={texture ? '#ffffff' : '#22304b'}
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        <group ref={frameRef} position={[0, 0, 0.018]}>
          <mesh position={[0, planeHeight / 2 + 0.035, 0]}>
            <planeGeometry args={[planeWidth + 0.12, 0.035]} />
            <meshBasicMaterial color="#fff0c3" transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} />
          </mesh>
          <mesh position={[0, -planeHeight / 2 - 0.035, 0]}>
            <planeGeometry args={[planeWidth + 0.12, 0.035]} />
            <meshBasicMaterial color="#fff0c3" transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} />
          </mesh>
          <mesh position={[-planeWidth / 2 - 0.035, 0, 0]}>
            <planeGeometry args={[0.035, planeHeight + 0.12]} />
            <meshBasicMaterial color="#fff0c3" transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} />
          </mesh>
          <mesh position={[planeWidth / 2 + 0.035, 0, 0]}>
            <planeGeometry args={[0.035, planeHeight + 0.12]} />
            <meshBasicMaterial color="#fff0c3" transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} />
          </mesh>
        </group>
      </group>

      <line ref={tetherRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array(6), 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#dcecff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </line>
    </>
  );
}

export function HelixPhotos({ scrollRef, onOpenPhoto }) {
  return (
    <>
      {imageSources.map((source, index) => (
        <PhotoCard
          key={source.path}
          source={source}
          index={index}
          total={imageSources.length}
          scrollRef={scrollRef}
          onOpenPhoto={onOpenPhoto}
        />
      ))}
    </>
  );
}
