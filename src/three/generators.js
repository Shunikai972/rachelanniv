import * as THREE from 'three';

export const FINAL_MESSAGE = "On t'aime maman";

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function easeInOutCubic(value) {
  const t = clamp(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function seededRandom(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function chooseParticleCount() {
  if (typeof window === 'undefined') return 4200;

  const cores = navigator.hardwareConcurrency || 4;
  const narrow = window.innerWidth < 720;
  const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 4;

  if (narrow || cores <= 4 || lowMemory) return 2800;
  if (window.innerWidth < 1200 || cores <= 6) return 4400;
  return 6600;
}

export function createGalaxyLayout(count) {
  const random = seededRandom(11);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const arms = 2;

  for (let i = 0; i < count; i += 1) {
    const radius = 0.22 + Math.pow(random(), 1.85) * 9.9;
    const arm = i % arms;
    const armAngle = (arm / arms) * Math.PI * 2;
    const spin = radius * 0.82;
    const scatter = (random() - 0.5) * (0.2 + radius * 0.09);
    const angle = armAngle + spin + scatter;
    const core = Math.pow(1 - radius / 10.1, 2);
    const dust = Math.pow(random(), 3) * (random() > 0.5 ? 1 : -1);

    positions[i * 3] = Math.cos(angle) * radius + dust * (0.12 + radius * 0.05);
    positions[i * 3 + 1] = Math.sin(angle) * radius * 0.42 + (random() - 0.5) * (0.12 + core * 0.42);
    positions[i * 3 + 2] = (random() - 0.5) * (0.18 + core * 1.15 + radius * 0.025);
    seeds[i] = random();
  }

  return { positions, seeds };
}

export function createSphereLayout(count) {
  const random = seededRandom(23);
  const positions = new Float32Array(count * 3);
  const layers = new Uint8Array(count);
  const outerCount = Math.floor(count * 0.62);
  const innerCount = Math.floor(count * 0.2);

  for (let i = 0; i < count; i += 1) {
    const offset = i * 3;

    if (i < outerCount) {
      const y = 1 - (i / Math.max(1, outerCount - 1)) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = i * GOLDEN_ANGLE;
      const shell = 4.3 + (random() - 0.5) * 0.26;
      positions[offset] = Math.cos(theta) * radius * shell;
      positions[offset + 1] = y * shell;
      positions[offset + 2] = Math.sin(theta) * radius * shell;
      layers[i] = 0;
      continue;
    }

    if (i < outerCount + innerCount) {
      const local = i - outerCount;
      const y = 1 - (local / Math.max(1, innerCount - 1)) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = local * GOLDEN_ANGLE;
      const shell = 2.08 + (random() - 0.5) * 0.14;
      positions[offset] = Math.cos(theta) * radius * shell;
      positions[offset + 1] = y * shell;
      positions[offset + 2] = Math.sin(theta) * radius * shell;
      layers[i] = 1;
      continue;
    }

    const local = i - outerCount - innerCount;
    const ring = local % 3;
    const angle = (local / Math.max(1, count - outerCount - innerCount)) * Math.PI * 34;
    const ringRadius = 1.05 + ring * 0.35 + (random() - 0.5) * 0.04;
    const wobble = Math.sin(angle * 3.0 + ring) * 0.06;

    if (ring === 0) {
      positions[offset] = Math.cos(angle) * ringRadius;
      positions[offset + 1] = Math.sin(angle) * ringRadius;
      positions[offset + 2] = wobble;
    } else if (ring === 1) {
      positions[offset] = Math.cos(angle) * ringRadius;
      positions[offset + 1] = wobble;
      positions[offset + 2] = Math.sin(angle) * ringRadius;
    } else {
      positions[offset] = wobble;
      positions[offset + 1] = Math.cos(angle) * ringRadius;
      positions[offset + 2] = Math.sin(angle) * ringRadius;
    }
    layers[i] = 2 + ring;
  }

  return { positions, layers };
}

export function createWaveLayout(count) {
  const random = seededRandom(37);
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const cols = Math.ceil(Math.sqrt(count * 1.28));
  const rows = Math.ceil(count / cols);
  const spacingX = 0.22;
  const spacingZ = 0.22;
  const width = cols * spacingX;
  const depth = rows * spacingZ;

  for (let i = 0; i < count; i += 1) {
    const column = i % cols;
    const row = Math.floor(i / cols);
    const x = column * spacingX - width / 2 + (random() - 0.5) * 0.08;
    const z = row * spacingZ - depth / 2 + (random() - 0.5) * 0.08;
    const phase = random() * Math.PI * 2;

    positions[i * 3] = x;
    positions[i * 3 + 1] = Math.sin(x * 0.8 + z * 0.7 + phase) * 0.5;
    positions[i * 3 + 2] = z;
    phases[i] = phase;
  }

  return { positions, phases };
}

export function helixPointAt(t, radius = 2.15, height = 15, phase = 0) {
  const turns = 8.5;
  const angle = t * Math.PI * 2 * turns + phase;
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    lerp(-height / 2, height / 2, t),
    Math.sin(angle) * radius,
  );
}

export function createHelixLayout(count) {
  const random = seededRandom(51);
  const positions = new Float32Array(count * 3);
  const strand = new Uint8Array(count);

  for (let i = 0; i < count; i += 1) {
    const t = i / Math.max(1, count - 1);
    const phase = i % 2 === 0 ? 0 : Math.PI;
    const radius = 2.05 + (random() - 0.5) * 0.12;
    const point = helixPointAt(t, radius, 15.5, phase);

    positions[i * 3] = point.x;
    positions[i * 3 + 1] = point.y;
    positions[i * 3 + 2] = point.z;
    strand[i] = i % 2;
  }

  return { positions, strand };
}

export function createFinalTextLayout(count, text = FINAL_MESSAGE) {
  const random = seededRandom(71);
  const positions = new Float32Array(count * 3);
  const textMask = new Uint8Array(count);
  const points = [];
  const canvas = document.createElement('canvas');
  const width = 1300;
  const height = 420;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#ffffff';
  context.lineWidth = 8;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '900 146px Georgia, "Times New Roman", serif';
  context.strokeText(text, width / 2, height / 2 + 5);

  const pixels = context.getImageData(0, 0, width, height).data;
  const step = 5;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha > 60 && random() > 0.04) {
        points.push([x, y, alpha / 255]);
      }
    }
  }

  if (!points.length) {
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      points.push([
        width / 2 + Math.cos(angle) * width * 0.32,
        height / 2 + Math.sin(angle) * height * 0.32,
        1,
      ]);
    }
  }

  for (let i = points.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const point = points[i];
    points[i] = points[j];
    points[j] = point;
  }

  const textCount = Math.floor(count * 0.57);
  for (let i = 0; i < count; i += 1) {
    if (i < textCount) {
      const point = points[i % points.length];
      const jitter = (1 - point[2]) * 0.03;
      positions[i * 3] = ((point[0] - width / 2) / width) * 14.8 + (random() - 0.5) * jitter;
      positions[i * 3 + 1] = -((point[1] - height / 2) / height) * 5.35 + (random() - 0.5) * jitter;
      positions[i * 3 + 2] = (random() - 0.5) * 0.18;
      textMask[i] = 1;
    } else {
      const angle = random() * Math.PI * 2;
      const radius = 5.8 + random() * 3.8;
      const vertical = (random() < 0.5 ? -1 : 1) * (1.45 + random() * 3.2);
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = vertical;
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.28 + (random() - 0.5) * 1.1;
    }
  }

  return { positions, textMask };
}

export function getIntroStarPosition(progress, out = new THREE.Vector3()) {
  const t = clamp(progress);
  const u = 1 - t;
  const p0 = new THREE.Vector3(18, 8.5, 13);
  const p1 = new THREE.Vector3(8, -4.2, 8);
  const p2 = new THREE.Vector3(-9.5, 4.4, 1.6);
  const p3 = new THREE.Vector3(0.05, 0.02, 0.05);
  out
    .copy(p0)
    .multiplyScalar(u * u * u)
    .addScaledVector(p1, 3 * u * u * t)
    .addScaledVector(p2, 3 * u * t * t)
    .addScaledVector(p3, t * t * t);

  return out;
}

export function createHelixLineSegments(steps = 170) {
  const positions = [];

  for (let i = 0; i < steps - 1; i += 1) {
    const a = i / (steps - 1);
    const b = (i + 1) / (steps - 1);
    const leftA = helixPointAt(a, 2.15, 15.5, 0);
    const leftB = helixPointAt(b, 2.15, 15.5, 0);
    const rightA = helixPointAt(a, 2.15, 15.5, Math.PI);
    const rightB = helixPointAt(b, 2.15, 15.5, Math.PI);

    positions.push(leftA.x, leftA.y, leftA.z, leftB.x, leftB.y, leftB.z);
    positions.push(rightA.x, rightA.y, rightA.z, rightB.x, rightB.y, rightB.z);

    if (i % 6 === 0) {
      positions.push(leftA.x, leftA.y, leftA.z, rightA.x, rightA.y, rightA.z);
    }
  }

  return new Float32Array(positions);
}
