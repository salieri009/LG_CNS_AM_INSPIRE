import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import type { PartBox } from '../api/types';
import { PartShapeNode } from './shapes';

/** 공장 화면 난이도 색: 한 가지 색의 밝기로만 정도를 나타낸다 (어두움 = 덜 어려움, 밝음 = 더 어려움) */
export const HEAT = new THREE.Color('#ff7a45');
export interface HeatItem { box: PartBox; level: number }

/** 난이도(0~1)에 따라 부품 모양을 같은 색의 다른 밝기로 칠한다 */
export function HeatPart({ item, onSelect }: { item: HeatItem; onSelect?: (key: string) => void }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse(o => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!m || !('emissive' in m)) return;
      m.color.set('#3a3a3a').lerp(HEAT, 0.35 + 0.65 * item.level);
      m.emissive.copy(HEAT); m.emissiveIntensity = 0.15 + 0.7 * item.level; m.opacity = 0.95;
    });
  }, [item.level]);
  return <group ref={ref} onClick={e => { e.stopPropagation(); onSelect?.(item.box.key); }}><PartShapeNode b={item.box} /></group>;
}
