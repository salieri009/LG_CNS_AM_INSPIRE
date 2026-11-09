import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PartState } from './partState';
import type { DoorPartDef } from './doorPartDefs';

const RED = new THREE.Color('#ff453a'), BLUE = new THREE.Color('#3d8bff'), GREY = new THREE.Color('#6a6a6a');
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

/** 상태에 따라 색·투명도·빠지는 위치를 부드럽게 바꾸는 부품 묶음 */
export function AnimatedPart({ def, state, onSelect }: { def: DoorPartDef; state: PartState; onSelect?: (key: string) => void }) {
  const ref = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const off = useMemo(() => new THREE.Vector3(...def.offset), [def.offset]);
  useFrame(({ clock }) => {
    const g = ref.current; if (!g) return;
    const removed = state === 'removed';
    progress.current += ((removed ? 1 : 0) - progress.current) * 0.07;
    g.position.copy(off).multiplyScalar(easeOut(progress.current));
    const pulse = (Math.sin(clock.elapsedTime * 3.6) + 1) / 2;
    g.traverse(o => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!m || !('emissive' in m)) return;
      m.userData.base ??= { color: m.color.clone(), opacity: m.opacity };
      const base = m.userData.base as { color: THREE.Color; opacity: number };
      m.color.copy(base.color); m.emissive.setRGB(0, 0, 0); m.emissiveIntensity = 0;
      m.opacity = base.opacity;
      // 아직 손대지 않은 부품은 X-ray처럼 비쳐 보이게 해서 지금 단계 부품이 묻히지 않게 한다
      if (state === 'pending') { m.opacity = base.opacity * 0.38; m.depthWrite = false; } else m.depthWrite = true;
      if (removed) { m.color.lerp(GREY, 0.6); m.opacity = base.opacity * 0.09; }
      if (state === 'current') { m.color.lerp(RED, 0.5); m.emissive.copy(RED); m.emissiveIntensity = 0.35 + 0.65 * pulse; }
      if (state === 'target' || state === 'target-current') { m.color.lerp(BLUE, 0.45); m.emissive.copy(BLUE); m.emissiveIntensity = state === 'target-current' ? 0.35 + 0.65 * pulse : 0.35; }
    });
  });
  return <group ref={ref} onClick={e => { e.stopPropagation(); onSelect?.(def.key); }}>{def.node}</group>;
}
