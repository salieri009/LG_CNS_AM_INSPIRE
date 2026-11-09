import { useMemo, type ReactNode } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { PartBox } from '../api/types';
import { shapeOf } from './partShape';

// 부품 종류마다 실제와 닮은 모양을 만든다. 모두 상자 중심(0,0,0) 기준이고 크기는 데이터의 상자 크기를 따른다.
const BODY = '#9aa0a8', METAL = '#c4c8cf', DARK = '#5d636b';
type V3 = [number, number, number];
const mat = (color: string, metal = 0.2) => <meshStandardMaterial color={color} transparent roughness={0.5} metalness={metal} />;

const Rounded = ({ s, p = [0, 0, 0], r, color = BODY }: { s: V3; p?: V3; r: number; color?: string }) =>
  <RoundedBox args={s} position={p} radius={Math.min(r, ...s.map(x => x / 2 - 0.0005))} smoothness={3}>{mat(color)}</RoundedBox>;
const Rod = ({ r, h, p, axis, color = METAL, seg = 20 }: { r: number; h: number; p: V3; axis: 'x' | 'y' | 'z'; color?: string; seg?: number }) =>
  <mesh position={p} rotation={axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
    <cylinderGeometry args={[r, r, h, seg]} />{mat(color, 0.6)}
  </mesh>;

function Harness({ s }: { s: V3 }) {
  const geo = useMemo(() => {
    const long = s[0] >= s[2] ? 0 : 2;
    const pts = Array.from({ length: 6 }, (_, i) => {
      const t = i / 5 - 0.5, w = Math.sin(i * 1.7) * 0.35;
      const v = new THREE.Vector3(); v.setComponent(long, t * s[long]); v.setComponent(long === 0 ? 2 : 0, w * s[long === 0 ? 2 : 0]); v.y = Math.cos(i * 1.3) * 0.3 * s[1];
      return v;
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, Math.min(0.012, Math.min(...s) / 3), 10, false);
  }, [s]);
  return <mesh geometry={geo}>{mat(DARK)}</mesh>;
}

/** 실제 윤곽(차량 좌표 x,y)대로 자른 얇은 판. 문처럼 바퀴 아치를 따라 휘는 판에 쓴다 */
function OutlinePanel({ b }: { b: PartBox }) {
  const geo = useMemo(() => {
    const [cx, cy, , , , sz] = b.box;
    const sh = new THREE.Shape(b.outline!.map(([x, y]) => new THREE.Vector2(x - cx, y - cy)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: sz, bevelEnabled: true, bevelThickness: sz * 0.3, bevelSize: 0.008, bevelSegments: 2, curveSegments: 12 });
    g.translate(0, 0, -sz / 2);
    return g;
  }, [b]);
  return <mesh geometry={geo}>{mat(BODY)}</mesh>;
}

/** 상자 데이터를 모양으로 바꾼다. surface는 차체를 색칠하므로 여기서 그리지 않는다 */
export function PartShapeNode({ b }: { b: PartBox }): ReactNode {
  const [cx, cy, cz, sx, sy, sz] = b.box;
  const s: V3 = [sx, sy, sz];
  const longX = sx >= sz;
  const inner = (() => {
    switch (shapeOf(b)) {
      case 'surface': return null;
      case 'panel': return b.outline ? <OutlinePanel b={b} /> : <Rounded s={s} r={Math.min(sx, sy, sz) / 2} />;
      case 'module': return <Rounded s={s} r={Math.min(sx, sy, sz) * 0.2} />;
      case 'tub': { // 위가 열린 수납함
        const t = 0.012;
        return <>
          <Rounded s={[sx, t, sz]} p={[0, -sy / 2 + t / 2, 0]} r={t / 2} />
          <Rounded s={[t, sy, sz]} p={[-sx / 2 + t / 2, 0, 0]} r={t / 2} /><Rounded s={[t, sy, sz]} p={[sx / 2 - t / 2, 0, 0]} r={t / 2} />
          <Rounded s={[sx, sy, t]} p={[0, 0, -sz / 2 + t / 2]} r={t / 2} /><Rounded s={[sx, sy, t]} p={[0, 0, sz / 2 - t / 2]} r={t / 2} />
        </>;
      }
      case 'battery': { // 몸체 + 위쪽 단자 두 개
        const h = sy * 0.82, tr = Math.min(sx, sz) * 0.08, off = (longX ? sx : sz) * 0.32;
        const at = (k: number): V3 => (longX ? [k * off, sy / 2 - (sy - h) / 2, 0] : [0, sy / 2 - (sy - h) / 2, k * off]);
        return <>
          <Rounded s={[sx, h, sz]} p={[0, -(sy - h) / 2, 0]} r={0.018} color={DARK} />
          <Rod r={tr} h={sy - h} p={at(-1)} axis="y" color="#d96b5f" /><Rod r={tr} h={sy - h} p={at(1)} axis="y" />
        </>;
      }
      case 'connector': { // 하우징 + 핀 + 잠금 탭
        const pins = [-1, 0, 1];
        return <>
          <Rounded s={[sx * 0.7, sy * 0.8, sz]} p={[-sx * 0.15, 0, 0]} r={Math.min(sx, sy, sz) * 0.15} color={DARK} />
          {pins.map(k => <Rod key={k} r={Math.min(sy, sz) * 0.07} h={sx * 0.3} p={[sx * 0.35, 0, k * sz * 0.25]} axis="x" />)}
          <Rounded s={[sx * 0.3, sy * 0.2, sz * 0.5]} p={[-sx * 0.15, sy * 0.45, 0]} r={0.002} color="#7ee0a1" />
        </>;
      }
      case 'bolts': { // 육각 볼트 세 개. 세로로 긴 자리(도어 끝면)면 위아래로 박힌다
        if (sy >= sx && sy >= sz) {
          const r = Math.min(sz, 0.02) * 0.45;
          return <>{[-1, 0, 1].map(k => <Rod key={k} r={r} h={sx} p={[0, k * sy * 0.35, 0]} axis="x" seg={6} />)}</>;
        }
        const along = longX ? sx : sz, r = Math.min(sx, sz) * 0.3;
        return <>{[-1, 0, 1].map(k => <Rod key={k} r={r} h={sy} p={longX ? [k * along * 0.35, 0, 0] : [0, 0, k * along * 0.35]} axis="y" seg={6} />)}</>;
      }
      case 'regulator': { // 윈도 레귤레이터: 세로 레일 두 개 + 비스듬한 케이블 + 모터
        const rr = Math.min(0.008, sz / 3);
        return <>
          <Rod r={rr} h={sy} p={[-sx * 0.38, 0, 0]} axis="y" /><Rod r={rr} h={sy * 0.9} p={[sx * 0.38, 0, 0]} axis="y" />
          <mesh rotation={[0, 0, Math.atan2(sy * 0.8, sx * 0.76)]}><cylinderGeometry args={[rr * 0.5, rr * 0.5, Math.hypot(sx * 0.76, sy * 0.8), 8]} />{mat(DARK)}</mesh>
          <Rod r={Math.min(sx, sy) * 0.07} h={sz} p={[0, -sy * 0.36, 0]} axis="z" color={DARK} seg={24} />
        </>;
      }
      case 'latch': { // 래치: 둥근 몸체 + 반원 고리(스트라이커가 걸리는 곳) + 레버
        const r = Math.min(sy, sz) * 0.32;
        return <>
          <Rounded s={[sx * 0.7, sy, sz]} p={[sx * 0.15, 0, 0]} r={Math.min(sx, sy, sz) * 0.25} color={DARK} />
          <mesh position={[-sx * 0.25, sy * 0.1, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[r, r * 0.28, 10, 24, Math.PI * 1.2]} />{mat(METAL, 0.7)}</mesh>
          <Rounded s={[sx * 0.15, sy * 0.45, sz * 0.25]} p={[sx * 0.4, -sy * 0.35, 0]} r={0.004} />
        </>;
      }
      case 'clip': // 호스 클립 고리
        return <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[Math.min(sx, sz) * 0.38, Math.min(sx, sz) * 0.1, 10, 28]} />{mat(METAL, 0.7)}</mesh>;
      case 'drum': { // 모터·감속기: 차축 방향(z) 원통 + 플랜지
        const r = Math.min(sx, sy) / 2;
        return <>
          <Rod r={r} h={sz * 0.8} p={[0, 0, 0]} axis="z" color={DARK} seg={32} />
          <Rod r={r * 1.08} h={sz * 0.08} p={[0, 0, sz * 0.44]} axis="z" seg={32} /><Rod r={r * 1.08} h={sz * 0.08} p={[0, 0, -sz * 0.44]} axis="z" seg={32} />
        </>;
      }
      case 'harness': return <Harness s={s} />;
      case 'wiper': { // 좌우로 긴 링키지 막대 + 모터 + 피벗 두 개
        return <>
          <Rod r={sy * 0.12} h={sz * 0.9} p={[0, 0, 0]} axis="z" />
          <Rounded s={[sx * 0.6, sy * 0.8, sz * 0.14]} p={[-sx * 0.1, -sy * 0.1, sz * 0.1]} r={0.01} color={DARK} />
          <Rod r={sy * 0.2} h={sy} p={[0, 0, -sz * 0.38]} axis="y" /><Rod r={sy * 0.2} h={sy} p={[0, 0, sz * 0.22]} axis="y" />
        </>;
      }
    }
  })();
  return inner && <group position={[cx, cy, cz]}>{inner}</group>;
}
