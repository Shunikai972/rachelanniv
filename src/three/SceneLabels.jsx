import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { smoothstep } from './generators.js';

const sphereLabels = [
  { text: 'Une lumière dans nos vies', position: [-4.9, 2.8, 0.8] },
  { text: 'Une présence qui rassure', position: [4.8, 1.9, -0.4] },
  { text: 'Un cœur immense', position: [-4.5, -1.6, 1.4] },
  { text: "Toujours là pour ceux qu'elle aime", position: [4.4, -2.6, 0.6] },
  { text: 'Une maman précieuse', position: [0.5, 4.25, -0.8] },
  { text: 'Notre étoile la plus brillante', position: [-0.4, -4.25, 0.6] },
];

export function SphereLabels({ scrollRef }) {
  const refs = useRef([]);

  useFrame(() => {
    const scroll = scrollRef.current;
    const visible = smoothstep(0.18, 0.25, scroll) * (1 - smoothstep(0.38, 0.48, scroll));

    refs.current.forEach((node, index) => {
      if (!node) return;
      const delay = index * 0.06;
      const labelVisible = visible * smoothstep(delay, delay + 0.22, visible);
      node.style.opacity = `${labelVisible}`;
      node.style.transform = `translate3d(-50%, -50%, 0) scale(${0.92 + labelVisible * 0.08})`;
    });
  });

  return (
    <>
      {sphereLabels.map((label, index) => (
        <Html key={label.text} position={label.position} center distanceFactor={8} zIndexRange={[12, 0]}>
          <div ref={(node) => (refs.current[index] = node)} className="cosmic-label">
            {label.text}
          </div>
        </Html>
      ))}
    </>
  );
}

export function SelectionCallout({ selected }) {
  if (!selected?.position) return null;

  return (
    <Html position={selected.position} center distanceFactor={7} zIndexRange={[20, 0]}>
      <div className="point-callout">{selected.message}</div>
    </Html>
  );
}
