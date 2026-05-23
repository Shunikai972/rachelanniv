import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { imageSources } from '../utils/imageSources.js';
import { clamp, createHelixLineSegments, helixPointAt, lerp, smoothstep } from './generators.js';

function memoryFramePointAt(t, radius = 5.15, height = 15.5) {
  const y = lerp(-height / 2, height / 2, t);
  const angle = y * 1.6 + Math.PI;
  return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
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
    const visible = smoothstep(0.67, 0.76, scroll) * (1 - smoothstep(0.88, 0.96, scroll));
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
  const basePhoto = useMemo(() => memoryFramePointAt(t, 5.05 + (index % 3) * 0.22, 15.5), [index, t]);
  const anchor = useMemo(() => new THREE.Vector3(), []);
  const photo = useMemo(() => new THREE.Vector3(), []);

  const mobile = typeof window !== 'undefined' && window.innerWidth < 720;
  const planeHeight = mobile ? 1.55 : 2.05;
  const planeWidth = clamp(aspect, 0.7, 1.65) * planeHeight;

  const canOpenPhoto = useCallback(
    () => interactiveRef.current && scrollRef.current >= 0.66 && scrollRef.current <= 0.9,
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
    const stage = smoothstep(0.66, 0.74, scroll) * (1 - smoothstep(0.89, 0.96, scroll));
    const route = clamp((scroll - 0.69) / 0.2);
    const distance = Math.abs((1 - t) - route);
    const near = Math.pow(1 - clamp(distance / 0.095), 2);
    const focus = 1 - clamp(distance / 0.045);
    const opacity = stage * near;
    interactiveRef.current = opacity > 0.12;
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
          <planeGeometry args={[planeWidth + 0.2, planeHeight + 0.2]} />
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
