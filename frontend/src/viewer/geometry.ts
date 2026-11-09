import * as THREE from 'three';
import type { PartBox } from '../api/types';

/** 도어 내부 부품을 설계한 가상 도어 상자 (차 좌표: 앞 +x, 위 +y, 왼쪽 -z). min.z가 바깥 철판 */
export const DOOR_LOCAL_BOX = { min: [-1.0, 0.36, -0.925] as const, size: [0.95, 0.94] as const };

type Axis = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';
export interface FitOptions {
  length: number;
  /** 바퀴 허브 노드 이름이 있는 모델 */
  hubs?: { frontLeft: string; rearLeft: string; frontRight: string };
  /** 부품 이름이 없는 모델은 원본의 앞·왼쪽 축을 직접 준다 (위는 +y로 본다) */
  axes?: { forward: Axis; left: Axis };
}
const axisVec = (a: Axis) => new THREE.Vector3(...(['x', 'y', 'z'].map(k => (a[1] === k ? (a[0] === '+' ? 1 : -1) : 0)) as [number, number, number]));

const center = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());

/**
 * 모델 원본 축과 크기가 제각각이라, 바퀴 허브 세 개로 앞·왼쪽 방향을 구해
 * 앞 +x, 왼쪽 -z, 바닥 y=0, 실제 전장으로 맞춘 그룹을 돌려준다.
 */
export function fitVehicle(root: THREE.Object3D, { length, hubs, axes }: FitOptions): THREE.Group {
  const wrap = new THREE.Group();
  wrap.add(root);
  wrap.updateMatrixWorld(true);
  const find = (n: string) => {
    const o = root.getObjectByName(n);
    if (!o) throw new Error(`모델에 ${n} 부품이 없습니다`);
    return center(o);
  };
  let fwd: THREE.Vector3, leftRaw: THREE.Vector3;
  if (hubs) {
    const lf = find(hubs.frontLeft), lb = find(hubs.rearLeft), rf = find(hubs.frontRight);
    fwd = lf.clone().sub(lb).normalize();
    leftRaw = lf.clone().sub(rf).normalize();
  } else if (axes) {
    fwd = axisVec(axes.forward); leftRaw = axisVec(axes.left);
  } else throw new Error('fitVehicle에는 hubs나 axes가 필요합니다');
  const up = new THREE.Vector3().crossVectors(fwd, leftRaw).normalize();
  const left = new THREE.Vector3().crossVectors(up, fwd).normalize();
  const basis = new THREE.Matrix4().makeBasis(fwd, up, left.negate()).invert();
  wrap.quaternion.setFromRotationMatrix(basis);
  wrap.updateMatrixWorld(true);

  const size = new THREE.Box3().setFromObject(wrap).getSize(new THREE.Vector3());
  wrap.scale.setScalar(length / size.x);
  wrap.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrap);
  const c = box.getCenter(new THREE.Vector3());
  wrap.position.set(-c.x, -box.min.y, -c.z);
  wrap.updateMatrixWorld(true);
  return wrap;
}

/** 가상 도어 상자를 실제 도어 경계 상자에 맞추는 변환 (위치·축척). 두께 방향(z)은 늘리지 않는다 */
export function rigForDoor(door: THREE.Box3): { position: THREE.Vector3; scale: THREE.Vector3 } {
  const [lx, ly, lz] = DOOR_LOCAL_BOX.min;
  const [sx0, sy0] = DOOR_LOCAL_BOX.size;
  const onLeft = (door.min.z + door.max.z) / 2 < 0;
  const scale = new THREE.Vector3((door.max.x - door.min.x) / sx0, (door.max.y - door.min.y) / sy0, onLeft ? 1 : -1);
  const outer = onLeft ? door.min.z : door.max.z;
  const position = new THREE.Vector3(door.min.x - scale.x * lx, door.min.y - scale.y * ly, outer - scale.z * lz);
  return { position, scale };
}

type V3 = [number, number, number];
/**
 * 실제 도어 경계 상자(차량 좌표) 안에 리어 도어 부품을 배치한다.
 * 트림·글라스는 실제 도어 면을 칠하고(surface), 안쪽 부품은 도어 두께 안에만 둔다. 래치는 도어 뒤쪽 끝.
 */
export function doorParts(door: { min: V3; max: V3 }): PartBox[] {
  const [x0, y0, z0] = door.min, [x1, y1, z1] = door.max;
  const W = x1 - x0, H = y1 - y0, D = z1 - z0;
  const onLeft = (z0 + z1) / 2 < 0;
  const outer = onLeft ? z0 : z1, s = onLeft ? 1 : -1; // s: 실내 쪽 방향
  const zAt = (f: number) => outer + s * f * D;
  const b = (key: string, name: string, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, offset: V3, shape: PartBox['shape']): PartBox =>
    ({ key, name, box: [cx, cy, cz, sx, sy, sz], offset, shape });
  return [
    b('trim', '도어 트림 패널', x0 + W / 2, y0 + H * 0.3, zAt(0.75), W, H * 0.6, D * 0.5, [0, 0, 0], 'surface'),
    b('glass', '도어 글라스', x0 + W / 2, y0 + H * 0.78, (z0 + z1) / 2, W, H * 0.44, D, [0, 0, 0], 'surface'),
    b('regulator', '윈도 레귤레이터', x0 + W * 0.52, y0 + H * 0.36, zAt(0.45), W * 0.36, H * 0.44, Math.min(0.05, D * 0.3), [0, -0.15, s * 0.45], 'regulator'),
    b('latchConn', '래치 커넥터', x0 + W * 0.15, y0 + H * 0.4, zAt(0.5), Math.min(0.06, W * 0.08), 0.04, Math.min(0.04, D * 0.25), [0, 0, s * 0.3], 'connector'),
    b('latchBolts', '래치 볼트', x0 + 0.012, y0 + H * 0.46, zAt(0.5), 0.02, Math.min(0.1, H * 0.12), Math.min(0.04, D * 0.25), [-0.25, 0, 0], 'bolts'),
    b('latch', '리어 도어 래치', x0 + W * 0.06, y0 + H * 0.46, zAt(0.5), Math.min(0.08, W * 0.1), Math.min(0.12, H * 0.15), Math.min(0.06, D * 0.4), [-0.3, 0, s * 0.3], 'latch'),
  ];
}
