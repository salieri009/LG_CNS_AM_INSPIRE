import { useMemo } from 'react';
import * as THREE from 'three';

// 도어 내부 부품을 만드는 기본 도형
export function Slab({ pts, depth, z, color, opacity = 1 }: { pts: [number, number][]; depth: number; z: number; color: string; opacity?: number }) {
  const geo = useMemo(() => {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    return new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.006, bevelSegments: 2 });
  }, [pts, depth]);
  return <mesh geometry={geo} position-z={z}><meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.55} /></mesh>;
}
export const Box = ({ s, p, color }: { s: [number, number, number]; p: [number, number, number]; color: string }) =>
  <mesh position={p}><boxGeometry args={s} /><meshStandardMaterial color={color} transparent roughness={0.55} /></mesh>;
export const Cyl = ({ r, h, p, axis, color }: { r: number; h: number; p: [number, number, number]; axis: 'x' | 'y' | 'z'; color: string }) =>
  <mesh position={p} rotation={axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
    <cylinderGeometry args={[r, r, h, 24]} /><meshStandardMaterial color={color} transparent metalness={0.5} roughness={0.35} />
  </mesh>;

