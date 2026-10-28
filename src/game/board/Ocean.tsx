import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, ShaderMaterial } from 'three';
import { ARM_HALF_WIDTH, BASE_ISLAND_SIZE, HEIGHTS, ISLAND_HALF_EXTENT } from './boardCoordinates';
import { PALETTE } from '../palette';

const vertex = /* glsl */ `
  varying vec2 vP;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vP = w.xz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uFoam;
  varying vec2 vP;

  float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }
  float islandDist(vec2 p) {
    float d = sdBox(p, vec2(${ISLAND_HALF_EXTENT.toFixed(2)}, ${ARM_HALF_WIDTH.toFixed(2)}));
    d = min(d, sdBox(p, vec2(${ARM_HALF_WIDTH.toFixed(2)}, ${ISLAND_HALF_EXTENT.toFixed(2)})));
    vec2 q = abs(p) - vec2(4.5);
    return min(d, sdBox(q, vec2(${(BASE_ISLAND_SIZE / 2).toFixed(2)})));
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    vec2 p = vP;
    float d = islandDist(p);
    float far = smoothstep(2.0, 30.0, length(p));
    vec3 col = mix(uShallow, uDeep, far);
    float near = 1.0 - smoothstep(0.0, 2.4, d);
    col = mix(col, uShallow * 1.12, near * 0.5);

    float n = noise(p * 0.35 + vec2(uTime * 0.04, -uTime * 0.03));
    float w = sin((p.x * 0.9 + p.y * 0.5) * 1.3 + uTime * 0.5 + n * 6.0);
    col += smoothstep(0.972, 1.0, w) * 0.035 * (1.0 - near * 0.7);

    float fn = noise(p * 3.0 + uTime * 0.18);
    float edge = d - 0.13 - sin(uTime * 0.7 + fn * 6.28) * 0.035;
    float foam = (1.0 - smoothstep(0.0, 0.12, abs(edge))) * (0.55 + 0.45 * fn);
    col = mix(col, uFoam, foam * 0.85);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Permukaan laut toska. Gerak halus lewat shader; membeku bila reduced-motion. */
export function Ocean({ animate }: { animate: boolean }) {
  const ref = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uShallow: { value: new Color(PALETTE.oceanShallow) },
      uDeep: { value: new Color(PALETTE.oceanDeep) },
      uFoam: { value: new Color(PALETTE.foam) },
    }),
    [],
  );
  useFrame((_, dt) => {
    if (animate && ref.current) {
      const u = ref.current.uniforms['uTime'];
      if (u) u.value += Math.min(dt, 0.1);
    }
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, HEIGHTS.water, 0]} receiveShadow={false}>
      <planeGeometry args={[140, 140]} />
      <shaderMaterial ref={ref} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} />
    </mesh>
  );
}
